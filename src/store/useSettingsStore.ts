import { create } from 'zustand';

export type AspectRatioMode = 'free' | 'standard' | 'custom';

// Core settings interface - used throughout the app
export interface CropSettings {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  standardAspectRatio: string; // Standard aspect ratio like '16:9' when mode is 'standard'
  aspectRatioLocked: boolean;
  aspectRatioMode: AspectRatioMode;
  customAspectRatio: number; // Direct numeric ratio (e.g., 1.78 for 16:9)
  appendResolution: boolean; // Option to append resolution to filenames
}

// Default settings - single source of truth for initial values
export const DEFAULT_SETTINGS: CropSettings = {
  minWidth: 100,
  maxWidth: 2000,
  minHeight: 100,
  maxHeight: 2000,
  aspectRatioLocked: false,
  aspectRatioMode: 'free',
  standardAspectRatio: '1:1',
  customAspectRatio: 1.0,
  appendResolution: false
};

interface SettingsStore extends CropSettings {
  // Per-image settings map
  imageSettings: Record<number, Partial<CropSettings>>;
  
  // Actions for global settings
  setMinWidth: (value: number) => void;
  setMaxWidth: (value: number) => void;
  setMinHeight: (value: number) => void;
  setMaxHeight: (value: number) => void;
  setAspectRatioLocked: (locked: boolean) => void;
  setAspectRatioMode: (mode: AspectRatioMode) => void;
  setStandardAspectRatio: (ratio: string) => void;
  setCustomAspectRatio: (ratio: number) => void;
  setAppendResolution: (append: boolean) => void;
  
  // Actions for per-image settings
  setImageSettings: (imageIndex: number, settings: Partial<CropSettings>) => void;
  clearImageSettings: (imageIndex: number) => void;
  
  // Load settings from a profile
  loadFromProfile: (profile: any) => void;
  
  // Helper methods
  getSettingsForImage: (imageIndex: number) => CropSettings;
  getAspectRatio: (imageIndex?: number) => number;
  getAspectRatioString: (imageIndex?: number) => string | null;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // Initialize with default settings
  ...DEFAULT_SETTINGS,
  
  // Per-image settings map
  imageSettings: {},
  
  // Actions for global settings
  setMinWidth: (value) => set({ minWidth: value }),
  setMaxWidth: (value) => set({ maxWidth: value }),
  setMinHeight: (value) => set({ minHeight: value }),
  setMaxHeight: (value) => set({ maxHeight: value }),
  setAspectRatioLocked: (locked) => set({ aspectRatioLocked: locked }),
  setAspectRatioMode: (mode) => set({ aspectRatioMode: mode }),
  setStandardAspectRatio: (ratio) => set({ standardAspectRatio: ratio }),
  setCustomAspectRatio: (ratio) => set({ customAspectRatio: ratio }),
  setAppendResolution: (append) => set({ appendResolution: append }),
  
  // Actions for per-image settings
  setImageSettings: (imageIndex, settings) => set((state) => ({
    imageSettings: { 
      ...state.imageSettings, 
      [imageIndex]: { 
        ...state.imageSettings[imageIndex],
        ...settings 
      } 
    }
  })),
  
  clearImageSettings: (imageIndex) => set((state) => {
    const newImageSettings = { ...state.imageSettings };
    delete newImageSettings[imageIndex];
    return { imageSettings: newImageSettings };
  }),
  
  // Load settings from a profile
  loadFromProfile: (profile) => {
    if (!profile || !profile.settings) return;
    
    // Only set properties that exist in the profile
    const settings: Partial<CropSettings> = {};
    
    if (profile.settings.minWidth !== undefined) settings.minWidth = profile.settings.minWidth;
    if (profile.settings.maxWidth !== undefined) settings.maxWidth = profile.settings.maxWidth;
    if (profile.settings.minHeight !== undefined) settings.minHeight = profile.settings.minHeight;
    if (profile.settings.maxHeight !== undefined) settings.maxHeight = profile.settings.maxHeight;
    if (profile.settings.aspectRatioLocked !== undefined) settings.aspectRatioLocked = profile.settings.aspectRatioLocked;
    if (profile.settings.aspectRatioMode !== undefined) settings.aspectRatioMode = profile.settings.aspectRatioMode;
    if (profile.settings.standardAspectRatio !== undefined) settings.standardAspectRatio = profile.settings.standardAspectRatio;
    if (profile.settings.customAspectRatio !== undefined) settings.customAspectRatio = profile.settings.customAspectRatio;
    if (profile.settings.appendResolution !== undefined) settings.appendResolution = profile.settings.appendResolution;
    
    set(settings);
  },
  
  // Helper methods
  getSettingsForImage: (imageIndex) => {
    const state = get();
    const imageSpecificSettings = state.imageSettings[imageIndex] || {};
    
    // Merge global settings with image-specific settings
    return {
      minWidth: imageSpecificSettings.minWidth ?? state.minWidth,
      maxWidth: imageSpecificSettings.maxWidth ?? state.maxWidth,
      minHeight: imageSpecificSettings.minHeight ?? state.minHeight,
      maxHeight: imageSpecificSettings.maxHeight ?? state.maxHeight,
      aspectRatioLocked: imageSpecificSettings.aspectRatioLocked ?? state.aspectRatioLocked,
      aspectRatioMode: imageSpecificSettings.aspectRatioMode ?? state.aspectRatioMode,
      standardAspectRatio: imageSpecificSettings.standardAspectRatio ?? state.standardAspectRatio,
      customAspectRatio: imageSpecificSettings.customAspectRatio ?? state.customAspectRatio,
      appendResolution: imageSpecificSettings.appendResolution ?? state.appendResolution
    };
  },
  
  getAspectRatio: (imageIndex) => {
    const settings = imageIndex !== undefined ? 
      get().getSettingsForImage(imageIndex) : 
      get();
    
    // Free mode always returns NaN (no aspect ratio constraint)
    if (settings.aspectRatioMode === 'free') {
      return NaN;
    }
    
    // Custom mode returns the numeric ratio directly
    if (settings.aspectRatioMode === 'custom') {
      return settings.customAspectRatio;
    }
    
    // Standard mode calculates ratio from width:height format
    if (settings.aspectRatioMode === 'standard') {
      const [width, height] = settings.standardAspectRatio.split(':').map(Number);
      return width / height;
    }
    
    // Fallback to NaN for any unexpected mode
    return NaN;
  },
  
  getAspectRatioString: (imageIndex) => {
    const settings = imageIndex !== undefined ? 
      get().getSettingsForImage(imageIndex) : 
      get();
    
    if (!settings.aspectRatioLocked) return null;
    
    if (settings.aspectRatioMode === 'custom') {
      return settings.customAspectRatio.toFixed(2);
    }
    
    if (settings.aspectRatioMode === 'standard') {
      return settings.standardAspectRatio;
    }
    
    return null; // Free mode
  }
}));

