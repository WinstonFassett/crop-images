import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { CropperStore, CropConfig, CropOptions, CropResult, CropStats } from './types';
import { useTaskStore } from './useTaskStore';
import { showAllResultTabs } from './events';
import { safeCropImage } from './cropUtils';
import { safeRevokeObjectURL } from '../utils/urlUtils';
import { useImageStore } from './useImageStore';
import { useSettingsStore } from './useSettingsStore';

// Create store with subscribeWithSelector middleware for reactive updates
export const useCropperStore = create(subscribeWithSelector<CropperStore>((set, get) => {
  // Add a function to invalidate all crop results
  const invalidateAllCropResults = () => {
    // console.log('Settings changed, invalidating all crop results');

    // Get current crop results
    const { cropResults } = get();

    // If there are no results, nothing to invalidate
    if (Object.keys(cropResults).length === 0) return;

    // Revoke all blob URLs to prevent memory leaks
    Object.values(cropResults).forEach(result => {
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
    });

    // Clear all crop results to force regeneration
    set({ cropResults: {} });
  };

  // This runs once when the store is created
  const unsubscribe = useSettingsStore.subscribe((state, prev) => {
    invalidateAllCropResults()
  })
  // We don't need to unsubscribe since this runs for the lifetime of the app

  return {
    // State
    cropperViewInstances: {},
    cropConfigs: {},
    cropResults: {},
    cropStats: {},
    batchState: null,

    // Instance management
    setCropperViewInstance: (imageIndex: number, instance: any) => {
      set(state => ({
        cropperViewInstances: { ...state.cropperViewInstances, [imageIndex]: instance }
      }));
    },

    removeCropperViewInstance: (imageIndex: number) => {
      const { cropperViewInstances, cropResults } = get();
      const newInstances = { ...cropperViewInstances };
      const newResults = { ...cropResults };

      delete newInstances[imageIndex];

      // Clean up any associated URL
      if (cropResults[imageIndex]) {
        safeRevokeObjectURL(cropResults[imageIndex].url);
        delete newResults[imageIndex];
      }

      set({
        cropperViewInstances: newInstances,
        cropResults: newResults
      });
    },

    // Crop configuration
    updateCropConfig: (imageIndex: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const cropperElement = get().cropperViewInstances[imageIndex];
        if (!cropperElement) {
          console.error(`updateCropConfig(${imageIndex}): No cropper element found`);
          resolve(false);
          return;
        }

        try {
          // Access the Cropper instance through the DOM element's cropper property
          const cropperInstance = cropperElement.cropper;
          if (!cropperInstance) {
            console.error(`updateCropConfig(${imageIndex}): No cropper instance found on element`);
            resolve(false);
            return;
          }

          // console.log(`updateCropConfig(${imageIndex}): Getting crop data`);
          const cropBoxData = cropperInstance.getCropBoxData();
          const imageData = cropperInstance.getImageData();
          const canvasData = cropperInstance.getCanvasData();

          // Validate we got actual data
          if (!cropBoxData || !imageData || !canvasData) {
            console.error(`updateCropConfig(${imageIndex}): Failed to get crop data`);
            resolve(false);
            return;
          }

          const newConfigs = { ...get().cropConfigs };
          const newResults = { ...get().cropResults };

          newConfigs[imageIndex] = {
            cropBoxData,
            imageData,
            canvasData
          };

          // Clear any cached result when config changes
          if (newResults[imageIndex]) {
            safeRevokeObjectURL(newResults[imageIndex].url);
            delete newResults[imageIndex];
          }

          // console.log(`updateCropConfig(${imageIndex}): Updating store with new config`);
          set({
            cropConfigs: newConfigs,
            cropResults: newResults
          });

          // Do NOT generate a crop after config update
          // Let the UI request crops when needed
          resolve(true);
        } catch (error) {
          console.error(`updateCropConfig(${imageIndex}): Error:`, error);
          resolve(false);
        }
      });
    },

    // Update crop stats for a specific image index
    updateCropStats: (imageIndex: number, stats: CropStats) => {
      const currentStats = { ...get().cropStats };
      
      // Store the updated stats with a new object reference
      currentStats[imageIndex] = {
        ...stats,
        // Force timestamp update to ensure reactivity
        timestamp: Date.now()
      };
      
      // Debug log for store updates
      // console.log(`STORE: Updating crop stats for image ${imageIndex}:`,
      //   `scale=${stats.imageScale?.toFixed(4)},`,
      //   `dims=${stats.cropFrameDimensions?.width}x${stats.cropFrameDimensions?.height},`,
      //   `quality=${stats.qualityRatio?.toFixed(2)},`,
      //   `timestamp=${new Date().toISOString()}`);
      
      // Update the store with a completely new object reference
      set({
        cropStats: { ...currentStats }
      });
    },
    
    // Get a cropped image for a specific image index
    getCroppedImage: async (imageIndex: number, options: CropOptions = {}): Promise<CropResult | null> => {
      const { cropperViewInstances, cropResults, cropConfigs } = get();

      // Check cache first
      const cached = cropResults[imageIndex];
      if (cached) {
        try {
          // Just check if the blob is still valid
          if (cached.blob && cached.url) {
            return cached;
          }
        } catch (e) {
          // Cache is invalid, clean up and regenerate
          if (cached.url) {
            safeRevokeObjectURL(cached.url);
          }
        }
      }

      // If we have no cropper instance but have a crop config, we can try to use the config
      if (!cropperViewInstances[imageIndex]) {
        // Just log a warning instead of an error
        console.warn(`getCroppedImage(${imageIndex}): No cropper instance found, using cached config if available`);
        
        // If we have a cached crop result, return it
        if (cached && cached.blob && cached.url) {
          return cached;
        }
        
        // If we have a crop config but no result, we'll need to wait for the cropper to be available
        if (cropConfigs[imageIndex]) {
          return null;
        }
        
        return null;
      }

      // Use the safeCropImage utility to handle cropper validation and crop generation
      const cropperElement = cropperViewInstances[imageIndex];
      const previousResult = cropResults[imageIndex] || null;
      const result = await safeCropImage(cropperElement, previousResult, options);

      if (result) {
        const newResults = { ...get().cropResults };
        newResults[imageIndex] = result;
        set({ cropResults: newResults });
      }

      return result;
    },

    // Batch operations
    startBatch: async (imageIndexes: number[]) => {
      const store = get();
      const configs: Record<number, CropConfig> = {};

      // Snapshot current configs
      imageIndexes.forEach(idx => {
        const config = store.cropConfigs[idx];
        if (config) configs[idx] = { ...config };
      });

      // Create batch state
      set({
        batchState: {
          configs,
          status: {
            inProgress: true,
            promise: Promise.resolve(),
            completed: [],
            failed: []
          }
        }
      });

      // Process batch
      for (const idx of imageIndexes) {
        if (!get().batchState?.status.inProgress) break;

        try {
          const result = await store.getCroppedImage(idx);
          if (result) {
            set(state => ({
              batchState: state.batchState ? {
                ...state.batchState,
                status: {
                  ...state.batchState.status,
                  completed: [...state.batchState.status.completed, idx]
                }
              } : null
            }));
          } else {
            set(state => ({
              batchState: state.batchState ? {
                ...state.batchState,
                status: {
                  ...state.batchState.status,
                  failed: [...state.batchState.status.failed, idx]
                }
              } : null
            }));
          }
        } catch {
          set(state => ({
            batchState: state.batchState ? {
              ...state.batchState,
              status: {
                ...state.batchState.status,
                failed: [...state.batchState.status.failed, idx]
              }
            } : null
          }));
        }
      }

      // Mark batch as complete
      set(state => ({
        batchState: state.batchState ? {
          ...state.batchState,
          status: {
            ...state.batchState.status,
            inProgress: false
          }
        } : null
      }));
    },

    cancelBatch: () => set({ batchState: null }),

    // Crop all images
    cropAllImages: async () => {
      // Get uploaded files as the source of truth
      const { uploadedFiles } = useImageStore.getState();
      const imageIndices = uploadedFiles.map((_, index) => index);

      // console.log(`cropAllImages: Found ${imageIndices.length} uploaded files`);

      if (imageIndices.length === 0) {
        console.error('No uploaded files found for cropAllImages');
        return null;
      }

      // Check which images need crop updates
      const { cropResults } = get();
      const needsUpdate = imageIndices.filter(index => !cropResults[index]);
      
      if (needsUpdate.length === 0) {
        console.log('cropAllImages: All crops already exist, skipping updates');
      } else {
        // console.log(`cropAllImages: Updating crop configs for ${needsUpdate.length} images`);
        const configPromises = needsUpdate.map(index => {
          // Only update configs for images that need it
          return get().updateCropConfig(index);
        });

        // Wait for all config updates to complete
        const configResults = await Promise.all(configPromises);
        // console.log(`cropAllImages: Config updates completed with ${configResults.filter(Boolean).length} successes`);
      }

      // Create a task in the task store directly using the imported dependency
      const taskStore = useTaskStore.getState();
      const task = taskStore.createTask();

      // Get settings from the settings store
      const settingsStore = useSettingsStore.getState();
      const options = {
        maxWidth: settingsStore.maxWidth,
        maxHeight: settingsStore.maxHeight,
        format: 'image/png',
        quality: 0.95
      };

      // Update task status
      taskStore.updateTask(task.id, 0, 'in_progress');

      // Process only images that need updating
      const imagesToProcess = needsUpdate.length > 0 ? needsUpdate : [];
      let completed = 0;
      const totalToProcess = imagesToProcess.length;
      
      if (totalToProcess === 0) {
        console.log('cropAllImages: No images need processing, all crops exist');
        taskStore.updateTask(task.id, 100, 'completed');
        return task;
      }
      
      for (const index of imagesToProcess) {
        try {
          console.log(`cropAllImages: Processing image ${index}`);
          // Use the existing getCroppedImage function
          const result = await get().getCroppedImage(index, options);
          completed++;

          if (result) {
            console.log(`cropAllImages: Successfully processed image ${index}`);
          } else {
            console.error(`cropAllImages: Failed to get crop result for image ${index}`);
          }

          // Update progress
          const progress = Math.round((completed / totalToProcess) * 100);
          taskStore.updateTask(task.id, progress, 'in_progress');
        } catch (err) {
          console.error(`Error processing image ${index}:`, err);
          // Continue processing other images
        }
      }

      // Mark task as complete
      taskStore.updateTask(task.id, 100, 'completed');

      // Store the task ID for reference
      set({ currentTaskId: task.id });

      // Now that all images are processed, show all result tabs
      // This ensures the tabs are shown AFTER the crops are ready
      showAllResultTabs();

      return task.id;
    },

    // Cropper management
    destroyCropper: (imageIndex: number) => {
      const cropper = get().cropperViewInstances[imageIndex];
      if (cropper) {
        cropper.destroy();
        get().removeCropperViewInstance(imageIndex);
      }
    },

    restoreCropConfig: (imageIndex: number, cropper: any) => {
      // Simple one-time restore with no flags or loops
      const config = get().cropConfigs[imageIndex];
      if (!config || !cropper) return;

      try {
        // Only restore if cropper is ready
        if (cropper.ready) {
          // console.log(`Restoring crop config for image ${imageIndex}`);
          // Set canvas data first (position, zoom)
          if (config.canvasData) {
            cropper.setCanvasData(config.canvasData);
          }
          // Then set crop box (selection area)
          if (config.cropBoxData) {
            cropper.setCropBoxData(config.cropBoxData);
          }

          // Do NOT trigger an immediate crop generation after restoring config
          // Let the UI request crops when needed
        } else {
          // console.log(`Cropper for image ${imageIndex} not ready, skipping restore`);
        }
      } catch (error) {
        console.error(`Error restoring crop config for image ${imageIndex}:`, error);
      }
    }
  }
}))

// Export the store instance for direct access
export const cropperStore = useCropperStore
