import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useCropItem } from '../hooks/useCropItem';

interface ImageCropperTabProps {
  file: File;
  index: number;
}

export function ImageCropperTab({ file, index }: ImageCropperTabProps) {

  const {
    imageSrc,
    cropperRef,
    // cropFrameDimensions,
    // actualCropDimensions,
    // outputDimensions,
    // imageScale,
    // qualityWarning,
    // qualityCritical,
    // qualityRatio
  } = useCropItem({ file, index });
  
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div 
          className="bg-background dark:bg-background rounded-lg overflow-hidden"
          style={{ height: '600px', maxWidth: '100%' }}
        >
          {imageSrc && (
            <img
              ref={cropperRef}
              src={imageSrc}
              alt={`Image ${index + 1}`}
              style={{ display: 'block', maxWidth: '100%' }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}