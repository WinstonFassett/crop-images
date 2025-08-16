import { useEffect, useState, useRef, useCallback } from 'react';
import Cropper from 'cropperjs';
import { useCropperStore } from '../store/useCropperStore';
import { useImageStore } from '../store/useImageStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { getScale, updateConstraintsForScale, checkZoomQuality, applyZoomLimit } from '../utils/cropperScaleUtils';
import { debounce } from '../lib/utils';

// Using shared debounce from lib/utils

interface CropDimensions {
  width: number;
  height: number;
}

interface UseCropItemOptions {
  index: number;
  file: File;
}

interface UseCropItemResult {
  imageSrc: string;
  cropperRef: React.RefObject<HTMLImageElement | null>;
  cropFrameDimensions: CropDimensions | null;
  actualCropDimensions: CropDimensions | null;
  outputDimensions: CropDimensions | null;
  imageScale: number;
  qualityWarning?: boolean;
  qualityCritical?: boolean;
  qualityRatio: number;
}

export function useCropItem({ index, file }: UseCropItemOptions): UseCropItemResult {
  // State
  const [imageSrc, setImageSrc] = useState<string>('');
  const [cropFrameDimensions, setCropFrameDimensions] = useState<CropDimensions | null>(null);
  const [actualCropDimensions, setActualCropDimensions] = useState<CropDimensions | null>(null);
  const [outputDimensions, setOutputDimensions] = useState<CropDimensions | null>(null);
  
  // Scale state to trigger UI updates when scale changes
  const [imageScale, setImageScale] = useState<number>(1);
  
  // Quality warning states
  const [qualityWarning, setQualityWarning] = useState<boolean>(false);
  const [qualityCritical, setQualityCritical] = useState<boolean>(false);
  const [qualityRatio, setQualityRatio] = useState<number>(1.0);
  
  // Refs
  const cropperRef = useRef<HTMLImageElement | null>(null);
  const cropperInstanceRef = useRef<Cropper | null>(null);
  const imageScaleRef = useRef<number>(1); // Initialize with neutral scale
  const debounceTimeoutRef = useRef<number>(250); // 250ms debounce
  
  // Get cropper store functions - use individual selectors to avoid unnecessary rerenders
  const setCropperViewInstance = useCropperStore(state => state.setCropperViewInstance);
  const removeCropperViewInstance = useCropperStore(state => state.removeCropperViewInstance);
  const updateCropConfig = useCropperStore(state => state.updateCropConfig);
  const restoreCropConfig = useCropperStore(state => state.restoreCropConfig);
  const getCroppedImage = useCropperStore(state => state.getCroppedImage);
  
  // Debounced version of updateCropConfig
  const debouncedUpdateCropConfig = useCallback(
    debounce((idx: number) => updateCropConfig(idx), debounceTimeoutRef.current),
    [updateCropConfig]
  );
  
  // Load image
  useEffect(() => {
    const loadImage = async () => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setImageSrc(e.target.result as string);
            
            // Get original dimensions
            const img = new Image();
            img.onload = () => {
              // Calculate image scale based on original dimensions vs displayed size
              const originalWidth = img.width;
              const displayWidth = cropperRef.current?.clientWidth || originalWidth;
              const calculatedScale = originalWidth / displayWidth;
              
              // Update both ref and state to ensure UI updates
              imageScaleRef.current = calculatedScale;
              setImageScale(calculatedScale);
            };
            img.src = e.target.result as string;
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error loading image:', error);
      }
    };
    
    loadImage();
  }, [file]);

  // Get original dimensions from store
  const originalDimensions = useImageStore(state => state.originalDimensions?.[index]);

  // Initialize and cleanup cropper
  useEffect(() => {
    if (!cropperRef.current || !imageSrc) return;
    
    // Clean up previous cropper if it exists
    if (cropperInstanceRef.current) {
      try {
        cropperInstanceRef.current.destroy();
        cropperInstanceRef.current = null;
      } catch (err) {
        console.error('Error destroying previous cropper:', err);
      }
    }
    
    try {
      // Get settings for this image directly from the store
      const settings = useSettingsStore.getState().getSettingsForImage(index);
      
      // Calculate aspect ratio directly based on mode
      let aspectRatio;
      if (settings.aspectRatioMode === 'standard') {
        const [width, height] = settings.standardAspectRatio.split(':').map(Number);
        aspectRatio = width / height;
      } else if (settings.aspectRatioMode === 'custom') {
        aspectRatio = settings.customAspectRatio;
      } else {
        aspectRatio = NaN; // Free mode
      }
      
      // Use settings directly without fallbacks
      const minWidth = settings.minWidth;
      const minHeight = settings.minHeight;
      
      // Create cropper instance - this is the reactive initialization
      // The cropper will be created with the current settings from the store
      cropperInstanceRef.current = new Cropper(cropperRef.current, {
        viewMode: 1,
        dragMode: 'move',
        // Use the aspect ratio from the settings store
        aspectRatio,
        autoCropArea: 0.9,
        restore: false,
        guides: true,
        center: true,
        highlight: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: true,
        // Apply min dimensions based on settings and scale
        minCropBoxWidth: minWidth / imageScaleRef.current,
        minCropBoxHeight: minHeight / imageScaleRef.current,
        
        ready: function(this: any) {
          try {
            
            // Store the DOM element with the cropper attached in the store
            setCropperViewInstance(index, cropperRef.current);
            
            // Get current scale - remember this.cropper is the actual Cropper instance
            const currentScale = getScale(this.cropper);
            imageScaleRef.current = currentScale;
            setImageScale(currentScale);
            
            // Get fresh settings from the store
            const currentSettings = useSettingsStore.getState().getSettingsForImage(index);
            const currentAspectRatio = useSettingsStore.getState().getAspectRatio(index);
            
            // Explicitly set the aspect ratio again to ensure it's applied
            this.cropper.setAspectRatio(currentAspectRatio);
            
            // Apply initial constraints based on scale with fresh settings
            try {
              updateConstraintsForScale(this.cropper, {
                minWidth: currentSettings.minWidth,
                maxWidth: currentSettings.maxWidth,
                minHeight: currentSettings.minHeight,
                maxHeight: currentSettings.maxHeight,
                // Use the fresh aspect ratio we just retrieved
                aspectRatio: currentAspectRatio
              });
            } catch (constraintErr) {
              console.error(`💣💣💣 CROPPER ${index}: ERROR APPLYING INITIAL CONSTRAINTS:`, constraintErr);
              throw constraintErr;
            }
            
            // Apply zoom limit to prevent excessive pixelation
            try {
              applyZoomLimit(this.cropper, 1.0);
            } catch (zoomErr) {
              console.error(`💣💣💣 CROPPER ${index}: ERROR APPLYING ZOOM LIMIT:`, zoomErr);
              throw zoomErr;
            }
            
            // Check initial quality
            const qualityCheck = checkZoomQuality(this.cropper);
            setQualityWarning(qualityCheck.isWarning);
            setQualityCritical(qualityCheck.isCritical);
            setQualityRatio(qualityCheck.qualityRatio);
            
            // Use a small delay to ensure the cropper is fully initialized
            // FUCK IS THIS NECESSARY?
            setTimeout(() => {
              try {
                restoreCropConfig(index, this.cropper);
              } catch (err) {
                console.error(`💣💣💣 CROPPER ${index}: ERROR RESTORING CROP CONFIG:`, err);
              }
            }, 50);
          } catch (err) {
            console.error(`Error in ready event:`, err);
          }
        },
        
        zoom: function(this: any) {
          try {
            // Get current scale directly from the cropper
            const currentScale = getScale(this.cropper);
            
            // Force update scale reference and state with a new value
            // Even small decimal changes should trigger a rerender
            imageScaleRef.current = currentScale;
            setImageScale(Number(currentScale.toFixed(6)));
            
            // Get current settings from the store
            const currentSettings = useSettingsStore.getState().getSettingsForImage(index);
            const currentAspectRatio = useSettingsStore.getState().getAspectRatio(index);
            
            // Update constraints based on new scale
            updateConstraintsForScale(this.cropper, {
              minWidth: currentSettings.minWidth,
              maxWidth: currentSettings.maxWidth,
              minHeight: currentSettings.minHeight,
              maxHeight: currentSettings.maxHeight,
              aspectRatio: currentAspectRatio
            });
            
            // Check quality at current crop dimensions with forced updates
            const qualityCheck = checkZoomQuality(this.cropper);
            setQualityWarning(qualityCheck.isWarning);
            setQualityCritical(qualityCheck.isCritical);
            setQualityRatio(Number(qualityCheck.qualityRatio.toFixed(6)));
            
            // Get crop box data with exact coordinates and dimensions
            const cropBoxData = this.cropper.getCropBoxData();
            const cropData = this.cropper.getData();
            
            // Update dimensions display with rounded values to force new references
            const cropFrameDims = {
              width: Math.round(cropBoxData.width * currentScale),
              height: Math.round(cropBoxData.height * currentScale)
            };
            
            setCropFrameDimensions(cropFrameDims);
            
            // Log exact crop bounds for debugging
            // console.log(`ZOOM EVENT: Bounds x=${cropData.x.toFixed(2)}, y=${cropData.y.toFixed(2)}, w=${cropData.width.toFixed(2)}, h=${cropData.height.toFixed(2)}, scale=${currentScale.toFixed(4)}`);
            // console.log(`ZOOM EVENT: Frame w=${cropFrameDims.width}, h=${cropFrameDims.height}`);
            // console.log(`ZOOM EVENT: Box x=${cropBoxData.left.toFixed(2)}, y=${cropBoxData.top.toFixed(2)}, w=${cropBoxData.width.toFixed(2)}, h=${cropBoxData.height.toFixed(2)}`);
            // console.log(`ZOOM EVENT: Quality ratio=${qualityCheck.qualityRatio.toFixed(4)}, warning=${qualityCheck.isWarning}, critical=${qualityCheck.isCritical}`);
            
            // Update crop stats in the store with all relevant data
            useCropperStore.getState().updateCropStats(index, {
              imageScale: currentScale,
              qualityWarning: qualityCheck.isWarning,
              qualityCritical: qualityCheck.isCritical,
              qualityRatio: qualityCheck.qualityRatio,
              cropFrameDimensions: cropFrameDims,
              outputDimensions: null, // Will be set if canvas is available
              timestamp: Date.now()
            });
            
            const canvas = this.cropper.getCroppedCanvas();
            if (canvas) {
              setActualCropDimensions({
                width: canvas.width,
                height: canvas.height
              });
            }
            
            // Update crop stats in the store with all relevant data
            useCropperStore.getState().updateCropStats(index, {
              imageScale: currentScale,
              qualityWarning: qualityCheck.isWarning,
              qualityCritical: qualityCheck.isCritical,
              qualityRatio: qualityCheck.qualityRatio,
              cropFrameDimensions: {
                width: Math.round(cropBoxData.width * currentScale),
                height: Math.round(cropBoxData.height * currentScale)
              },
              outputDimensions: outputDimensions || null,
              timestamp: Date.now()
            });
            
            // Also update crop config to save the state
            useCropperStore.getState().updateCropConfig(index);
          } catch (err) {
            console.error(`Error updating dimensions during zoom:`, err);
          }
        },
        
        crop: function(this: any, event: any) {
          try {
            // Get current scale directly from the cropper
            const currentScale = getScale(this.cropper);
            
            // Force update scale reference and state with a new value
            imageScaleRef.current = currentScale;
            setImageScale(Number(currentScale.toFixed(6)));
            
            // Get current settings from the store
            const currentSettings = useSettingsStore.getState().getSettingsForImage(index);
            const currentAspectRatio = useSettingsStore.getState().getAspectRatio(index);
            
            // Update constraints based on current scale
            updateConstraintsForScale(this.cropper, {
              minWidth: currentSettings.minWidth,
              maxWidth: currentSettings.maxWidth,
              minHeight: currentSettings.minHeight,
              maxHeight: currentSettings.maxHeight,
              aspectRatio: currentAspectRatio
            });
            
            // Check quality at current crop dimensions with forced updates
            const qualityCheck = checkZoomQuality(this.cropper);
            setQualityWarning(qualityCheck.isWarning);
            setQualityCritical(qualityCheck.isCritical);
            setQualityRatio(Number(qualityCheck.qualityRatio.toFixed(6)));
            
            // Get crop box data with exact coordinates and dimensions
            const cropBoxData = this.cropper.getCropBoxData();
            const cropData = this.cropper.getData();
            
            // Update dimensions display with rounded values to force new references
            const cropFrameDims = {
              width: Math.round(cropBoxData.width * currentScale),
              height: Math.round(cropBoxData.height * currentScale)
            };
            
            setCropFrameDimensions(cropFrameDims);
            
            // Log exact crop bounds for debugging
            // console.log(`CROP EVENT: Bounds x=${cropData.x.toFixed(2)}, y=${cropData.y.toFixed(2)}, w=${cropData.width.toFixed(2)}, h=${cropData.height.toFixed(2)}, scale=${currentScale.toFixed(4)}`);
            // console.log(`CROP EVENT: Frame w=${cropFrameDims.width}, h=${cropFrameDims.height}`);
            // console.log(`CROP EVENT: Box x=${cropBoxData.left.toFixed(2)}, y=${cropBoxData.top.toFixed(2)}, w=${cropBoxData.width.toFixed(2)}, h=${cropBoxData.height.toFixed(2)}`);
            // console.log(`CROP EVENT: Quality ratio=${qualityCheck.qualityRatio.toFixed(4)}, warning=${qualityCheck.isWarning}, critical=${qualityCheck.isCritical}`);

            // Update crop stats in the store with all relevant data
            useCropperStore.getState().updateCropStats(index, {
              imageScale: currentScale,
              qualityWarning: qualityCheck.isWarning,
              qualityCritical: qualityCheck.isCritical,
              qualityRatio: qualityCheck.qualityRatio,
              cropFrameDimensions: cropFrameDims,
              outputDimensions: null, // Will be set if canvas is available
              timestamp: Date.now()
            });
            
            const canvas = this.cropper.getCroppedCanvas();
            if (canvas) {
              setActualCropDimensions({
                width: canvas.width,
                height: canvas.height
              });
              
              // Calculate output dimensions based on settings
              const currentSettings = useSettingsStore.getState().getSettingsForImage(index);
              const maxWidth = currentSettings.maxWidth;
              const maxHeight = currentSettings.maxHeight;
              
              if (maxWidth || maxHeight) {
                let outWidth = canvas.width;
                let outHeight = canvas.height;
                
                if (maxWidth && outWidth > maxWidth) {
                  const ratio = maxWidth / outWidth;
                  outWidth = maxWidth;
                  outHeight = Math.round(outHeight * ratio);
                }
                
                if (maxHeight && outHeight > maxHeight) {
                  const ratio = maxHeight / outHeight;
                  outHeight = maxHeight;
                  outWidth = Math.round(outWidth * ratio);
                }
                
                setOutputDimensions({
                  width: outWidth,
                  height: outHeight
                });
              }
            }
            
            // Update crop stats in the store with all relevant data
            useCropperStore.getState().updateCropStats(index, {
              imageScale: currentScale,
              qualityWarning: qualityCheck.isWarning,
              qualityCritical: qualityCheck.isCritical,
              qualityRatio: qualityCheck.qualityRatio,
              cropFrameDimensions: {
                width: Math.round(cropBoxData.width * currentScale),
                height: Math.round(cropBoxData.height * currentScale)
              },
              outputDimensions: outputDimensions || null,
              timestamp: Date.now()
            });
            
            // Also update crop config to save the state
            useCropperStore.getState().updateCropConfig(index);
          } catch (err) {
            console.error(`Error updating dimensions during crop:`, err);
          }
        }
      });
      
      // Don't automatically update crop config or generate crops
      // This was causing eager crop generation for all images
      
      // Don't generate initial crop either - let the result tab handle this
      // when it's actually displayed
    } catch (err) {
      console.error('Error initializing cropper:', err);
    }
    
    // Cleanup function
    return () => {
      if (cropperInstanceRef.current) {
        try {
          // Update the store with the crop config
          updateCropConfig(index);
          
          // Get current settings from the store
          const currentSettings = useSettingsStore.getState().getSettingsForImage(index);
          
          // Generate the crop asynchronously
          getCroppedImage(index, {
            maxWidth: currentSettings.maxWidth,
            maxHeight: currentSettings.maxHeight,
            quality: 0.9
          }).catch((err: Error) => console.error('Error in cleanup:', err));
          
          // Destroy the cropper
          cropperInstanceRef.current.destroy();
          cropperInstanceRef.current = null;
          
          // Remove from store
          removeCropperViewInstance(index);
        } catch (err) {
          console.error(`Error cleaning up cropper:`, err);
        }
      }
    };
  }, 
  // Dependencies for cleanup effect
  [imageSrc, index, setCropperViewInstance, removeCropperViewInstance, 
      restoreCropConfig, updateCropConfig, getCroppedImage, debouncedUpdateCropConfig]);

  useEffect(() => {
    const unsubscribe = useSettingsStore.subscribe((state, prevState) => {
      const cropperViewInstances = useCropperStore.getState().cropperViewInstances;
      if (!cropperViewInstances || !cropperViewInstances[index]) {
        return;
      }
      
      const cropperElement = cropperViewInstances[index];
      if (!cropperElement.cropper) {
        return;
      }
      
      // Get the current settings from the reactive store
      const settings = state.getSettingsForImage(index);
      const aspectRatio = state.getAspectRatio(index);
            
      try {
        // Force aspect ratio update regardless of previous state
        cropperElement.cropper.setAspectRatio(aspectRatio);
      } catch (err) {
        console.error(`💥💥💥 CROPPER ${index}: ERROR UPDATING ASPECT RATIO:`, err);
        throw err;
      }
      
      // Check if any constraint-related settings changed
      const prevSettings = prevState.getSettingsForImage(index);
      const constraintsChanged = (
        settings.minWidth !== prevSettings.minWidth ||
        settings.maxWidth !== prevSettings.maxWidth ||
        settings.minHeight !== prevSettings.minHeight ||
        settings.maxHeight !== prevSettings.maxHeight
      );
      
      // Only update constraints if they actually changed
      if (constraintsChanged) {
        // const currentScale = getScale(cropperElement.cropper);
        try {
          updateConstraintsForScale(cropperElement.cropper, {
            minWidth: settings.minWidth,
            maxWidth: settings.maxWidth,
            minHeight: settings.minHeight,
            maxHeight: settings.maxHeight,
            // Always use the most current aspect ratio
            aspectRatio: aspectRatio
          });
        } catch (err) {
          console.error(`💥💥💥 CROPPER ${index}: ERROR UPDATING CONSTRAINTS:`, err);
          throw err;
        }
      }
    });
    return unsubscribe;
  }, [index]);

  useEffect(() => {
    // Create a custom event that bubbles up to force parent component update
    const event = new CustomEvent('cropstatschange', { 
      bubbles: true,
      detail: { 
        imageIndex: index,
        timestamp: Date.now(),
        imageScale,
        qualityWarning,
        qualityCritical,
        qualityRatio,
        cropFrameDimensions,
        outputDimensions
      } 
    });
    
    // Dispatch the event on the document
    document.dispatchEvent(event);
    // console.log('Dispatched cropstatschange event:', {
    //   imageIndex: index,
    //   imageScale,
    //   qualityRatio,
    //   timestamp: Date.now()
    // });
  }, [index, imageScale, qualityWarning, qualityCritical, qualityRatio, cropFrameDimensions, outputDimensions]);

  return {
    cropperRef,
    imageSrc,
    imageScale,
    cropFrameDimensions,
    actualCropDimensions,
    outputDimensions,
    qualityWarning,
    qualityCritical,
    qualityRatio
  };
}
