/**
 * Utility functions for handling scale and dimensions in Cropper.js
 */

/**
 * Gets the current scale from a Cropper instance
 * Scale = ratio of original image size to displayed image size
 */
export const getScale = (cropperInstance: any): number => {
  if (!cropperInstance) return 1;
  
  try {
    const imageData = cropperInstance.getImageData();
    return imageData.naturalWidth / imageData.width;
  } catch (err) {
    console.error('Error getting scale:', err);
    return 1; // Default to 1:1 if there's an error
  }
};

/**
 * Convert from original image dimensions to display dimensions
 */
export const originalToDisplay = (dimension: number, scale: number): number => {
  return dimension / scale;
};

/**
 * Convert from display dimensions to original image dimensions
 */
export const displayToOriginal = (dimension: number, scale: number): number => {
  return dimension * scale;
};

/**
 * Update cropper constraints based on scale
 */
export const updateConstraintsForScale = (
  cropperInstance: any, 
  originalConstraints: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    aspectRatio?: string | number;
  }
): void => {
  if (!cropperInstance) return;
  
  try {
    const scale = getScale(cropperInstance);
    
    // Convert constraints from original image space to display space
    const options: any = {};
    
    if (originalConstraints.minWidth) {
      options.minCropBoxWidth = originalToDisplay(originalConstraints.minWidth, scale);
    }
    
    if (originalConstraints.maxWidth) {
      options.maxCropBoxWidth = originalToDisplay(originalConstraints.maxWidth, scale);
    }
    
    if (originalConstraints.minHeight) {
      options.minCropBoxHeight = originalToDisplay(originalConstraints.minHeight, scale);
    }
    
    if (originalConstraints.maxHeight) {
      options.maxCropBoxHeight = originalToDisplay(originalConstraints.maxHeight, scale);
    }
    
    // Aspect ratio doesn't need scale conversion
    if (originalConstraints.aspectRatio) {
      options.aspectRatio = originalConstraints.aspectRatio;
    }
    
    // Store the current crop box data
    const cropBoxData = cropperInstance.getCropBoxData();
    
    // Instead of using setOptions which doesn't exist, directly modify the options
    if (options.minCropBoxWidth !== undefined) {
      cropperInstance.options.minCropBoxWidth = options.minCropBoxWidth;
    }
    
    if (options.maxCropBoxWidth !== undefined) {
      cropperInstance.options.maxCropBoxWidth = options.maxCropBoxWidth;
    }
    
    if (options.minCropBoxHeight !== undefined) {
      cropperInstance.options.minCropBoxHeight = options.minCropBoxHeight;
    }
    
    if (options.maxCropBoxHeight !== undefined) {
      cropperInstance.options.maxCropBoxHeight = options.maxCropBoxHeight;
    }
    
    if (options.aspectRatio !== undefined) {
      cropperInstance.options.aspectRatio = options.aspectRatio;
    }
  } catch (err) {
    console.error('Error updating constraints:', err);
  }
};

/**
 * Calculate maximum allowed zoom based on desired minimum pixel density
 */
export const calculateMaxZoom = (cropperInstance: any, minPixelDensity = 1): number => {
  if (!cropperInstance) return 1;
  
  try {
    const imageData = cropperInstance.getImageData();
    const naturalWidth = imageData.naturalWidth;
    const displayWidth = imageData.width;
    
    // Current scale
    const currentScale = naturalWidth / displayWidth;
    
    // Maximum scale = current scale * max zoom factor
    return currentScale * minPixelDensity;
  } catch (err) {
    console.error('Error calculating max zoom:', err);
    return 1;
  }
};

/**
 * Check if current zoom level might lead to pixelation
 */
export const checkZoomQuality = (cropperInstance: any, warningThreshold = 0.8): {
  qualityRatio: number;
  isWarning: boolean;
  isCritical: boolean;
} => {
  if (!cropperInstance) {
    return { qualityRatio: 1, isWarning: false, isCritical: false };
  }
  
  try {
    const imageData = cropperInstance.getImageData();
    const scale = imageData.naturalWidth / imageData.width;
    const cropBoxData = cropperInstance.getCropBoxData();
    
    // Calculate output pixel dimensions
    const outputWidth = cropBoxData.width * scale;
    const outputHeight = cropBoxData.height * scale;
    
    // Calculate quality ratio (1.0 = perfect, <1.0 = potential quality loss)
    const qualityRatio = Math.min(
      outputWidth / cropBoxData.width,
      outputHeight / cropBoxData.height
    );
    
    return {
      qualityRatio,
      isWarning: qualityRatio < warningThreshold,
      isCritical: qualityRatio < 0.5
    };
  } catch (err) {
    console.error('Error checking zoom quality:', err);
    return { qualityRatio: 1, isWarning: false, isCritical: false };
  }
};

/**
 * Apply zoom limits to prevent pixelation
 */
export const applyZoomLimit = (cropperInstance: any, minPixelDensity = 1): void => {
  if (!cropperInstance) return;
  
  try {
    const maxZoom = calculateMaxZoom(cropperInstance, minPixelDensity);
    
    // Store the max zoom as a custom property on the cropper instance
    cropperInstance._maxZoom = maxZoom;
    
    // Instead of using setOptions which doesn't exist, directly modify the options
    cropperInstance.options.maxZoom = maxZoom;
    
    // If current zoom exceeds max, scale it down
    const currentScale = getScale(cropperInstance);
    if (currentScale > maxZoom) {
      cropperInstance.zoomTo(maxZoom);
    }
  } catch (err) {
    console.error('Error applying zoom limit:', err);
  }
};
