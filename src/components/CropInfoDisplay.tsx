import React from 'react';

interface Dimensions {
  width: number;
  height: number;
}

interface CropInfoDisplayProps {
  originalDimensions?: Dimensions | null;
  outputDimensions?: Dimensions | null;
  imageScale: number;
  qualityWarning?: boolean;
  qualityCritical?: boolean;
  qualityRatio: number;
}

export const CropInfoDisplay = React.memo(function CropInfoDisplay({
  originalDimensions,
  outputDimensions,
  imageScale,
  qualityWarning = false,
  qualityCritical = false,
  qualityRatio = 1.0
}: CropInfoDisplayProps) {

  return (
    <div className="mb-4">
      <div className="text-sm text-gray-500 dark:text-gray-400 space-x-4">
        {originalDimensions && (
          <span>Original: {originalDimensions.width} × {originalDimensions.height}px</span>
        )}
        
        {outputDimensions && (
          <span>Output: {outputDimensions.width} × {outputDimensions.height}px</span>
        )}
        
        <span>Scale: {imageScale < 0.1 ? imageScale.toFixed(4) : imageScale < 1 ? imageScale.toFixed(3) : imageScale.toFixed(2)}x</span>
        
        <span>
          Quality: <span 
            className={`font-medium ${qualityCritical ? 'text-red-500' : qualityWarning ? 'text-yellow-500' : 'text-green-500'}`}
          >
            {(qualityRatio * 100).toFixed(0)}%
            {qualityWarning && !qualityCritical && ' ⚠️ Low resolution'}
            {qualityCritical && ' ⚠️ Very low resolution'}
          </span>
        </span>
      </div>
    </div>
  );
})
