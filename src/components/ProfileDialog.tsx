import { useState } from 'react';
import { useProfileStore } from '../store/useProfileStore';
import type { CropSettings } from '../store/useProfileStore';
import { useSettingsStore } from '../store/useSettingsStore';

interface ProfileDialogProps {
  profiles: any[];
}

export function ProfileDialog({ profiles }: ProfileDialogProps) {
  const [newProfileName, setNewProfileName] = useState('');
  
  // Profile store
  const {
    selectedProfile, setSelectedProfile,
    setShowProfileDialog,
    setShowPromptDialog,
    editingProfile, setEditingProfile,
    editingProfileName, setEditingProfileName,
    saveProfile,
    createProfile,
    deleteProfile,
    renameProfile,
    clearAllProfiles
  } = useProfileStore();
  
  // Settings store
  const getCurrentSettings = useSettingsStore(state => state.getCurrentSettings);
  
  const handleSaveProfile = () => {
    if (newProfileName.trim()) {
      saveProfile(newProfileName, getCurrentSettings());
      setNewProfileName('');
    }
  };
  
  const handleCreateProfile = () => {
    if (newProfileName.trim()) {
      createProfile(newProfileName);
      setNewProfileName('');
    }
  };
  
  const handleRenameProfile = (profileId: string) => {
    if (editingProfileName.trim()) {
      renameProfile(profileId, editingProfileName);
      setEditingProfile(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">📋 Crop Profiles</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage reusable cropping profiles to maintain consistency across multiple images.
          </p>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Create New Profile */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Create New Profile</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Profile name"
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={handleSaveProfile}
                disabled={!newProfileName.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                Save Current Settings
              </button>
              <button
                onClick={handleCreateProfile}
                disabled={!newProfileName.trim()}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                Create Empty
              </button>
            </div>
          </div>
          
          {/* AI Profile Generation */}
          <div className="mb-6 p-4 bg-purple-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">AI Profile Generation</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Let AI generate crop profiles based on your description.
            </p>
            <button
              onClick={() => setShowPromptDialog(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded w-full"
            >
              Generate Profiles with AI
            </button>
          </div>
          
          {/* Profile List */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Your Profiles</h3>
            {profiles.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 italic">No profiles created yet.</p>
            ) : (
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <div
                    key={profile._id}
                    className={`p-3 rounded-lg border ${
                      selectedProfile === profile._id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      {editingProfile === profile._id ? (
                        <div className="flex gap-2 flex-1">
                          <input
                            type="text"
                            value={editingProfileName}
                            onChange={(e) => setEditingProfileName(e.target.value)}
                            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameProfile(profile._id)}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingProfile(null)}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 dark:text-gray-100">{profile.name}</h4>
                            {profile.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">{profile.description}</p>
                            )}
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {profile.settings.locked && (
                                <span className="mr-2">
                                  Aspect: {profile.settings.aspectRatio}
                                </span>
                              )}
                              <span>
                                Min: {profile.settings.minWidth}×{profile.settings.minHeight}
                              </span>
                              <span className="mx-1">|</span>
                              <span>
                                Max: {profile.settings.maxWidth}×{profile.settings.maxHeight}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setSelectedProfile(profile._id);
                                setShowProfileDialog(false);
                              }}
                              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm"
                            >
                              Apply
                            </button>
                            <button
                              onClick={() => {
                                setEditingProfile(profile._id);
                                setEditingProfileName(profile.name);
                              }}
                              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded text-sm"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => deleteProfile(profile._id)}
                              className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {profiles.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={clearAllProfiles}
                  className="text-red-500 hover:text-red-600 text-sm font-bold"
                >
                  Delete All Profiles
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={() => setShowProfileDialog(false)}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
