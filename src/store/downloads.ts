import { useCropperStore, useImageStore, useSettingsStore } from '@/store';

export function deriveOutputFilename(originalName: string, newName: string, newDimensions: { width: number; height: number; } | null) {
  const extension = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '.png';
  const originalBaseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;

  let newFileName = newName
    ? (newName.includes('.') ? newName.substring(0, newName.lastIndexOf('.')) : newName)
    : originalBaseName;

  if (newDimensions) {
    newFileName += `-${newDimensions.width}x${newDimensions.height}`;
  }

  return newFileName + extension;
}

export function downloadCroppedImage(index: number) {
  const { uploadedFiles, imageNames } = useImageStore.getState();
  const { cropResults } = useCropperStore.getState();
  const { appendResolution } = useSettingsStore.getState();

  if (!cropResults[index]) return;

  const link = document.createElement('a');
  link.href = cropResults[index].url;

  // much of this logic should be shared. not here.
  // single file export needs this to. 
  const originalName = uploadedFiles[index].name;
  const newName = imageNames[index];
  const newDimensions = appendResolution ? cropResults[index].dimensions : null;
  
  const fileName = deriveOutputFilename(originalName, newName, newDimensions);

  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadAllCroppedImages() {
  console.log('Downloading all images...');

  try {
    // Get uploaded files as the source of truth
    const { uploadedFiles, imageNames } = useImageStore.getState();
    
    if (uploadedFiles.length === 0) {
      console.error('No uploaded files found');
      return;
    }
    
    console.log(`Found ${uploadedFiles.length} uploaded files`);
    
    // Get indices from uploaded files
    const imageIndices = uploadedFiles.map((_, index) => index);
    
    // Force update crop configs for all images first
    const updatePromises = imageIndices.map(index => 
      useCropperStore.getState().updateCropConfig(index)
    );
    
    // Wait for all config updates to complete
    await Promise.all(updatePromises);
    
    // Now crop all images and wait for completion
    await useCropperStore.getState().cropAllImages();

    // Get fresh crop results after cropping
    const { cropResults } = useCropperStore.getState();
    const { appendResolution } = useSettingsStore.getState();

    // Download each result
    imageIndices.forEach(index => {
      if (!cropResults[index]) {
        console.error(`No crop result for image ${index}`);
        return;
      }

      const link = document.createElement('a');
      link.href = cropResults[index].url;

      const originalName = uploadedFiles[index].name;
      const newName = imageNames[index];
      const newDimensions = appendResolution ? cropResults[index].dimensions : null;
      
      const fileName = deriveOutputFilename(originalName, newName, newDimensions);

      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      // Small delay between downloads to avoid browser issues
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    });
  } catch (error) {
    console.error('Error downloading images:', error);
  }
}
