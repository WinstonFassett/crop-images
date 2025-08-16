import type { CropOptions, CropResult } from './types';
import { safeRevokeObjectURL } from '../utils/urlUtils';

/**
 * Generates a cropped image from a Cropper.js instance
 * @param cropper The Cropper.js instance
 * @param options Options for crop generation
 * @returns A promise resolving to the crop result or null
 */
export const generateCrop = async (cropper: any, options: CropOptions = {}): Promise<CropResult | null> => {
  if (!cropper) {
    console.log('[CropUtils] No cropper instance provided');
    return null;
  }
  
  // Check if the cropper is still valid (not destroyed)
  try {
    // This will throw if the cropper has been destroyed
    const test = cropper.getImageData();
    if (!test) {
      return null;
    }
  } catch (e) {
    console.log('[CropUtils] Cropper is no longer valid:', e);
    return null;
  }

  const {
    maxWidth = 4096,
    maxHeight = 4096,
    format = 'image/png',
    quality = 1
  } = options;

  return new Promise((resolve) => {
    try {
      const canvas = cropper.getCroppedCanvas();
      if (!canvas) {
        console.log('[CropUtils] Failed to get cropped canvas - null returned');
        resolve(null);
        return;
      }

    // Create final canvas with size constraints
    let finalWidth = canvas.width;
    let finalHeight = canvas.height;
    
    if (finalWidth > maxWidth) {
      finalWidth = maxWidth;
      finalHeight = (maxWidth / canvas.width) * canvas.height;
    }
    
    if (finalHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = (maxHeight / canvas.height) * canvas.width;
    }

    // Only create a new canvas if we need to resize
    const finalCanvas = finalWidth !== canvas.width || finalHeight !== canvas.height
      ? document.createElement('canvas')
      : canvas;

    if (finalWidth !== canvas.width || finalHeight !== canvas.height) {
      finalCanvas.width = finalWidth;
      finalCanvas.height = finalHeight;
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      
      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw resized image
      ctx.drawImage(canvas, 0, 0, finalWidth, finalHeight);
    }

    finalCanvas.toBlob((blob: Blob | null) => {
      if (!blob) {
        console.log('[CropUtils] Failed to create blob');
        resolve(null);
        return;
      }

      const url = URL.createObjectURL(blob);
      resolve({
        url,
        blob,
        dimensions: {
          width: finalCanvas.width,
          height: finalCanvas.height
        }
      });
    }, format, quality);
  } catch (error) {
    console.error('[CropUtils] Error during crop generation:', error);
    resolve(null);
  }
  });
};

/**
 * Safely gets a cropped image from a cropper instance, handling all error cases and cleanup
 * @param cropperElement The DOM element with Cropper.js attached
 * @param previousResult Optional previous crop result to clean up
 * @param options Crop generation options
 * @returns A promise resolving to the crop result or null
 */
export const safeCropImage = async (
  cropperElement: HTMLElement | null | undefined,
  previousResult: CropResult | null | undefined,
  options: CropOptions = {}
): Promise<CropResult | null> => {
  // Clean up previous result if it exists
  if (previousResult?.url) {
    safeRevokeObjectURL(previousResult.url);
  }
  
  // Validate cropper element
  if (!cropperElement) {
    return null;
  }
  
  // Access the actual Cropper instance
  const cropperInstance = (cropperElement as any).cropper;
  if (!cropperInstance) {
    return null;
  }

  // Generate new crop
  try {
    return await generateCrop(cropperInstance, options);
  } catch (error) {
    // Keep this error log as it's important for debugging
    console.error('Error in safeCropImage:', error);
    return null;
  }
};
