import { create } from 'zustand';
import { safeRevokeObjectURL } from '../utils/urlUtils';

export interface ImageFile {
  file: File;
  id: string;
  url: string;
  name: string;
}

export interface CroppedImage {
  url: string;
  blob: Blob;
  dimensions: {
    width: number;
    height: number;
  };
}

interface ImageStore {
  // State
  uploadedFiles: ImageFile[];
  croppedImages: Record<number, CroppedImage>;
  processingQueue: Set<number>;
  imageNames: Record<number, string>;
  originalDimensions: Record<number, { width: number; height: number }>;
  editingName: number | null;
  activeTab: Record<number, 'crop' | 'result'>;
  selectedImageIndex: number | null;
  
  // Actions
  addImages: (files: File[]) => void;
  removeImage: (indexToRemove: number) => void;
  setCroppedImage: (imageIndex: number, croppedImage: CroppedImage) => void;
  removeCroppedImage: (imageIndex: number) => void;
  addToProcessingQueue: (imageIndex: number) => void;
  removeFromProcessingQueue: (imageIndex: number) => void;
  setImageName: (imageIndex: number, name: string) => void;
  setOriginalDimensions: (imageIndex: number, dimensions: { width: number; height: number }) => void;
  setEditingName: (imageIndex: number | null) => void;
  setActiveTab: (imageIndex: number, tab: 'crop' | 'result') => void;
  setAllActiveTabs: (tab: 'crop' | 'result') => void;
}

export const useImageStore = create<ImageStore>((set) => ({
  // Initial state
  uploadedFiles: [],
  croppedImages: {},
  processingQueue: new Set<number>(),
  imageNames: {},
  originalDimensions: {},
  editingName: null,
  activeTab: {},
  selectedImageIndex: null,
  
  // Actions
  addImages: (files) => set((state) => {
    const newFiles = files.filter(file => file.type.startsWith('image/')).map((file, index) => ({
      file,
      id: `${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    
    const newTabs: Record<number, 'crop' | 'result'> = {};
    const newImageNames: Record<number, string> = {};
    
    newFiles.forEach((fileData, index) => {
      const imageIndex = state.uploadedFiles.length + index;
      newTabs[imageIndex] = 'crop';
      newImageNames[imageIndex] = fileData.name.substring(0, fileData.name.lastIndexOf('.')) || fileData.name;
      
      // Load original dimensions
      const img = new Image();
      img.onload = () => {
        set((state) => ({
          originalDimensions: {
            ...state.originalDimensions,
            [imageIndex]: { width: img.width, height: img.height }
          }
        }));
      };
      img.src = fileData.url;
    });
    
    return {
      uploadedFiles: [...state.uploadedFiles, ...newFiles],
      activeTab: { ...state.activeTab, ...newTabs },
      imageNames: { ...state.imageNames, ...newImageNames }
    };
  }),
  
  removeImage: (indexToRemove) => set((state) => {
    // Clean up URL
    safeRevokeObjectURL(state.uploadedFiles[indexToRemove].url);
    
    // Clean up cropped image URL if exists
    if (state.croppedImages[indexToRemove]) {
      safeRevokeObjectURL(state.croppedImages[indexToRemove].url);
    }
    
    // Remove from all state
    const newUploadedFiles = state.uploadedFiles.filter((_, index) => index !== indexToRemove);
    
    // Reindex remaining items
    const newCroppedImages: Record<number, CroppedImage> = {};
    const newImageNames: Record<number, string> = {};
    const newOriginalDimensions: Record<number, { width: number; height: number }> = {};
    
    // WOW THIS IS KINDA CRAZY
    // A DOWNSIDE OF NORMALIZATION BASED ON INDEX
    // WHY DID WE ALLOW THIS??
    // We should switch to IDS. 
    state.uploadedFiles.forEach((_, oldIndex) => {
      if (oldIndex < indexToRemove) {
        // Keep same index
        if (state.croppedImages[oldIndex]) newCroppedImages[oldIndex] = state.croppedImages[oldIndex];
        if (state.imageNames[oldIndex]) newImageNames[oldIndex] = state.imageNames[oldIndex];
        if (state.originalDimensions[oldIndex]) newOriginalDimensions[oldIndex] = state.originalDimensions[oldIndex];
      } else if (oldIndex > indexToRemove) {
        // Shift index down by 1
        const newIndex = oldIndex - 1;
        if (state.croppedImages[oldIndex]) newCroppedImages[newIndex] = state.croppedImages[oldIndex];
        if (state.imageNames[oldIndex]) newImageNames[newIndex] = state.imageNames[oldIndex];
        if (state.originalDimensions[oldIndex]) newOriginalDimensions[newIndex] = state.originalDimensions[oldIndex];
      }
      // Skip indexToRemove (effectively removing it)
    });
    
    // Create new processing queue without the removed index
    const newProcessingQueue = new Set<number>(state.processingQueue);
    newProcessingQueue.delete(indexToRemove);
    
    // Adjust indices in processing queue
    const adjustedProcessingQueue = new Set<number>();
    newProcessingQueue.forEach(index => {
      if (index < indexToRemove) {
        adjustedProcessingQueue.add(index);
      } else if (index > indexToRemove) {
        adjustedProcessingQueue.add(index - 1);
      }
    });
    
    return {
      uploadedFiles: newUploadedFiles,
      croppedImages: newCroppedImages,
      processingQueue: adjustedProcessingQueue,
      imageNames: newImageNames,
      originalDimensions: newOriginalDimensions
    };
  }),
  
  setCroppedImage: (imageIndex, croppedImage) => set((state) => ({
    croppedImages: { ...state.croppedImages, [imageIndex]: croppedImage }
  })),
  
  removeCroppedImage: (imageIndex) => set((state) => {
    // Clean up URL if exists
    if (state.croppedImages[imageIndex]) {
      safeRevokeObjectURL(state.croppedImages[imageIndex].url);
    }
    
    const newCroppedImages = { ...state.croppedImages };
    delete newCroppedImages[imageIndex];
    
    return { croppedImages: newCroppedImages };
  }),
  
  addToProcessingQueue: (imageIndex) => set((state) => {
    const newQueue = new Set(state.processingQueue);
    newQueue.add(imageIndex);
    return { processingQueue: newQueue };
  }),
  
  removeFromProcessingQueue: (imageIndex) => set((state) => {
    const newQueue = new Set(state.processingQueue);
    newQueue.delete(imageIndex);
    return { processingQueue: newQueue };
  }),
  
  setImageName: (imageIndex, name) => set((state) => ({
    imageNames: { ...state.imageNames, [imageIndex]: name }
  })),
  
  setOriginalDimensions: (imageIndex, dimensions) => set((state) => ({
    originalDimensions: { ...state.originalDimensions, [imageIndex]: dimensions }
  })),
  
  setEditingName: (imageIndex) => set({ editingName: imageIndex }),
  
  setActiveTab: (imageIndex, tab) => set((state) => ({
    activeTab: { ...state.activeTab, [imageIndex]: tab }
  })),
  
  setAllActiveTabs: (tab) => set((state) => {
    console.log('setAllActiveTabs called with tab:', tab);
    console.log('Current uploadedFiles:', state.uploadedFiles.length);
    
    const newActiveTabs = { ...state.activeTab };
    state.uploadedFiles.forEach((_, index) => {
      console.log(`Setting tab for index ${index} to ${tab}`);
      newActiveTabs[index] = tab;
    });
    
    console.log('New active tabs:', newActiveTabs);
    return { activeTab: newActiveTabs };
  })
}));
