export interface ImageItem {
  id: string;
  file: File;
  url: string;
  name: string;
}

export interface CropperInstance {
  destroy: () => void;
  getCropBoxData: () => any;
  getImageData: () => any;
  getCanvasData: () => any;
  setCanvasData: (data: any) => void;
  setCropBoxData: (data: any) => void;
}

export interface CropperState {
  cropBoxData: any;
  imageData: any;
  canvasData: any;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface CroppedImage {
  url: string;
  blob: Blob;
  dimensions: ImageDimensions;
}

export interface TabState {
  [key: number]: 'crop' | 'result';
}

export interface ImageProfiles {
  [key: number]: string;
}

export interface ImageNames {
  [key: number]: string;
}

export interface CropperInstances {
  [key: number]: CropperInstance;
}

export interface CroppedImages {
  [key: number]: CroppedImage;
}

export interface OriginalDimensions {
  [key: number]: ImageDimensions;
}

export interface CropperConfigs {
  [key: number]: CropperState;
}
