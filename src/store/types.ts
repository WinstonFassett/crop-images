export interface CropOptions {
  maxWidth?: number;
  maxHeight?: number;
  format?: string;
  quality?: number;
}

export interface CropResult {
  url: string;
  blob: Blob;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface CropConfig {
  cropBoxData: any;
  imageData: any;
  canvasData: any;
  options?: CropOptions;
}

// Define the aspect ratio mode type
export type AspectRatioMode = 'free' | 'standard' | 'custom';

// Profile settings type
export interface ProfileSettings {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  aspectRatioLocked: boolean;
  aspectRatioMode: AspectRatioMode;
  standardAspectRatio: string;
  customAspectRatio: number;
}

// Clean Profile type definition
export interface Profile {
  _id: string;
  name: string;
  type: string;
  settings: ProfileSettings;
  createdAt: number;
  updatedAt?: number;
  description?: string;
}

export interface BatchState {
  configs: Record<number, CropConfig>;  // Snapshot of configs at batch start
  status: {
    inProgress: boolean;
    promise?: Promise<void>;
    completed: number[];
    failed: number[];
  };
}

// TaskTracker callback types
export interface TaskCallbacks {
  onProgress?: (progress: number, completed: number, total: number) => void;
  onComplete?: () => void;
  onError?: (error: any) => void;
}

export interface CropDimensions {
  width: number;
  height: number;
}

export interface CropStats {
  imageScale: number;
  qualityWarning: boolean;
  qualityCritical: boolean;
  qualityRatio: number;
  cropFrameDimensions: CropDimensions | null;
  outputDimensions: CropDimensions | null;
  timestamp: number; // To force reactivity
}

export interface CropperStore {
  // View state (DOM-related)
  cropperViewInstances: Record<number, any>;
  
  // Logical state
  cropConfigs: Record<number, CropConfig>;
  cropResults: Record<number, CropResult | null>;
  cropStats: Record<number, CropStats>;
  batchState: BatchState | null;
  
  // Crop stats update function
  updateCropStats: (imageIndex: number, stats: CropStats) => void;
  currentTaskId?: string;
  
  // Actions - UI only needs to care about these
  setCropperViewInstance: (imageIndex: number, instance: any) => void;
  removeCropperViewInstance: (imageIndex: number) => void;
  updateCropConfig: (imageIndex: number) => Promise<boolean>;
  
  // Batch operations
  startBatch: (imageIndexes: number[]) => Promise<void>;
  cancelBatch: () => void;
  cropAllImages: (callbacks?: TaskCallbacks) => Promise<any>;
  
  // Public crop access - simplified
  getCroppedImage: (imageIndex: number, options?: CropOptions) => Promise<CropResult | null>;
  
  // Internal helper methods
  destroyCropper: (imageIndex: number) => void;
  restoreCropConfig: (imageIndex: number, cropper: any) => void;
}
