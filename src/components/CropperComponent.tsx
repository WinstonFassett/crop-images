// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { Box, Button } from '@mui/material';
import type { CropSettings } from '../types';
import '@cropper/elements';

// Allow web components in TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'cropper-canvas': any;
      'cropper-image': any;
      'cropper-selection': any;
      'cropper-grid': any;
      'cropper-handle': any;
    }
  }
}

interface CropperProps {
  imageSrc: string;
  settings: CropSettings;
  onCrop: (croppedDataUrl: string) => void;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'cropper-canvas': any;
      'cropper-image': any;
      'cropper-selection': any;
      'cropper-grid': any;
      'cropper-handle': any;
    }
  }
}

export const CropperComponent = ({ imageSrc, settings, onCrop }: CropperProps) => {
  const canvasRef = useRef<HTMLElement>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(settings.aspectRatio ?? 1);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => setIsLoaded(true);
  }, [imageSrc]);

  useEffect(() => {
    setAspectRatio(settings.aspectRatio ?? 1);
  }, [settings.aspectRatio]);

  const handleCrop = () => {
    if (!canvasRef.current || !isLoaded) return;

    const canvas = document.createElement('canvas');
    const selection = canvasRef.current.querySelector('cropper-selection');
    const cropperImage = canvasRef.current.querySelector('cropper-image');
    if (!selection || !cropperImage) return;

    const selectionRect = selection.getBoundingClientRect();
    const imageRect = cropperImage.getBoundingClientRect();

    // Calculate relative position within the image
    const relativeX = (selectionRect.left - imageRect.left) / imageRect.width;
    const relativeY = (selectionRect.top - imageRect.top) / imageRect.height;
    const relativeWidth = selectionRect.width / imageRect.width;
    const relativeHeight = selectionRect.height / imageRect.height;

    // Get original image dimensions
    const img = new Image();
    img.src = imageSrc;
    
    img.onload = () => {
      // Set canvas dimensions to match the cropped area at original image resolution
      const cropWidth = img.width * relativeWidth;
      const cropHeight = img.height * relativeHeight;
      
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          img,
          img.width * relativeX,
          img.height * relativeY,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        );

        // Add quality parameter to maintain image quality
        onCrop(canvas.toDataURL('image/jpeg', 0.95));
      }
    };
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box 
        sx={{ 
          width: '100%',
          height: '600px',
          position: 'relative',
          backgroundColor: '#1a1a1a',
          borderRadius: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* @ts-ignore */}
        <cropper-canvas
          ref={canvasRef}
          style={{ 
            width: '100%', 
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          background="true"
        >
          {/* @ts-ignore */}
          <cropper-image
            src={imageSrc}
            alt="Image to crop"
            rotatable="true"
            scalable="true"
            style={{ 
              maxHeight: '100%',
              maxWidth: '100%',
              objectFit: 'contain'
            }}
          />
          {/* @ts-ignore */}
          <cropper-selection
            movable="true"
            resizable="true"
            style={{
              aspectRatio: aspectRatio ? aspectRatio.toString() : 'unset',
              minWidth: settings.minWidth ? `${settings.minWidth}px` : 'unset',
              maxWidth: settings.maxWidth ? `${settings.maxWidth}px` : 'unset',
              minHeight: settings.minHeight ? `${settings.minHeight}px` : 'unset',
              maxHeight: settings.maxHeight ? `${settings.maxHeight}px` : 'unset',
            }}
          >
            {/* @ts-ignore */}
            <cropper-grid role="grid" covered="true" />
            <cropper-handle action="move" />
            <cropper-handle action="n-resize" />
            <cropper-handle action="e-resize" />
            <cropper-handle action="s-resize" />
            <cropper-handle action="w-resize" />
            <cropper-handle action="ne-resize" />
            <cropper-handle action="nw-resize" />
            <cropper-handle action="se-resize" />
            <cropper-handle action="sw-resize" />
          </cropper-selection>
        </cropper-canvas>
      </Box>
      <Button 
        variant="contained" 
        onClick={handleCrop}
        size="large"
      >
        Crop Image
      </Button>
    </Box>
  );
};
