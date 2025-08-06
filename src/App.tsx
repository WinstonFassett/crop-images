import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import type { CropSettings, ImageItem } from './types';
import { CropperComponent } from './components/CropperComponent';
import { Settings } from './components/Settings';

export default function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [settings, setSettings] = useState<CropSettings>({
    aspectRatio: 1,
    minWidth: 100,
    maxWidth: 2000,
    minHeight: 100,
    maxHeight: 2000,
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newImages = Array.from(event.target.files).map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
      }));
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const handleCrop = useCallback((croppedDataUrl: string) => {
    if (selectedImage) {
      setImages((prev) =>
        prev.map((img) =>
          img.id === selectedImage.id ? { ...img, cropped: croppedDataUrl } : img
        )
      );
      setSelectedImage(null);
    }
  }, [selectedImage]);

  const downloadImage = (image: ImageItem) => {
    if (image.cropped) {
      const link = document.createElement('a');
      link.href = image.cropped;
      link.download = image.file.name.replace(/\.[^/.]+$/, '') + '_cropped.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadAllImages = () => {
    images.forEach((image) => {
      if (image.cropped) {
        downloadImage(image);
      }
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Bulk Image Cropper
      </Typography>
      
      <Stack direction="row" spacing={3}>
        <Box sx={{ width: '25%' }}>
          <Paper className="settings-paper">
            <Stack spacing={2}>
              <Button variant="contained" component="label">
                Upload Images
                <input
                  hidden
                  accept="image/*"
                  multiple
                  type="file"
                  onChange={handleFileUpload}
                />
              </Button>
              <Settings settings={settings} onSettingsChange={setSettings} />
              {images.length > 0 && (
                <Button
                  variant="contained"
                  onClick={downloadAllImages}
                  fullWidth
                >
                  Download All Cropped
                </Button>
              )}
            </Stack>
          </Paper>
        </Box>
        
        <Box sx={{ width: '75%' }}>
          {selectedImage ? (
            <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
              <CropperComponent
                imageSrc={selectedImage.preview}
                settings={settings}
                onCrop={handleCrop}
              />
            </Paper>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              {images.map((image) => (
                <Paper 
                  key={image.id}
                  elevation={1}
                  sx={{ 
                    p: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    backgroundColor: 'background.paper',
                    position: 'relative',
                  }}
                >
                  <Box
                    onClick={() => setSelectedImage(image)}
                    sx={{
                      position: 'relative',
                      height: 400,
                      borderRadius: 1,
                      overflow: 'hidden',
                      backgroundColor: 'action.hover',
                      cursor: 'pointer',
                      '&:hover .overlay': {
                        opacity: 1,
                      }
                    }}
                  >
                    <img
                      src={image.cropped || image.preview}
                      alt={image.file.name}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                    <Box
                      className="overlay"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        bgcolor: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <Typography variant="h6" color="white">
                        Click to {image.cropped ? 'Re-crop' : 'Crop'}
                      </Typography>
                    </Box>
                  </Box>
                  {image.cropped && (
                    <Tooltip title="Download cropped image">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(image);
                        }}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                          }
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Paper>
              ))}
            </Box>
          )}           
        </Box>
      </Stack>
    </Container>
  );
}
