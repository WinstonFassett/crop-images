export interface CropSettings {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  aspectRatio?: number | null;
}

export interface ImageItem {
  id: string;
  file: File;
  preview: string;
  cropped?: string;
}
