
'use client';

import React, { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useTiltEffect } from '@/hooks/useTiltEffect';

interface ProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null | undefined;
  altText?: string;
}

const ProfilePictureModal: React.FC<ProfilePictureModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  altText = "Profile Picture"
}) => {
  const dialogContentRef = useRef<HTMLDivElement>(null);
  useTiltEffect(dialogContentRef);

  useEffect(() => {
    if (isOpen) {
      console.log('[ProfilePictureModal] Rendering. isOpen: true, imageUrl:', imageUrl ? `Exists (len: ${imageUrl.length})` : imageUrl);
    }
  }, [isOpen, imageUrl]);

  if (!isOpen || !imageUrl) {
    return null;
  }

  const dialogContentClassName = "sm:max-w-3xl w-[90vw] sm:w-auto h-auto max-h-[90vh] p-4 glass-effect bg-card/90 dark:bg-card/80 flex flex-col card-tilt-container"; // Ensure background

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = event.currentTarget;
    console.log(`[ProfilePictureModal] Image loaded. Natural dimensions: ${img.naturalWidth}x${img.naturalHeight}. Rendered dimensions: ${img.width}x${img.height}`);
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('[ProfilePictureModal] Image load error:', event, 'Src:', imageUrl?.substring(0,100) + '...');
    // Optionally, you could try to show a fallback image here or close the modal
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        ref={dialogContentRef}
        className={dialogContentClassName} 
        onPointerDownOutside={onClose} 
        onEscapeKeyDown={onClose}
      >
        <div className="glow" />
        <DialogHeader className="sr-only relative z-[1]">
          <DialogTitle>View Profile Picture</DialogTitle>
        </DialogHeader>
        <DialogClose asChild>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                onClick={onClose}
                aria-label="Close image viewer"
            >
                <X className="h-5 w-5" />
            </Button>
        </DialogClose>
        <div className="flex-grow flex items-center justify-center p-4 overflow-hidden relative z-[1]">
          {/* Diagnostic styling below */}
          <img
            src={imageUrl}
            alt={altText}
            className="block max-w-[90vw] max-h-[85vh] w-auto h-auto object-contain rounded-md shadow-lg border-2 border-red-500" // Added red border for visibility
            style={{ backgroundColor: 'rgba(0, 255, 0, 0.1)' }} // Added light green background
            onLoad={handleImageLoad}
            onError={handleImageError} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePictureModal;
