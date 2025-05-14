
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
  pixelCrop: Crop,
  rotation = 0
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

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  ctx.save();
  ctx.translate(pixelCrop.width / 2, pixelCrop.height / 2);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.scale(1, 1); // Assuming no scaling for simplicity, zoom handled by crop dimensions
  ctx.translate(-image.width / 2, -image.height / 2);

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
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
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0); // Rotation not yet implemented in UI
  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null); // For previewing, not strictly needed for save

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90, // Initial crop selection width
        },
        aspectRatio,
        width,
        height
      ),
      width,
      height
    );
    setCrop(newCrop);
    setCompletedCrop(convertToPixelCrop(newCrop, width, height));
  };

  const handleCropImage = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !imageSrc) {
      console.error('Crop details or image source missing.');
      return;
    }

    try {
      const croppedImageUrl = await getCroppedImg(imageSrc, completedCrop, rotate);
      if (croppedImageUrl) {
        onCropSave(croppedImageUrl);
        onClose();
      } else {
        console.error('Failed to crop image.');
      }
    } catch (e) {
      console.error('Error cropping image:', e);
    }
  }, [completedCrop, imageSrc, rotate, onCropSave, onClose]);

  // Effect to draw preview (optional, but good for UX)
  useEffect(() => {
    if (!completedCrop || !previewCanvasRef.current || !imgRef.current || !imageSrc) {
      return;
    }
    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const crop = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio);
    ctx.scale(pixelRatio, pixelRatio);
    
    const currentScale = scale; // Use the scale from state

    ctx.imageSmoothingQuality = 'high';

    ctx.save();
    ctx.translate(crop.width / 2, crop.height / 2);
    ctx.rotate(rotate * Math.PI / 180);
    ctx.scale(currentScale, currentScale);
    ctx.translate(-crop.width / 2, -crop.height / 2); // Adjusted translate after scale
    
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );
    ctx.restore();

  }, [completedCrop, imageSrc, scale, rotate]);


  const dialogContentClassName = "sm:max-w-lg glass-effect bg-card/90 dark:bg-card/80";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={dialogContentClassName}>
        <DialogHeader>
          <DialogTitle className="font-heading tracking-wide">Crop Image</DialogTitle>
          <DialogDescription>Adjust the selection to crop your image. Current aspect ratio: {aspectRatio === 1 ? '1:1 (Square)' : aspectRatio.toFixed(2)}.</DialogDescription>
        </DialogHeader>
        
        {imageSrc && (
          <div className="my-4 space-y-4">
            <div className="flex justify-center items-center max-h-[50vh] overflow-hidden rounded-md border">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => {
                    if (imgRef.current) {
                        setCompletedCrop(convertToPixelCrop(c, imgRef.current.width, imgRef.current.height));
                    }
                }}
                aspect={aspectRatio}
                className="max-w-full max-h-full"
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imageSrc}
                  style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
                  onLoad={onImageLoad}
                  className="object-contain"
                />
              </ReactCrop>
            </div>
            <div>
              <Label htmlFor="zoom-slider">Zoom</Label>
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
            {/* Optional Preview - can be complex to get perfect */}
            {/* {completedCrop && (
              <div className="mt-4">
                <p className="text-sm font-medium">Preview:</p>
                <canvas
                  ref={previewCanvasRef}
                  className="mt-2 border rounded-md"
                  style={{
                    objectFit: 'contain',
                    width: completedCrop.width,
                    height: completedCrop.height,
                  }}
                />
              </div>
            )} */}
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
