import { useFireproof } from 'use-fireproof';
import { useProfileStore } from '../store/useProfileStore';
import { GenerateProfilesDialog } from './GenerateProfilesDialog';
import { ImageList } from './ImageList';
import { ProfileDialog } from './ProfileDialog';
import { SettingsPanel } from './SettingsPanel';
import { ThemeToggle } from './ThemeToggle';
import 'cropperjs/dist/cropper.css';

export default function ImageCropper() {

  const { useLiveQuery } = useFireproof("image-cropper");
  
  const showProfileDialog = useProfileStore(state => state.showProfileDialog);
  const showPromptDialog = useProfileStore(state => state.showPromptDialog);
  
  const { docs: cropProfiles = [] } = useLiveQuery("type", { 
    key: "crop-profile", 
    descending: true 
  }) || { docs: [] };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-50 transition-colors dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-10 pointer-events-none dark:opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255, 112, 166, 0.8) 2px, transparent 2px),
                           radial-gradient(circle at 80% 20%, rgba(255, 151, 112, 0.8) 2px, transparent 2px),
                           radial-gradient(circle at 40% 40%, rgba(233, 255, 112, 0.8) 2px, transparent 2px)`,
          backgroundSize: '60px 60px, 80px 80px, 100px 100px'
        }}></div>
      </div>

      {showProfileDialog && <ProfileDialog profiles={cropProfiles} />}

      {showPromptDialog && <GenerateProfilesDialog />}

      <div className="relative z-10 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-lg relative">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-4xl font-black mb-0 text-gray-900 dark:text-gray-100">Image Cropper</h1>
              </div>
              <ThemeToggle />
            </div>
          </div>
          {/* Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <SettingsPanel profiles={cropProfiles} />
            </div>
            <div className="md:col-span-3">
              <ImageList profiles={cropProfiles} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
