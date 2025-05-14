
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, convertToPixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onCropSave: (croppedImage: string) => void;
  aspectRatio?: number; // e.g., 1 for square, 16/9 for landscape
}

// Helper function to create a data URL from a canvas
function canvasToDataURL(canvas: HTMLCanvasElement, mimeType = 'image/png', quality = 0.9) {
  return canvas.toDataURL(mimeType, quality);
}

// Helper to get cropped image
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Crop, // This is the PixelCrop relative to ORIGINAL image dimensions
  rotation = 0,
  uiZoomScale = 1 // Renamed to uiZoomScale to avoid confusion; this is from the UI zoom slider
): Promise<string | null> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Since pixelCrop is already in terms of the original image's pixels (due to how it's generated
  // using convertToPixelCrop with naturalWidth/Height), we use its coordinates directly.
  // The uiZoomScale affects the display in the cropper but not these absolute coordinates.
  const sourceX = pixelCrop.x;
  const sourceY = pixelCrop.y;
  const sourceWidth = pixelCrop.width;
  const sourceHeight = pixelCrop.height;

  // Ensure source dimensions don't exceed natural image dimensions (safety clamping)
  const clampedSourceX = Math.max(0, sourceX);
  const clampedSourceY = Math.max(0, sourceY);
  const clampedSourceWidth = Math.min(image.naturalWidth - clampedSourceX, sourceWidth);
  const clampedSourceHeight = Math.min(image.naturalHeight - clampedSourceY, sourceHeight);

  ctx.save();
  // Translate and rotate around the center of the destination canvas
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rotation * Math.PI / 180);
  
  // Draw the source rectangle (from original image) onto the destination canvas
  ctx.drawImage(
    image,
    clampedSourceX,
    clampedSourceY,
    clampedSourceWidth,
    clampedSourceHeight,
    -canvas.width / 2, 
    -canvas.height / 2,
    canvas.width,
    canvas.height
  );
  
  ctx.restore();

  return new Promise((resolve) => {
    resolve(canvasToDataURL(canvas));
  });
}


const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCropSave,
  aspectRatio = 1 / 1, // Default to 1:1 square
}) => {
  const [crop, setCrop] = useState<Crop>(); // Will be in percentage
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null); // Will be in pixels relative to original image
  const [scale, setScale] = useState(1); // UI Zoom scale
  const [rotate, setRotate] = useState(0); 
  const imgRef = useRef<HTMLImageElement | null>(null);
  
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
    const { naturalWidth, naturalHeight } = e.currentTarget; // Use natural dimensions
    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%', // Work with percentages for the crop state
          width: 90, 
        },
        aspectRatio,
        naturalWidth,
        naturalHeight
      ),
      naturalWidth,
      naturalHeight
    );
    setCrop(newCrop);
    setCompletedCrop(null); // Reset completedCrop on new image load
  };

  const handleCropImage = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !imageSrc) {
      console.error('Crop details or image source missing. CompletedCrop:', completedCrop, "ImageRef:", imgRef.current, "ImageSrc:", !!imageSrc);
      return;
    }

    try {
      // Pass the UI scale to getCroppedImg, though it's not used for source coordinate calculation if completedCrop is absolute
      const croppedImageUrl = await getCroppedImg(imageSrc, completedCrop, rotate, scale);
      if (croppedImageUrl) {
        onCropSave(croppedImageUrl);
        onClose(); 
      } else {
        console.error('Failed to crop image.');
      }
    } catch (e) {
      console.error('Error cropping image:', e);
    }
  }, [completedCrop, imageSrc, rotate, scale, onCropSave, onClose]);


  const dialogContentClassName = "sm:max-w-lg glass-effect bg-card/90 dark:bg-card/80";

  // Reset state when modal is closed or imageSrc changes
  useEffect(() => {
    if (!isOpen) {
      setCrop(undefined);
      setCompletedCrop(null);
      setScale(1);
      setRotate(0);
      imgRef.current = null;
    } else if (imageSrc) {
      // If modal opens with a new image, we want onImageLoad to fire
      // This is usually handled by the img src change triggering onLoad
      // But resetting crop state here ensures clean state for new image
      setCrop(undefined);
      setCompletedCrop(null);
      setScale(1);
      setRotate(0);
    }
  }, [isOpen, imageSrc]);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            onClose();
        }
    }}>
      <DialogContent className={dialogContentClassName}>
        <DialogHeader>
          <DialogTitle className="font-heading tracking-wide">Crop Image</DialogTitle>
          <DialogDescription>Adjust the selection to crop your image. Aspect ratio: {aspectRatio === 1 ? '1:1 (Square)' : aspectRatio.toFixed(2)}.</DialogDescription>
        </DialogHeader>
        
        {imageSrc && (
          <div className="my-4 space-y-4">
            <div className="flex justify-center items-center max-h-[50vh] overflow-hidden rounded-md border bg-black/10">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => { // c is the crop in percentages
                  if (imgRef.current) {
                      const pixelCrop = convertToPixelCrop(
                        c, // c is already in percentage, matching what makeAspectCrop unit:'%' created
                        imgRef.current.naturalWidth,
                        imgRef.current.naturalHeight
                      );
                      setCompletedCrop(pixelCrop);
                  }
                }}
                aspect={aspectRatio}
                className="max-w-full max-h-full"
                minWidth={50} 
                minHeight={50}
                // circularCrop={aspectRatio === 1 / 1} // Optionally make crop selection UI circular for 1:1
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imageSrc}
                  style={{ transform: `scale(${scale}) rotate(${rotate}deg)`, transformOrigin: 'center center', maxHeight: '45vh' }} // Added maxHeight to ensure it fits
                  onLoad={onImageLoad}
                  className="object-contain" // Use object-contain
                />
              </ReactCrop>
            </div>
            <div>
              <Label htmlFor="zoom-slider" className="text-sm">Zoom</Label>
              <Slider
                id="zoom-slider"
                min={0.5}
                max={3}
                step={0.01}
                value={[scale]}
                onValueChange={(value) => setScale(value[0])}
                className="mt-2"
              />
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose} className="h-11 px-4 py-3">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleCropImage} disabled={!completedCrop} className="h-11 px-4 py-3">
            Crop & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropperModal;
