import { create } from 'zustand';
import { fireproof } from 'use-fireproof';
import { callAI } from 'call-ai';
// Define CropSettings interface directly here to avoid circular dependencies
export interface CropSettings {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  aspectRatio: string;
  locked: boolean;
  customNumerator: number;
  customDenominator: number;
  isCustomRatio: boolean;
  targetWidth: string;
  targetHeight: string;
  useTargetDimensions: boolean;
}

interface ProfileStore {
  // State
  selectedProfile: string;
  showProfileDialog: boolean;
  showPromptDialog: boolean;
  currentPrompt: string;
  editingProfile: string | null;
  editingProfileName: string;
  
  // Actions
  setSelectedProfile: (profileId: string) => void;
  setShowProfileDialog: (show: boolean) => void;
  setShowPromptDialog: (show: boolean) => void;
  setCurrentPrompt: (prompt: string) => void;
  setEditingProfile: (profileId: string | null) => void;
  setEditingProfileName: (name: string) => void;
  
  // Database operations
  saveProfile: (name: string, settings: CropSettings) => Promise<void>;
  createProfile: (name: string) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  renameProfile: (profileId: string, newName: string) => Promise<void>;
  clearAllProfiles: () => Promise<void>;
  generateProfiles: (prompt: string) => Promise<void>;
}

// We'll initialize the database inside the methods when needed
export const useProfileStore = create<ProfileStore>((set, get) => {
  
  return {
    // Initial state
    selectedProfile: "",
    showProfileDialog: false,
    showPromptDialog: false,
    currentPrompt: "",
    editingProfile: null,
    editingProfileName: "",
    
    // Actions
    setSelectedProfile: (profileId) => set({ selectedProfile: profileId }),
    setShowProfileDialog: (show) => set({ showProfileDialog: show }),
    setShowPromptDialog: (show) => set({ showPromptDialog: show }),
    setCurrentPrompt: (prompt) => set({ currentPrompt: prompt }),
    setEditingProfile: (profileId) => set({ editingProfile: profileId }),
    setEditingProfileName: (name) => set({ editingProfileName: name }),
    
    // Database operations
    saveProfile: async (name, settings) => {
      const { selectedProfile } = get();
      const database = fireproof("image-cropper");
      
      const profileData = {
        type: "crop-profile",
        name: name.trim(),
        settings,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      if (selectedProfile) {
        // Update existing profile
        await database.put({ ...profileData, _id: selectedProfile });
      } else {
        // Create new profile
        const result = await database.put(profileData);
        set({ selectedProfile: result.id });
      }
    },
    
    createProfile: async (name) => {
      const database = fireproof("image-cropper");
      
      const profileData = {
        type: "crop-profile",
        name: name.trim(),
        settings: {
          minWidth: 100,
          maxWidth: 2000,
          minHeight: 100,
          maxHeight: 2000,
          aspectRatio: "1:1",
          locked: false,
          customNumerator: 1,
          customDenominator: 1,
          isCustomRatio: false,
          targetWidth: "",
          targetHeight: "",
          useTargetDimensions: false
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await database.put(profileData);
    },
    
    deleteProfile: async (profileId) => {
      if (confirm('Are you sure you want to delete this profile?')) {
        const database = fireproof("image-cropper");
        
        await database.del(profileId);
        
        // Clear selected profile if it was deleted
        if (get().selectedProfile === profileId) {
          set({ selectedProfile: "" });
        }
      }
    },
    
    renameProfile: async (profileId, newName) => {
      try {
        const database = fireproof("image-cropper");
        
        const profile = await database.get(profileId);
        if (profile) {
          await database.put({
            ...profile,
            name: newName.trim(),
            updatedAt: Date.now()
          });
        }
      } catch (error) {
        console.error("Error renaming profile:", error);
      }
    },
    
    clearAllProfiles: async () => {
      if (confirm('Are you sure you want to delete ALL profiles? This cannot be undone.')) {
        try {
          const database = fireproof("image-cropper");
          
          const result = await database.query("type", { key: "crop-profile" });
          for (const profile of result.docs) {
            await database.del(profile._id);
          }
          set({ selectedProfile: "" });
        } catch (error) {
          console.error("Error clearing profiles:", error);
        }
      }
    },
    
    generateProfiles: async (prompt) => {
      set({ showPromptDialog: false });
      
      try {
        const database = fireproof("image-cropper");
        
        const generator = await callAI(prompt, {
          stream: true,
          schema: {
            properties: {
              profiles: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    aspectRatio: { type: "string" },
                    minWidth: { type: "number" },
                    maxWidth: { type: "number" },
                    minHeight: { type: "number" },
                    maxHeight: { type: "number" },
                    locked: { type: "boolean" },
                    description: { type: "string" }
                  }
                }
              }
            }
          }
        });

        let finalResponse = "";
        for await (const chunk of generator) {
          finalResponse = chunk;
        }

        try {
          const data = JSON.parse(finalResponse);
          for (const profile of data.profiles) {
            // Don't use fallback defaults - if fields are missing, let them be missing
            const settings = profile.settings || {};
            
            await database.put({
              type: "crop-profile",
              name: profile.name,
              settings,
              description: profile.description,
              createdAt: Date.now()
            });
          }
        } catch (error) {
          console.error("Error parsing profile data:", error);
        }
      } catch (error) {
        console.error("Error generating profiles:", error);
      }
    }
  };
});
