
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

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Crop,
  rotation = 0
): Promise<string | null> {
  const image = new Image();
  // This is important for cross-origin images if you ever use non-dataURI sources
  // image.crossOrigin = "anonymous"; 
  image.src = imageSrc;

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = (err) => {
      console.error("[getCroppedImg] Image load error:", err, "src:", imageSrc.substring(0, 100) + "...");
      reject(err);
    };
  });

  if (!pixelCrop.width || !pixelCrop.height || image.naturalWidth === 0 || image.naturalHeight === 0) {
    console.error("[getCroppedImg] Invalid pixelCrop or image dimensions. PixelCrop:", JSON.stringify(pixelCrop), "Natural WxH:", image.naturalWidth, image.naturalHeight);
    return null;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error("[getCroppedImg] Failed to get canvas 2D context.");
    return null;
  }

  // The pixelCrop is already in the image's original pixel coordinates relative to the un-transformed image
  const cropX = pixelCrop.x;
  const cropY = pixelCrop.y;
  const cropWidth = pixelCrop.width;
  const cropHeight = pixelCrop.height;

  canvas.width = cropWidth;
  canvas.height = cropHeight;

  const rad = rotation * Math.PI / 180;

  // Move the coordinate system to the center of the crop area for rotation
  ctx.translate(cropWidth / 2, cropHeight / 2);
  ctx.rotate(rad);
  
  // Draw the relevant part of the image onto the canvas
  // The source rectangle (sx, sy, sWidth, sHeight) is pixelCrop
  // The destination rectangle (dx, dy, dWidth, dHeight) is adjusted for rotation
  // and starts at (-cropWidth/2, -cropHeight/2) due to the translation
  ctx.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    -cropWidth / 2, // dx (draw starting from the new center point)
    -cropHeight / 2, // dy
    cropWidth,
    cropHeight
  );

  // Rotate back if needed or handle it differently for final output
  // For simplicity, if rotation is applied, we assume the canvas is already rotated
  // and what we have is the final view. If you want to "unrotate" the canvas
  // for a non-rotated final image, that's a more complex set of transforms.
  // The current drawImage takes the crop from the original image and draws it rotated onto the canvas.

  // Restore the context to its original state if other operations were to follow
  // ctx.rotate(-rad);
  // ctx.translate(-cropWidth / 2, -cropHeight / 2);


  return canvasToDataURL(canvas, 'image/png', 0.95); // Use a slightly higher quality
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
  const [rotate, setRotate] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget; // Use rendered dimensions

    if (width === 0 || height === 0) {
      console.warn("[ImageCropperModal] onImageLoad: Image rendered with zero width or height.");
      return;
    }
    
    // Create an initial crop selection that is 90% of the rendered image's width (respecting aspect ratio)
    // and then center this selection within the rendered image.
    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90, 
        },
        aspectRatio, 
        width,       // Base aspect crop on rendered width
        height       // Base aspect crop on rendered height
      ),
      width,  // Center this crop within the rendered image width
      height  // Center this crop within the rendered image height
    );

    // console.log("[ImageCropperModal] onImageLoad | rendered WxH:", width, height);
    // console.log("[ImageCropperModal] onImageLoad | newCrop (PercentCrop for initial display):", JSON.parse(JSON.stringify(newCrop)));
    setCrop(newCrop);
    setCompletedCrop(null); // Reset completedCrop when new image loads
  };


  const handleCropImage = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !imageSrc) {
      console.error('[ImageCropperModal] Crop details, image ref, or image source missing. CompletedCrop:', completedCrop, "ImageRef:", !!imgRef.current, "ImageSrc:", !!imageSrc);
      return;
    }
    
    // completedCrop from ReactCrop's onComplete is already in pixel values relative to the rendered image.
    // We need to scale these pixel values to be relative to the image's natural dimensions if the image was scaled down for display.
    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCropForOriginalImage: Crop = {
      x: completedCrop.x * scaleX,
      y: completedCrop.y * scaleY,
      width: completedCrop.width * scaleX,
      height: completedCrop.height * scaleY,
      unit: 'px', // Explicitly 'px' as it's now relative to natural dimensions
    };
    
    // console.log("[ImageCropperModal] handleCropImage | completedCrop (PixelCrop from onComplete, relative to rendered):", JSON.parse(JSON.stringify(completedCrop)));
    // console.log("[ImageCropperModal] handleCropImage | scaleX, scaleY:", scaleX, scaleY);
    // console.log("[ImageCropperModal] handleCropImage | pixelCropForOriginalImage (scaled to natural):", JSON.parse(JSON.stringify(pixelCropForOriginalImage)));


    try {
      const croppedImageUrl = await getCroppedImg(imageSrc, pixelCropForOriginalImage, rotate);
      if (croppedImageUrl) {
        // console.log("[ImageCropperModal] Cropped image successfully. Data URI length:", croppedImageUrl.length, "Calling onCropSave...");
        onCropSave(croppedImageUrl);
        onClose(); // Close modal after successful save
      } else {
        console.error('[ImageCropperModal] Failed to crop image - getCroppedImg returned null.');
        // Optionally, show a toast to the user here
      }
    } catch (e) {
      console.error('[ImageCropperModal] Error cropping image:', e);
      // Optionally, show a toast to the user here
    }
  }, [completedCrop, imageSrc, rotate, onCropSave, onClose]);


  const dialogContentClassName = "sm:max-w-lg glass-effect bg-card/90 dark:bg-card/80";

  // Reset state when modal opens with a new image or closes
  useEffect(() => {
    if (!isOpen) {
      // console.log("[ImageCropperModal] Modal closed or no imageSrc. Resetting state.");
      setCrop(undefined);
      setCompletedCrop(null);
      setScale(1);
      setRotate(0);
      imgRef.current = null; // Clear ref
    } else if (imageSrc) {
      // console.log("[ImageCropperModal] Modal opened with imageSrc. Resetting crop state for new image.");
      // Resetting crop here is important if the imageSrc changes while modal is already open (though less common)
      // The onImageLoad will handle setting the initial crop.
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
                onComplete={(c) => { // c is PercentCrop or PixelCrop depending on ReactCrop version/config
                                    // For `unit: '%'` in `makeAspectCrop`, `c` in `onComplete` is often PixelCrop by default in newer versions.
                                    // Let's assume `c` here is already pixel values relative to the rendered image.
                  // console.log("[ImageCropperModal] ReactCrop onComplete | c (likely PixelCrop relative to rendered):", JSON.parse(JSON.stringify(c)));
                  if (c.width && c.height) { // Ensure it's a valid crop
                    setCompletedCrop(c);
                  }
                }}
                aspect={aspectRatio}
                className="max-w-full max-h-full" 
                minWidth={50} // Minimum pixel width for crop selection
                minHeight={50} // Minimum pixel height for crop selection
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imageSrc}
                  style={{
                    transform: `scale(${scale}) rotate(${rotate}deg)`,
                    transformOrigin: 'center center',
                  }}
                  onLoad={onImageLoad}
                  className="object-contain w-full h-full" 
                />
              </ReactCrop>
            </div>
            <div>
              <Label htmlFor="zoom-slider" className="text-sm">Zoom</Label>
              <Slider
                id="zoom-slider"
                min={0.5} // Min scale
                max={3}   // Max scale
                step={0.01}
                value={[scale]}
                onValueChange={(value) => setScale(value[0])}
                className="mt-2"
              />
            </div>
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
          </div>
        )}

        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose} className="h-11 px-4 py-3">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleCropImage} disabled={!completedCrop || !completedCrop.width || !completedCrop.height} className="h-11 px-4 py-3">
            Crop & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropperModal;
