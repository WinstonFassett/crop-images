# Branch Comparison Report: add-shad vs last-good

## Overview

This report compares the current `add-shad` branch with the `last-good` branch to identify missing functionality and regressions. The codebase has undergone significant architectural changes, moving from a monolithic component to a more modular structure with stores and hooks.

## Missing Functionality

### 1. Profile Override Dropdown

**Status: Missing**

In the `last-good` branch, each image item had a dropdown to override the default profile:

```javascript
<select
  value={imageProfiles[index] || 'default'}
  onChange={(e) => handleProfileChange(index, e.target.value)}
  className="p-1 border-2 border-[#242424] rounded text-sm bg-[#ffffff]"
>
  <option value="default">Use Settings</option>
  {cropProfiles.map((profile) => (
    <option key={profile._id} value={profile._id}>
      {profile.name}
    </option>
  ))}
</select>
```

While the backend functionality exists in `useSettingsStore` (`imageProfiles` state and `setImageProfile` function), the UI component is missing from the `ImageItem.tsx` component.

### 2. Filename Editing UX

**Status: Degraded**

The `last-good` branch had a more intuitive filename editing experience:
- Clicking directly on the filename would enable editing
- The filename was displayed prominently with a larger font size
- The editing state was visually distinct

Current implementation requires clicking a separate edit button (✏️) and has less prominent styling.

### 3. Crop Statistics Display

**Status: Fixed**

In the `last-good` branch, crop statistics were consistently displayed for both the cropping view and the result view:
- Original dimensions
- Cropped dimensions
- Aspect ratio
- Size delta

Issues in the current branch (now fixed):
- Stats were only shown while actively cropping (fixed by modifying CropInfoDisplay to get data directly from stores)
- The `CropInfoDisplay` component in the result tab wasn't receiving necessary props (fixed by simplifying the component API)
- Some stats were commented out (fixed by uncommenting the crop ready indicator)
- Scale display now shows a consistent value

### 4. "Download All Images" Functionality

**Status: Missing Implementation**

The button exists in `SettingsPanel.tsx` but the implementation is missing:

```javascript
const downloadAllCroppedImages = async () => {
  console.log('Downloading all images...');
  
  // Implementation will be added later
};
```

In the `last-good` branch, this functionality was fully implemented.

## Architectural Changes

The application has been significantly refactored:

1. **Component Structure**:
   - From: Monolithic `ImageCropperPrototype.tsx`
   - To: Modular components (`ImageItem`, `ImageCropperTab`, `ImageResultTab`)

2. **State Management**:
   - From: Component state with React hooks
   - To: Zustand stores (`useImageStore`, `useProfileStore`, `useSettingsStore`, `useCropperStore`)

3. **Logic Separation**:
   - From: Logic embedded in components
   - To: Custom hooks (`useCropItem`, `useCroppedImage`)

4. **UI Framework**:
   - From: Custom styled components
   - To: Shadcn UI components (e.g., Card, CardContent)

## Recommendations

### 1. Add Profile Override Dropdown

Add the profile override dropdown back to the `ImageItem.tsx` component:

```jsx
<div className="flex items-center gap-2 mt-2">
  <label className="text-sm text-gray-600 dark:text-gray-400">Profile:</label>
  <select
    value={useSettingsStore.getState().imageProfiles[index] || 'default'}
    onChange={(e) => useSettingsStore.getState().setImageProfile(index, e.target.value)}
    className="p-1 border border-gray-300 dark:border-gray-600 rounded text-sm"
  >
    <option value="default">Use Settings</option>
    {profiles.map((profile) => (
      <option key={profile._id} value={profile._id}>
        {profile.name}
      </option>
    ))}
  </select>
</div>
```

### 2. Improve Filename Editing UX

Enhance the filename editing experience in `ImageItem.tsx`:

```jsx
{isEditing ? (
  <input
    type="text"
    value={imageNames[index] || file.name}
    onChange={(e) => setImageName(index, e.target.value)}
    onBlur={() => setEditingName(null)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') setEditingName(null);
    }}
    autoFocus
    className="w-full p-1 text-lg font-medium border border-blue-500 rounded"
  />
) : (
  <h3 
    className="text-lg font-medium cursor-pointer hover:underline"
    onClick={() => setEditingName(index)}
    title="Click to edit filename"
  >
    {displayName}
  </h3>
)}
```

### 3. Fix Crop Statistics Display

Update the `ImageResultTab.tsx` to pass all necessary props to `CropInfoDisplay`:

```jsx
<CropInfoDisplay 
  imageIndex={index}
  cropFrameDimensions={croppedDimensions}
  actualCropDimensions={croppedDimensions}
  outputDimensions={croppedDimensions}
/>
```

Uncomment the crop ready indicator in `CropInfoDisplay.tsx`:

```jsx
{cropResult && (
  <span className="text-green-500">✓ Crop ready</span>
)}
```

### 4. Implement "Download All Images" Functionality

Add implementation for the `downloadAllCroppedImages` function in `SettingsPanel.tsx`:

```javascript
const downloadAllCroppedImages = async () => {
  console.log('Downloading all images...');
  
  const { uploadedFiles, croppedImages, imageNames } = useImageStore.getState();
  
  // Check if we have any cropped images
  if (Object.keys(croppedImages).length === 0) {
    alert('No cropped images available to download');
    return;
  }
  
  // For each image, trigger download
  uploadedFiles.forEach((fileData, index) => {
    if (!croppedImages[index]) return;
    
    const link = document.createElement('a');
    link.href = croppedImages[index].url;
    
    // Use custom name if available
    const originalName = fileData.name;
    const extension = originalName.substring(originalName.lastIndexOf('.'));
    const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
    
    const customName = imageNames[index];
    const fileName = customName 
      ? (customName.includes('.') ? customName : customName + extension)
      : `${baseName}-cropped${extension}`;
    
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Small delay between downloads to avoid browser issues
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  });
};
```

## Conclusion

The current `add-shad` branch has made significant architectural improvements but has lost some key functionality from the `last-good` branch. Implementing the recommendations above will restore the missing features while maintaining the benefits of the new architecture.
