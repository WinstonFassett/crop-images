import React, { useState, useEffect } from 'react';
import { ImageCropperTab } from './ImageCropperTab';
import { ImageResultTab } from './ImageResultTab';
import { CropInfoDisplay } from './CropInfoDisplay';
import { useImageStore } from '../store/useImageStore';
import { useEventCallback } from '../store/useEvent';
import { onShowAllResultTabs } from '../store/events';
import { useCropItem } from '../hooks/useCropItem';
import { useCropperStore } from '../store/useCropperStore';
import { useSettingsStore } from '../store/useSettingsStore';

interface ImageItemProps {
  file: { file: File; name: string };
  index: number;
  profiles: any[];
  imageNames: Record<number, string>;
  editingName: number | null;
  setEditingName: (index: number | null) => void;
  setImageName: (index: number, name: string) => void;
  removeImage: (index: number) => void;
}

export function ImageItem({
  file,
  index,
  profiles,
  imageNames,
  editingName,
  setEditingName,
  setImageName,
  removeImage
}: ImageItemProps) {
  // Each image item manages its own tab state
  const [activeTab, setActiveTab] = useState<'crop' | 'result'>('crop');
  
  // Subscribe to crop stats from the store - use shallow equality to prevent unnecessary rerenders
  const cropStats = useCropperStore(state => state.cropStats[index]);
  
  // // Debug log when crop stats change
  // useEffect(() => {
  //   if (cropStats) {
  //     console.log(`REACT: Image ${index} crop stats updated:`, 
  //       `scale=${cropStats.imageScale?.toFixed(4)},`, 
  //       `dims=${cropStats.cropFrameDimensions?.width}x${cropStats.cropFrameDimensions?.height},`,
  //       `quality=${cropStats.qualityRatio?.toFixed(2)},`,
  //       `timestamp=${new Date(cropStats.timestamp || 0).toISOString()}`);
  //   }
  // }, [cropStats, index]);
  
  const isEditing = editingName === index;
  const displayName = imageNames[index] || file.name;

  // Get crop info data for this image
  const {
    cropperRef,
    imageSrc,
    cropFrameDimensions,
    outputDimensions,
    imageScale,
    qualityWarning,
    qualityCritical,
    qualityRatio
  } = useCropItem({ file: file.file, index });

  useEventCallback(onShowAllResultTabs, () => {
    setActiveTab('result');
  });
  
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
      {/* Image Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          {isEditing ? (
            <input
              type="text"
              value={imageNames[index] || file.name}
              onChange={(e) => setImageName(index, e.target.value)}
              onBlur={() => setEditingName(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingName(null);
                if (e.key === 'Escape') setEditingName(null);
              }}
              autoFocus
              className="w-64 p-2 text-lg font-medium border border-gray-300 dark:border-gray-600 rounded"
            />
          ) : (
            <span 
              className="text-lg font-medium cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline active:text-blue-600 dark:active:text-blue-400 whitespace-normal " 
              title="Click to edit filename"
              onClick={() => setEditingName(index)}
            >
              {displayName}
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          {/* Profile Selector */}
          <select
            className="text-sm border border-gray-300 dark:border-gray-600 rounded p-1"
            onChange={(e) => {
              const profileId = e.target.value;
              if (profileId === 'free') {
                // Set to free mode
                useSettingsStore.getState().setImageSettings(index, {
                  aspectRatioMode: 'free',
                  aspectRatioLocked: false
                });
              } else {
                // Find the selected profile
                const selectedProfile = profiles.find(p => p._id === profileId);
                if (selectedProfile) {
                  // Apply profile settings to this image using current ProfileSettings shape
                  const s = selectedProfile.settings;
                  useSettingsStore.getState().setImageSettings(index, {
                    aspectRatioMode: s.aspectRatioMode,
                    aspectRatioLocked: s.aspectRatioLocked,
                    standardAspectRatio: s.standardAspectRatio,
                    customAspectRatio: s.customAspectRatio,
                    minWidth: s.minWidth,
                    maxWidth: s.maxWidth,
                    minHeight: s.minHeight,
                    maxHeight: s.maxHeight,
                    ...(typeof (s as any).appendResolution !== 'undefined' ? { appendResolution: (s as any).appendResolution } : {})
                  });
                }
              }
            }}
          >
            <option value="">Select Profile</option>
            <option value="free">Free (No Constraints)</option>
            {profiles.map((profile) => (
              <option key={profile._id} value={profile._id}>
                {profile.name}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => {
              if (confirm('Are you sure you want to remove this image?')) {
                removeImage(index);
              }
            }}
            className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 p-1"
            title="Remove"
          >
            ❌
          </button>
        </div>
      </div>

      {/* Crop Info Display - Moved above tabs */}
      <div className="px-4 pb-2">
        <CropInfoDisplay 
          key={`crop-info-${index}-${cropStats?.timestamp || Date.now()}`}
          originalDimensions={useImageStore.getState().originalDimensions?.[index]}
          outputDimensions={cropStats?.cropFrameDimensions || cropFrameDimensions || outputDimensions}
          imageScale={cropStats?.imageScale || imageScale} 
          qualityWarning={cropStats?.qualityWarning || qualityWarning} 
          qualityCritical={cropStats?.qualityCritical || qualityCritical}
          qualityRatio={cropStats?.qualityRatio || qualityRatio} 
        />
      </div>

      {/* Per-Image Mode Tabs */}
      <div>
        <div className="flex border-t border-b border-gray-200 dark:border-gray-700">
          <button
            className={`flex-1 py-2 text-center font-medium text-sm ${
              activeTab === 'crop'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
            onClick={() => setActiveTab('crop')}
          >
            ✂️ Crop
          </button>
          <button
            className={`flex-1 py-2 text-center font-medium text-sm ${
              activeTab === 'result'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
            onClick={() => setActiveTab('result')}
          >
            🖼️ Result
          </button>
        </div>

        {/* Always keep the cropper tab mounted to preserve the cropper instance */}
        <div style={{ display: activeTab === 'crop' ? 'block' : 'none' }}>
          <ImageCropperTab 
            file={file.file} 
            index={index}
          />
        </div>
        {activeTab === 'result' && (
          <div>
            <ImageResultTab 
              originalFile={file.file} 
              index={index}
              imageNames={imageNames}
            />
          </div>
        )}
      </div>
    </div>
  );
}
