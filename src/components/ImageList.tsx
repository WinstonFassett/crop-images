import { useImageStore } from '../store/useImageStore';
import { ImageItem } from './ImageItem';

interface ImageListProps {
  profiles: any[];
}

export function ImageList({ profiles }: ImageListProps) {

  const uploadedFiles = useImageStore(state => state.uploadedFiles);
  const removeImage = useImageStore(state => state.removeImage);
  const editingName = useImageStore(state => state.editingName);
  const setEditingName = useImageStore(state => state.setEditingName);
  const imageNames = useImageStore(state => state.imageNames);
  const setImageName = useImageStore(state => state.setImageName);

  if (uploadedFiles.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-8 shadow-md text-center">
        <div className="text-6xl mb-4">📷</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Images Uploaded</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Upload some images to get started with cropping.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 italic">
          Supported formats: JPG, PNG, WebP, GIF
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md space-y-4">
      {uploadedFiles.map((file, index) => (
        <ImageItem
          key={index}
          file={file}
          index={index}
          profiles={profiles}
          imageNames={imageNames}
          editingName={editingName}
          setEditingName={setEditingName}
          setImageName={setImageName}
          removeImage={removeImage}
        />
      ))}
    </div>
  );
}