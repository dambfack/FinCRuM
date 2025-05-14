
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

// Temporarily simplified getCroppedImg for debugging - rotation removed
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Crop
): Promise<string | null> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = (err) => {
      console.error("[getCroppedImg] Image load error:", err);
      reject(err);
    };
  });

  console.log("[getCroppedImg] Received pixelCrop:", JSON.parse(JSON.stringify(pixelCrop)));
  console.log("[getCroppedImg] Image natural WxH:", image.naturalWidth, image.naturalHeight);

  if (!pixelCrop.width || !pixelCrop.height || image.naturalWidth === 0 || image.naturalHeight === 0) {
    console.error("[getCroppedImg] pixelCrop width/height is zero/undefined, or image natural dimensions are zero.");
    return null;
  }

  // Ensure x and y are numbers, default to 0 if undefined (though they should be defined by PixelCrop)
  const sx = typeof pixelCrop.x === 'number' ? pixelCrop.x : 0;
  const sy = typeof pixelCrop.y === 'number' ? pixelCrop.y : 0;
  const sWidth = pixelCrop.width;
  const sHeight = pixelCrop.height;

  // Clamp source coordinates and dimensions to be within the image bounds
  const clampedSx = Math.max(0, sx);
  const clampedSy = Math.max(0, sy);
  const clampedSWidth = Math.min(sWidth, image.naturalWidth - clampedSx);
  const clampedSHeight = Math.min(sHeight, image.naturalHeight - clampedSy);

  if (clampedSWidth <= 0 || clampedSHeight <= 0) {
    console.error("[getCroppedImg] Clamped source width or height is zero or less.");
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = clampedSWidth; // Canvas size should match the actual source width/height being drawn
  canvas.height = clampedSHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error("[getCroppedImg] Failed to get canvas context.");
    return null;
  }

  console.log(
    "[getCroppedImg] Drawing with clamped params:",
    "sx:", clampedSx,
    "sy:", clampedSy,
    "sWidth:", clampedSWidth,
    "sHeight:", clampedSHeight,
    "dx: 0, dy: 0, dWidth:", canvas.width,
    "dHeight:", canvas.height
  );

  ctx.drawImage(
    image,
    clampedSx,      // sourceX
    clampedSy,      // sourceY
    clampedSWidth,  // sourceWidth
    clampedSHeight, // sourceHeight
    0,              // destinationX on canvas
    0,              // destinationY on canvas
    canvas.width,   // destinationWidth on canvas
    canvas.height   // destinationHeight on canvas
  );

  return canvasToDataURL(canvas);
}


const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCropSave,
  aspectRatio = 1 / 1,
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [scale, setScale] = useState(1);
  // const [rotate, setRotate] = useState(0); // Rotation temporarily removed for debugging
  const imgRef = useRef<HTMLImageElement | null>(null);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
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
    setCompletedCrop(null);
  };

  const handleCropImage = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !imageSrc) {
      console.error('[ImageCropperModal] Crop details, image ref, or image source missing. CompletedCrop:', completedCrop, "ImageRef:", imgRef.current, "ImageSrc:", !!imageSrc);
      return;
    }
    console.log("[ImageCropperModal] handleCropImage | completedCrop to be used:", JSON.parse(JSON.stringify(completedCrop)));
    console.log("[ImageCropperModal] handleCropImage | imageSrc length:", imageSrc.length);

    try {
      // Call simplified getCroppedImg (rotation temporarily removed from signature)
      const croppedImageUrl = await getCroppedImg(imageSrc, completedCrop);
      if (croppedImageUrl) {
        onCropSave(croppedImageUrl);
        onClose();
      } else {
        console.error('[ImageCropperModal] Failed to crop image - getCroppedImg returned null.');
      }
    } catch (e) {
      console.error('[ImageCropperModal] Error cropping image:', e);
    }
  }, [completedCrop, imageSrc, /*rotate,*/ scale, onCropSave, onClose]); // rotate removed from deps


  const dialogContentClassName = "sm:max-w-lg glass-effect bg-card/90 dark:bg-card/80";

  useEffect(() => {
    if (!isOpen) {
      setCrop(undefined);
      setCompletedCrop(null);
      setScale(1);
      // setRotate(0);
      imgRef.current = null;
    } else if (imageSrc) {
      setCrop(undefined);
      setCompletedCrop(null);
      setScale(1);
      // setRotate(0);
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
                onComplete={(c) => {
                  if (imgRef.current) {
                    console.log("[ImageCropperModal] ReactCrop onComplete | c (PercentCrop):", JSON.parse(JSON.stringify(c)));
                    console.log("[ImageCropperModal] ReactCrop onComplete | naturalWidth:", imgRef.current.naturalWidth, "naturalHeight:", imgRef.current.naturalHeight);
                    const pixelCrop = convertToPixelCrop(
                      c,
                      imgRef.current.naturalWidth,
                      imgRef.current.naturalHeight
                    );
                    console.log("[ImageCropperModal] ReactCrop onComplete | resulting pixelCrop (PixelCrop):", JSON.parse(JSON.stringify(pixelCrop)));
                    setCompletedCrop(pixelCrop);
                  }
                }}
                aspect={aspectRatio}
                className="max-w-full max-h-full"
                minWidth={50}
                minHeight={50}
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imageSrc}
                  // Rotation temporarily removed from style for debugging
                  style={{ transform: `scale(${scale})`, transformOrigin: 'center center', maxHeight: '45vh' }}
                  onLoad={onImageLoad}
                  className="object-contain"
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
            {/* Rotation slider temporarily removed
            <div>
              <Label htmlFor="rotate-slider" className="text-sm">Rotate</Label>
              <Slider
                id="rotate-slider"
                min={0}
                max={360}
                step={1}
                value={[rotate]}
                onValueChange={(value) => setRotate(value[0])}
                className="mt-2"
              />
            </div>
            */}
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

