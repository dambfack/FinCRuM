
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
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = (err) => {
      console.error("[getCroppedImg] Image load error:", err);
      reject(err);
    };
  });

  if (!pixelCrop.width || !pixelCrop.height || image.naturalWidth === 0 || image.naturalHeight === 0) {
    console.error("[getCroppedImg] pixelCrop width/height is zero/undefined, or image natural dimensions are zero. PixelCrop:", pixelCrop, "Natural WxH:", image.naturalWidth, image.naturalHeight);
    return null;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error("[getCroppedImg] Failed to get canvas context.");
    return null;
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  // Use pixelCrop values directly as they are in image's original pixel coordinates
  const L_cropX = pixelCrop.x;
  const L_cropY = pixelCrop.y;
  const L_cropWidth = pixelCrop.width;
  const L_cropHeight = pixelCrop.height;

  const L_rad = rotation * Math.PI / 180;

  // calculate bounding box of the rotated image
  const L_bBoxWidth = Math.abs(image.naturalWidth * Math.cos(L_rad)) + Math.abs(image.naturalHeight * Math.sin(L_rad));
  const L_bBoxHeight = Math.abs(image.naturalWidth * Math.sin(L_rad)) + Math.abs(image.naturalHeight * Math.cos(L_rad));

  // set canvas size to match the bounding box
  canvas.width = L_bBoxWidth;
  canvas.height = L_bBoxHeight;
  
  // translate canvas context to a central location to allow rotating and drawing to new coordinates
  ctx.translate(L_bBoxWidth / 2, L_bBoxHeight / 2);
  ctx.rotate(L_rad);
  ctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);

  // draw rotated image
  ctx.drawImage(
    image,
    0,
    0
  );
  
  // extract rotated crop
  const data = ctx.getImageData(
    L_cropX,
    L_cropY,
    L_cropWidth,
    L_cropHeight
  );

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = L_cropWidth;
  canvas.height = L_cropHeight;

  // paste generated rotate image with correct offsets
  ctx.putImageData(data, 0,0);

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
  const [rotate, setRotate] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
    const { width, height, naturalWidth, naturalHeight } = e.currentTarget;

    const cropWidthForCalc = Math.min(width, naturalWidth);
    const cropHeightForCalc = Math.min(height, naturalHeight);

    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspectRatio,
        cropWidthForCalc, 
        cropHeightForCalc
      ),
      width,  
      height
    );
    // console.log("[ImageCropperModal] onImageLoad | natural WxH:", naturalWidth, naturalHeight, "rendered WxH:", width, height);
    // console.log("[ImageCropperModal] onImageLoad | newCrop (PercentCrop):", JSON.parse(JSON.stringify(newCrop)));
    setCrop(newCrop);
    setCompletedCrop(null); 
  };

  const handleCropImage = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !imageSrc) {
      console.error('[ImageCropperModal] Crop details, image ref, or image source missing. CompletedCrop:', completedCrop, "ImageRef:", imgRef.current, "ImageSrc:", !!imageSrc);
      return;
    }
    
    const cropToUse: Crop = {
      x: completedCrop.x ?? 0,
      y: completedCrop.y ?? 0,
      width: completedCrop.width,
      height: completedCrop.height,
      unit: completedCrop.unit,
    };

    // console.log("[ImageCropperModal] handleCropImage | completedCrop to be used:", JSON.parse(JSON.stringify(cropToUse)));
    // console.log("[ImageCropperModal] handleCropImage | imageSrc length:", imageSrc.length);

    try {
      const croppedImageUrl = await getCroppedImg(imageSrc, cropToUse, rotate);
      if (croppedImageUrl) {
        console.log("[ImageCropperModal] Cropped image successfully. Data URI length:", croppedImageUrl.length, "Calling onCropSave...");
        onCropSave(croppedImageUrl);
        onClose();
      } else {
        console.error('[ImageCropperModal] Failed to crop image - getCroppedImg returned null.');
      }
    } catch (e) {
      console.error('[ImageCropperModal] Error cropping image:', e);
    }
  }, [completedCrop, imageSrc, rotate, onCropSave, onClose]);


  const dialogContentClassName = "sm:max-w-lg glass-effect bg-card/90 dark:bg-card/80";

  useEffect(() => {
    if (!isOpen) {
      setCrop(undefined);
      setCompletedCrop(null);
      setScale(1);
      setRotate(0);
      imgRef.current = null;
    } else if (imageSrc) {
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
                onComplete={(c) => {
                  if (imgRef.current) {
                    // console.log("[ImageCropperModal] ReactCrop onComplete | c (PercentCrop):", JSON.parse(JSON.stringify(c)));
                    // console.log("[ImageCropperModal] ReactCrop onComplete | imgRef.current WxH:", imgRef.current.width, imgRef.current.height);
                    const pixelCrop = convertToPixelCrop(
                      c,
                      imgRef.current.width,  
                      imgRef.current.height 
                    );
                    // console.log("[ImageCropperModal] ReactCrop onComplete | resulting pixelCrop (PixelCrop):", JSON.parse(JSON.stringify(pixelCrop)));
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
                min={0.5}
                max={3}
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
          <Button onClick={handleCropImage} disabled={!completedCrop} className="h-11 px-4 py-3">
            Crop & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropperModal;
    

    