import { useState, useEffect, useRef } from 'react';
import { useCropperStore } from '../store/useCropperStore';
import { useTaskStore } from '../store/useTaskStore';
import { useImageStore } from '../store/useImageStore';

interface ImageDimensions {
  width: number;
  height: number;
}

interface UseCroppedImageResult {
  croppedImage: string | null;
  originalDimensions: ImageDimensions | null;
  croppedDimensions: ImageDimensions | null;
  isLoading: boolean;
  generateCrop: () => void;
}

/**
 * A reactive hook that provides the cropped image and related information
 * for a specific image index.
 */
export function useCroppedImage(
  index: number
): UseCroppedImageResult {
  // Get data directly from stores using hooks
  const cropResult = useCropperStore(state => state.cropResults[index]);
  const currentTaskId = useCropperStore(state => state.currentTaskId);
  const task = useTaskStore(state => currentTaskId ? state.tasks[currentTaskId] : null);
  const originalDimensions = useImageStore(state => state.originalDimensions[index]);
  
  // Local state for derived values
  const [croppedDimensions, setCroppedDimensions] = useState<ImageDimensions | null>(null);
  
  // Use a ref to track if we're currently requesting to avoid loops
  const isRequestingRef = useRef(false);
  
  // Determine if we're loading - include the requesting state in loading indicator
  const isLoading = (task?.status === 'in_progress' && !cropResult) || isRequestingRef.current;
  
  const generateCrop = () => {
    if (isRequestingRef.current) return;
    isRequestingRef.current = true;
    const { getCroppedImage } = useCropperStore.getState();
    getCroppedImage(index)
      // .then(result => {
      //   console.log(`useCroppedImage(${index}): Crop generation result:`, result ? 'success' : 'failed');
      // })
      // .catch(err => {
      //   console.error(`useCroppedImage(${index}): Error generating crop:`, err);
      // })
      .finally(() => {
        isRequestingRef.current = false;
      });
  };
  
  // Only generate crop result when explicitly requested
  // No automatic generation to avoid eager rendering

  // Update dimensions when crop result changes
  useEffect(() => {
    if (cropResult?.url) {
      // Load the image to get its dimensions
      const img = new Image();
      img.onload = () => {
        setCroppedDimensions({
          width: img.width,
          height: img.height
        });
      };
      img.src = cropResult.url;
    } else {
      setCroppedDimensions(null);
    }
  }, [cropResult]);
  
  return {
    croppedImage: cropResult?.url || null,
    originalDimensions,
    croppedDimensions,
    isLoading,
    generateCrop
  };
}
