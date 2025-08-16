// Custom type definitions for Cropper.js
import Cropper from 'cropperjs';

// Extend the HTMLImageElement interface to include the cropper property
declare global {
  interface HTMLImageElement {
    cropper: Cropper;
  }
  
  // Extend EventTarget for cropper events
  interface EventTarget {
    cropper: Cropper;
  }
}

export {};
