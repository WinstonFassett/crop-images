import { useState } from 'react';
import { useProfileStore } from '../store/useProfileStore';

export function GenerateProfilesDialog() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const setShowPromptDialog = useProfileStore(state => state.setShowPromptDialog);
  const generateProfiles = useProfileStore(state => state.generateProfiles);
  
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      await generateProfiles(prompt);
      setShowPromptDialog(false);
    } catch (error) {
      console.error('Error generating profiles:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🤖 AI Profile Generator</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Describe the types of crops you need, and AI will generate appropriate profiles.
          </p>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">
              Describe what you need
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: I need profiles for social media posts including Instagram square, Facebook cover, Twitter header, and Pinterest tall images."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 h-32"
            />
          </div>
          
          <div className="bg-yellow-50 dark:bg-gray-800 p-3 rounded-lg mb-4">
            <h3 className="font-bold text-yellow-800 dark:text-yellow-400 text-sm">Tips for good results:</h3>
            <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1 mt-1">
              <li>Specify the purpose (social media, print, web)</li>
              <li>Mention specific platforms or formats</li>
              <li>Include aspect ratios if you know them</li>
              <li>Describe any size constraints</li>
            </ul>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={() => setShowPromptDialog(false)}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Generate Profiles'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
