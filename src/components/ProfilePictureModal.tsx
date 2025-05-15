
'use client';

import React, { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useTiltEffect } from '@/hooks/useTiltEffect'; // Re-import the hook
import { cn } from '@/lib/utils';

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
  useTiltEffect(dialogContentRef); // Re-enable the tilt effect

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

  const dialogContentClassName = cn(
    "sm:max-w-3xl w-[90vw] sm:w-auto h-auto max-h-[90vh] p-4 flex flex-col items-center justify-center shadow-2xl rounded-lg",
    "glass-effect bg-card/80 dark:bg-card/70", // Restore glassmorphic background
    "card-tilt-container" // Add class for tilt effect hook
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        ref={dialogContentRef}
        className={dialogContentClassName}
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        <div className="glow" /> {/* Add glow element for the tilt effect */}
        <DialogHeader className="sr-only">
          <DialogTitle>View Profile Picture</DialogTitle>
        </DialogHeader>
        {/* Image is positioned relative to allow glow to be behind it if needed by stacking context */}
        <img
          src={imageUrl}
          alt={altText}
          className="block max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] w-auto h-auto object-contain rounded-md shadow-lg relative z-[1]"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePictureModal;
