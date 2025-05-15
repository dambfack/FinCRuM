
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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
  if (!isOpen || !imageUrl) {
    return null;
  }

  const dialogContentClassName = "sm:max-w-3xl w-auto h-auto p-2 glass-effect bg-card/80 dark:bg-card/70 flex flex-col";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={dialogContentClassName} onPointerDownOutside={onClose} onEscapeKeyDown={onClose}>
        <DialogHeader className="sr-only">
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
        <div className="flex-grow flex items-center justify-center p-4 overflow-hidden">
          <img
            src={imageUrl}
            alt={altText}
            className="block max-w-[90vw] max-h-[85vh] w-auto h-auto object-contain rounded-md shadow-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePictureModal;
