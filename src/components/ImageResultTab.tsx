import { downloadCroppedImage } from '@/store/downloads';
import { useEffect } from 'react';
import { useCroppedImage } from '../hooks/useCroppedImage';
import { useCropperStore } from '../store/useCropperStore';

interface ImageResultTabProps {
  index: number;
  originalFile: File;
  imageNames: Record<number, string>;
}

export function ImageResultTab({ index, originalFile, imageNames }: ImageResultTabProps) {
  const { 
    croppedImage, 
    croppedDimensions,
    originalDimensions,
    isLoading,
    generateCrop 
  } = useCroppedImage(index);
  
  // Generate crop when the tab is first displayed or when croppedImage is cleared
  useEffect(() => {
    if (!croppedImage && !isLoading) {
      generateCrop();
    }
  }, [croppedImage, isLoading]);
  
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <div className="ml-3 text-blue-500">Generating crop result...</div>
        </div>
      ) : croppedImage ? (
        <div className="flex flex-col items-center justify-center">
          <div className="mx-auto mb-4">
            <img 
              src={croppedImage} 
              alt="Cropped result" 
              className="max-w-full h-auto rounded-md shadow-sm"
              style={{ display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
            />
          </div>
          
          <button
            onClick={() => downloadCroppedImage(index)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded text-sm transition-colors"
          >
            Download
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-3"></div>
          <div className="text-blue-500 mb-4">Preparing crop result...</div>
          <button
            onClick={() => {
              // Manually trigger crop generation if it's stuck
              generateCrop();
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded text-sm transition-colors mt-4"
          >
            Retry Generation
          </button>
        </div>
      )}
    </div>
  );
}
