// src/components/BackgroundImageSwitcher.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, Trash2 } from 'lucide-react';

const BACKGROUND_IMAGE_LS_KEY = 'crmBackgroundImage';
const DEFAULT_BACKGROUND_IMAGE = 'https://picsum.photos/1920/1080?grayscale&blur=2';

const BackgroundImageSwitcher: React.FC = () => {
  const [imageUrl, setImageUrl] = useState('');
  const { toast } = useToast();

  const applyBackground = useCallback((url: string) => {
    if (typeof window !== 'undefined') {
      document.body.style.backgroundImage = `url('${url}')`;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedImageUrl = localStorage.getItem(BACKGROUND_IMAGE_LS_KEY);
      if (storedImageUrl) {
        setImageUrl(storedImageUrl);
        applyBackground(storedImageUrl);
      } else {
        setImageUrl(DEFAULT_BACKGROUND_IMAGE); // Set initial state to default if nothing stored
        applyBackground(DEFAULT_BACKGROUND_IMAGE);
      }
    }
  }, [applyBackground]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid image URL.',
        variant: 'destructive',
      });
      return;
    }
    applyBackground(imageUrl);
    if (typeof window !== 'undefined') {
      localStorage.setItem(BACKGROUND_IMAGE_LS_KEY, imageUrl);
    }
    toast({
      title: 'Success',
      description: 'Background image updated.',
    });
  };

  const handleResetToDefault = () => {
    setImageUrl(DEFAULT_BACKGROUND_IMAGE);
    applyBackground(DEFAULT_BACKGROUND_IMAGE);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(BACKGROUND_IMAGE_LS_KEY);
    }
    toast({
      title: 'Background Reset',
      description: 'Background image reset to default.',
    });
  };

  return (
    <div className="space-y-4 p-1">
      <h4 className="font-medium leading-none text-sm font-heading">Change Background Image</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="imageUrl" className="text-xs">Image URL</Label>
          <Input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="mt-1 h-9 bg-background/70 dark:bg-black/20 border-white/20 dark:border-white/10"
          />
        </div>
        <Button type="submit" size="sm" className="w-full">
          <ImagePlus className="mr-2 h-4 w-4" />
          Apply Background
        </Button>
      </form>
      <Button variant="outline" size="sm" onClick={handleResetToDefault} className="w-full">
        <Trash2 className="mr-2 h-4 w-4" />
        Reset to Default
      </Button>
    </div>
  );
};

export default BackgroundImageSwitcher;
