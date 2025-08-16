import { useState, useEffect, useCallback } from 'react';
import { useCropperStore } from '../store/useCropperStore';
import { useImageStore } from '../store/useImageStore';
import { useProfileStore } from '../store/useProfileStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTaskStore } from '../store/useTaskStore';
import { downloadAllCroppedImages } from '../store/downloads';
import { ProgressDisplay } from './ProgressDisplay';
import { Button } from '@/components/ui/button';
import { Switch } from './ui/switch';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
interface SettingsPanelProps {
  profiles: any[];
}

export function SettingsPanel({ profiles }: SettingsPanelProps) {
  // Image store
  const uploadedFiles = useImageStore(state => state.uploadedFiles);
  const selectedImageIndex = useImageStore(state => state.selectedImageIndex);
  
  // Settings store - get global settings or image-specific settings if an image is selected
  const settings = useSettingsStore(state => 
    selectedImageIndex !== null ? 
    state.getSettingsForImage(selectedImageIndex) : 
    state
  );
  
  // Get the setImageSettings function from settings store
  const setImageSettings = useSettingsStore(state => state.setImageSettings);
  
  // Function to update either global or image-specific setting based on selection
  const updateSetting = useCallback((key: string, value: any) => {
    if (selectedImageIndex !== null) {
      // Update image-specific setting
      setImageSettings(selectedImageIndex, { [key]: value });
    } else {
      // Update global setting using the specific setter
      useSettingsStore.getState()[`set${key.charAt(0).toUpperCase() + key.slice(1)}`](value);
    }
  }, [selectedImageIndex, setImageSettings]);
  
  // Local state for numerator/denominator UI inputs
  const [numerator, setNumerator] = useState<number>(16);
  const [denominator, setDenominator] = useState<number>(9);
  
  // Update local numerator/denominator when customAspectRatio changes
  useEffect(() => {
    if (settings.customAspectRatio) {
      // Find a reasonable approximation for the ratio
      // This is a simple approach - for more precision, use a continued fraction algorithm
      const precision = 100; // Precision factor
      const ratioValue = Math.round(settings.customAspectRatio * precision);
      
      // Find GCD of ratioValue and precision
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(ratioValue, precision);
      
      setNumerator(ratioValue / divisor);
      setDenominator(precision / divisor);
    }
  }, [settings.customAspectRatio]);
  
  // Update customAspectRatio when numerator/denominator change
  const updateCustomRatio = (num: number, denom: number) => {
    if (denom > 0) {
      const ratio = num / denom;
      updateSetting('customAspectRatio', ratio);
    }
  };
  
  // Profile store
  const {
    selectedProfile, setSelectedProfile,
    setShowProfileDialog,
  } = useProfileStore();
  
  const currentTask = useTaskStore(state => {
    const tasks = Object.values(state.tasks);
    return tasks.find(task => task.status === 'in_progress');
  });
  
  const handleCropAllClick = async () => {
    console.log('Cropping all images...');
    try {
      await useCropperStore.getState().cropAllImages();
    } catch (err: any) {
      console.error('Failed to crop all images:', err);
    }
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    useImageStore.getState().addImages(files);
  };

  const isCropping = !!currentTask && currentTask.status === 'in_progress';

  // Using the new type-based approach for aspect ratio modes
  const handleAspectRatioModeChange = (mode: 'free' | 'standard' | 'custom') => {
    console.log('aspect ratio mode changed to', mode);
    updateSetting('aspectRatioMode', mode);
    
    if (mode === 'standard' || mode === 'custom') {
      // Standard or custom ratio mode - lock aspect ratio
      updateSetting('aspectRatioLocked', true);
    } else {
      // Free mode - unlock aspect ratio
      updateSetting('aspectRatioLocked', false);
    }
  };

  return (
    <div className="sticky top-4 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
      {/* Upload */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">📤 Upload Images</h2>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:hover:file:bg-blue-700 dark:file:bg-blue-900 dark:file:text-gray-200 dark:file:border-gray-600 dark:hover:file:text-gray-100"
          />
      </div>

      {/* Crop Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">⚙️ Settings</h2>
        
        {/* Profiles */}
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">Profile</label>
          <div className="flex gap-2">
            <select
              value={selectedProfile || ''}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
            >
              <option key="custom" value="">Custom</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowProfileDialog(true)}
              className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors shadow-sm"
            >
              Save
            </button>
          </div>
        </div>

        {/* Dimensions */}
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">Dimensions</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-600 dark:text-gray-400 text-sm mb-1">Min Width</label>
              <input
                type="number"
                value={settings.minWidth}
                onChange={(e) => updateSetting('minWidth', Number(e.target.value))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-400 text-sm mb-1">Max Width</label>
              <input
                type="number"
                value={settings.maxWidth}
                onChange={(e) => updateSetting('maxWidth', Number(e.target.value))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-400 text-sm mb-1">Min Height</label>
              <input
                type="number"
                value={settings.minHeight}
                onChange={(e) => updateSetting('minHeight', Number(e.target.value))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-400 text-sm mb-1">Max Height</label>
              <input
                type="number"
                value={settings.maxHeight}
                onChange={(e) => updateSetting('maxHeight', Number(e.target.value))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
              />
            </div>
          </div>
        </div>

        {/* Filename Options */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-gray-700 dark:text-gray-300 font-bold">Filename Options</label>
          </div>
          <div className="flex items-center">

            <label htmlFor="appendResolution" className="text-gray-600 dark:text-gray-400 text-sm flex-1">
              Append resolution to filenames
            </label>

            <Switch
              id="appendResolution"
              checked={settings.appendResolution}
              onCheckedChange={(value) => updateSetting('appendResolution', value)}
            />
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-gray-700 dark:text-gray-300 font-bold">Aspect Ratio</label>
            <div className="flex items-center">
              <label htmlFor="lockAspectRatio" className="text-gray-600 dark:text-gray-400 text-sm flex-1 pr-2">Lock</label>
              <Switch
                id="lockAspectRatio"
                checked={settings.aspectRatioLocked}
                onCheckedChange={(value) => updateSetting('aspectRatioLocked', value)}
              />
            </div>
          </div>
          <RadioGroup defaultValue='free' value={settings.aspectRatioMode} onValueChange={(value) => updateSetting('aspectRatioMode', value)}>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <RadioGroupItem value="free" />
              <label htmlFor="free" className="text-gray-900 dark:text-gray-100 font-bold text-sm">Free</label>
            </div>

            <div className="flex items-center gap-3">
              <RadioGroupItem value="standard" />
              <label htmlFor="standard" className="text-gray-900 dark:text-gray-100 font-bold text-sm">Standard Ratio</label>
            </div>
            
            {settings.aspectRatioMode === 'standard' && (
              <select
                value={settings.standardAspectRatio}
                onChange={(e) => updateSetting('standardAspectRatio', e.target.value)}
                className="w-full p-1 border-2 border-gray-700 dark:border-gray-300 rounded text-sm"
              >
                <option key="1:1" value="1:1">Square (1:1)</option>
                <option key="16:9" value="16:9">Widescreen (16:9)</option>
                <option key="4:3" value="4:3">Standard (4:3)</option>
                <option key="3:2" value="3:2">Photo (3:2)</option>
                <option key="9:16" value="9:16">Portrait (9:16)</option>
                <option key="2:3" value="2:3">Portrait Photo (2:3)</option>
                <option key="21:9" value="21:9">Ultrawide (21:9)</option>
              </select>
            )}

            <div className="flex items-center gap-3">
              <RadioGroupItem value="custom" />
              <label htmlFor="custom" className="text-gray-900 dark:text-gray-100 font-bold text-sm">Custom Ratio</label>
            </div>

            {settings.aspectRatioMode === 'custom' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-gray-900 dark:text-gray-100 text-xs mb-1">Aspect Ratio</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={numerator}
                      onChange={(e) => {
                        const num = Math.max(1, parseInt(e.target.value) || 1);
                        setNumerator(num);
                        updateCustomRatio(num, denominator);
                      }}
                      className="w-1/2 p-1 border-2 border-gray-700 dark:border-gray-300 rounded text-sm"
                    />
                    <span className="text-gray-900 dark:text-gray-100">:</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={denominator}
                      onChange={(e) => {
                        const denom = Math.max(1, parseInt(e.target.value) || 1);
                        setDenominator(denom);
                        updateCustomRatio(numerator, denom);
                      }}
                      className="w-1/2 p-1 border-2 border-gray-700 dark:border-gray-300 rounded text-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Enter width:height (e.g., 16:9)</p>
                </div>
              </div>
            )}
          </div>

          </RadioGroup>

        </div>



      </div>

      <div className="space-y-4">
        <Button
          size="lg"
          onClick={handleCropAllClick}
          className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors shadow-sm"
          disabled={uploadedFiles.length === 0 || isCropping}
        >
          {isCropping ? '✂️ Processing...' : '✂️ Crop All Images'}
        </Button>
        
        {/* Use the ProgressDisplay component for task progress */}
        {currentTask && <ProgressDisplay taskId={currentTask.id} className="mt-2" />}

        {uploadedFiles.length > 0 && (
          <Button
            size="lg"
            onClick={downloadAllCroppedImages}
            className="w-full bg-green-400 hover:bg-green-500 dark:bg-green-600 dark:hover:bg-green-700 text-gray-900 dark:text-white font-bold py-3 px-4 border-2 border-gray-700 dark:border-gray-300 rounded text-base"
          >
            💾 Download All Images
          </Button>
        )}
      </div>

    </div>
  );
}

