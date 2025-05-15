
'use client';

import React, { useRef, useEffect } from 'react'; // Added useEffect
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useTiltEffect } from '@/hooks/useTiltEffect'; // Import the custom hook

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

  const dialogContentClassName = "sm:max-w-3xl w-auto h-auto p-2 glass-effect bg-card/80 dark:bg-card/70 flex flex-col card-tilt-container";

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
          <img
            src={imageUrl}
            alt={altText}
            className="block max-w-[90vw] max-h-[85vh] w-auto h-auto object-contain rounded-md shadow-lg"
            onError={(e) => console.error('[ProfilePictureModal] Image load error:', e, 'Src:', imageUrl?.substring(0,100) + '...')}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePictureModal;
