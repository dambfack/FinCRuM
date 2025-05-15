
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

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = event.currentTarget;
    console.log(`[ProfilePictureModal] Image loaded. Natural dimensions: ${img.naturalWidth}x${img.naturalHeight}. Rendered dimensions: ${img.width}x${img.height}`);
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('[ProfilePictureModal] Image load error:', event, 'Src:', imageUrl?.substring(0,100) + '...');
  };

  if (!isOpen || !imageUrl) {
    return null;
  }

  const dialogContentClassName = "sm:max-w-3xl w-[90vw] sm:w-auto h-auto max-h-[90vh] p-4 glass-effect bg-card/90 dark:bg-card/80 flex flex-col items-center justify-center card-tilt-container";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        ref={dialogContentRef}
        className={dialogContentClassName}
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        <DialogHeader className="sr-only"> {/* Added DialogHeader for accessibility */}
          <DialogTitle className="sr-only">View Profile Picture</DialogTitle> {/* Visually hidden title */}
        </DialogHeader>
        <div className="glow" />
        {/* Close button is part of DialogContent by default, but we can add our own if needed for styling
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
        </DialogClose> */}
        <img
          src={imageUrl}
          alt={altText}
          className="block max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] w-auto h-auto object-contain rounded-md shadow-lg relative z-[1]"
          style={{ backgroundColor: 'transparent' }} // Removed diagnostic bg
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePictureModal;
    
