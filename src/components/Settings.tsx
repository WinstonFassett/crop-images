import { Box, Checkbox, FormControlLabel, TextField } from '@mui/material';
import type { CropSettings } from '../types';

interface SettingsProps {
  settings: CropSettings;
  onSettingsChange: (settings: CropSettings) => void;
}

export const Settings = ({ settings, onSettingsChange }: SettingsProps) => {
  const handleAspectRatioToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({
      ...settings,
      aspectRatio: event.target.checked ? 1 : null,
    });
  };

  const handleDimensionChange = (field: keyof CropSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value ? parseInt(event.target.value, 10) : undefined;
    onSettingsChange({
      ...settings,
      [field]: value,
    });
  };

  const handleAspectRatioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value ? parseFloat(event.target.value) : 1;
    onSettingsChange({
      ...settings,
      aspectRatio: value,
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
      <FormControlLabel
        control={
          <Checkbox
            checked={settings.aspectRatio !== null}
            onChange={handleAspectRatioToggle}
          />
        }
        label="Lock Aspect Ratio"
      />
      {settings.aspectRatio !== null && (
        <TextField
          label="Aspect Ratio"
          type="number"
          value={settings.aspectRatio || ''}
          onChange={handleAspectRatioChange}
          inputProps={{ step: 0.1 }}
        />
      )}
      <TextField
        label="Min Width"
        type="number"
        value={settings.minWidth || ''}
        onChange={handleDimensionChange('minWidth')}
      />
      <TextField
        label="Max Width"
        type="number"
        value={settings.maxWidth || ''}
        onChange={handleDimensionChange('maxWidth')}
      />
      <TextField
        label="Min Height"
        type="number"
        value={settings.minHeight || ''}
        onChange={handleDimensionChange('minHeight')}
      />
      <TextField
        label="Max Height"
        type="number"
        value={settings.maxHeight || ''}
        onChange={handleDimensionChange('maxHeight')}
      />
    </Box>
  );
};
