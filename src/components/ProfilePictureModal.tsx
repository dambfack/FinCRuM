
'use client';

import React, { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
// import { useTiltEffect } from '@/hooks/useTiltEffect'; // Temporarily disable for debugging

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
  // useTiltEffect(dialogContentRef); // Temporarily disable for debugging

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

  // Using a solid, non-glassmorphic background for DialogContent for this test
  const dialogContentClassName = "sm:max-w-3xl w-[90vw] sm:w-auto h-auto max-h-[90vh] p-4 bg-background border border-border flex flex-col items-center justify-center shadow-2xl rounded-lg";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        ref={dialogContentRef}
        className={dialogContentClassName}
        onPointerDownOutside={onClose} 
        onEscapeKeyDown={onClose}
      >
        <DialogHeader className="sr-only"> {/* Visually hidden title for accessibility */}
          <DialogTitle className="sr-only">View Profile Picture</DialogTitle>
        </DialogHeader>
        {/* <div className="glow" /> // Glow div removed as tilt effect is disabled */}
        <img
          src={imageUrl}
          alt={altText}
          className="block max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] w-auto h-auto object-contain rounded-md shadow-lg"
          // Removed style={{ backgroundColor: 'white', border: '2px solid limegreen' }} as DialogContent background is now solid
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePictureModal;
    