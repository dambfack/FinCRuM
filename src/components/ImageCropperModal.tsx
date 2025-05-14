
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
function canvasToDataURL(canvas: HTMLCanvasElement, mimeType = 'image/png', quality = 0.9) { // Adjusted quality
  return canvas.toDataURL(mimeType, quality);
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Crop,
  rotation = 0,
  outputWidth = 512, // Max output width
  outputHeight = 512 // Max output height
): Promise<string | null> {
  const image = new Image();
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

  const cropX = pixelCrop.x;
  const cropY = pixelCrop.y;
  let cropWidth = pixelCrop.width;
  let cropHeight = pixelCrop.height;

  // Calculate new dimensions if resizing is needed
  let targetWidth = cropWidth;
  let targetHeight = cropHeight;

  if (cropWidth > outputWidth || cropHeight > outputHeight) {
    const ratio = Math.min(outputWidth / cropWidth, outputHeight / cropHeight);
    targetWidth = Math.round(cropWidth * ratio);
    targetHeight = Math.round(cropHeight * ratio);
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const rad = rotation * Math.PI / 180;
  ctx.translate(targetWidth / 2, targetHeight / 2);
  ctx.rotate(rad);
  
  ctx.drawImage(
    image,
    cropX,
    cropY,
    cropWidth, // Source dimensions from the original image
    cropHeight,
    -targetWidth / 2, // Destination dimensions on the canvas (scaled)
    -targetHeight / 2,
    targetWidth,
    targetHeight
  );

  return canvasToDataURL(canvas, 'image/png', 0.9); 
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
    const { width, height } = e.currentTarget; 

    if (width === 0 || height === 0) {
      console.warn("[ImageCropperModal] onImageLoad: Image rendered with zero width or height.");
      return;
    }
    
    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90, 
        },
        aspectRatio, 
        width,       
        height       
      ),
      width,  
      height  
    );
    setCrop(newCrop);
    setCompletedCrop(null); 
  };


  const handleCropImage = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !imageSrc) {
      console.error('[ImageCropperModal] Crop details, image ref, or image source missing. CompletedCrop:', completedCrop, "ImageRef:", !!imgRef.current, "ImageSrc:", !!imageSrc);
      return;
    }
    
    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCropForOriginalImage: Crop = {
      x: completedCrop.x * scaleX,
      y: completedCrop.y * scaleY,
      width: completedCrop.width * scaleX,
      height: completedCrop.height * scaleY,
      unit: 'px', 
    };
    
    console.log("[ImageCropperModal] Cropping with pixelCropForOriginalImage:", JSON.stringify(pixelCropForOriginalImage));

    try {
      // Pass desired output dimensions to getCroppedImg, e.g., 512x512
      const croppedImageUrl = await getCroppedImg(imageSrc, pixelCropForOriginalImage, rotate, 512, 512);
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
          <DialogTitle className="font-heading">Crop Image</DialogTitle> {/* Removed tracking-wide */}
          <DialogDescription>Adjust the selection to crop your image. Aspect ratio: {aspectRatio === 1 ? '1:1 (Square)' : aspectRatio.toFixed(2)}.</DialogDescription>
        </DialogHeader>

        {imageSrc && (
          <div className="my-4 space-y-4">
            <div className="flex justify-center items-center max-h-[50vh] overflow-hidden rounded-md border bg-black/10">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => { 
                  console.log("[ImageCropperModal] ReactCrop onComplete | c (PixelCrop relative to rendered):", JSON.parse(JSON.stringify(c)));
                  if (c.width && c.height) { 
                    setCompletedCrop(c);
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
          <Button onClick={handleCropImage} disabled={!completedCrop || !completedCrop.width || !completedCrop.height} className="h-11 px-4 py-3">
            Crop & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropperModal;
