
// src/components/BackgroundImageSwitcher.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ImageUp, CheckCircle, Trash2 } from 'lucide-react';
import { DataItemType, LocalData } from '@/lib/types';
import { getData, saveData } from '@/lib/utils';
import { useTheme } from 'next-themes';

const APP_DEFAULT_LIGHT_BACKGROUND = '/default-bg-light.svg';
const APP_DEFAULT_DARK_BACKGROUND = '/default-bg-dark.svg';

const BackgroundImageSwitcher: React.FC = () => {
  const [currentCustomBg, setCurrentCustomBg] = useState<string | null>(null);
  const [currentDefaultBg, setCurrentDefaultBg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { theme, resolvedTheme } = useTheme();

  // Get the appropriate default background based on theme
  const getThemeDefaultBackground = useCallback(() => {
    const currentTheme = resolvedTheme || theme;
    return currentTheme === 'dark' ? APP_DEFAULT_DARK_BACKGROUND : APP_DEFAULT_LIGHT_BACKGROUND;
  }, [theme, resolvedTheme]);

  const applyBackground = useCallback((url: string | null) => {
    if (typeof window !== 'undefined') {
      if (url) {
        document.body.style.backgroundImage = `url('${url}')`;
        document.body.setAttribute('data-ai-hint', 'custom background');
      } else {
        // Remove the inline style to let CSS defaults take effect
        document.body.style.removeProperty('background-image');
        document.body.setAttribute('data-ai-hint', 'abstract gradient'); // Default hint
      }
    }
  }, []);

  useEffect(() => {
    const storedCustomBg = getData<string>(DataItemType.BackgroundImage);
    const storedDefaultBg = getData<string>(DataItemType.DefaultBackgroundImage);

    setCurrentCustomBg(storedCustomBg);
    setCurrentDefaultBg(storedDefaultBg);

    if (storedCustomBg) {
      applyBackground(storedCustomBg);
    } else if (storedDefaultBg) {
      applyBackground(storedDefaultBg);
    } else {
      // Let CSS defaults handle the theme-appropriate background
      applyBackground(null);
    }
  }, [applyBackground, getThemeDefaultBackground]);

  // Listen for theme changes and update background appropriately
  useEffect(() => {
    const storedCustomBg = getData<string>(DataItemType.BackgroundImage);
    const storedDefaultBg = getData<string>(DataItemType.DefaultBackgroundImage);
    
    // Update background based on priority:
    // 1. Custom background (highest priority - don't change)
    // 2. User-set default background (medium priority - don't change)
    // 3. Theme-appropriate app default (lowest priority - handled by CSS)
    if (storedCustomBg) {
      // Keep custom background regardless of theme
      applyBackground(storedCustomBg);
    } else if (storedDefaultBg) {
      // Keep user-set default background regardless of theme
      applyBackground(storedDefaultBg);
    } else {
      // Let CSS handle the theme-appropriate app default
      applyBackground(null);
    }
  }, [theme, resolvedTheme, applyBackground, getThemeDefaultBackground]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit for background images
        toast({
          title: 'Image Too Large',
          description: 'Please select an image smaller than 5MB.',
          variant: 'destructive',
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setCurrentCustomBg(dataUri);
        saveData<string>(DataItemType.BackgroundImage, dataUri);
        applyBackground(dataUri);
        toast({
          title: 'Background Updated',
          description: 'New background image has been applied temporarily.',
        });
      };
      reader.onerror = () => {
        toast({
          title: 'File Read Error',
          description: 'Could not read the selected file.',
          variant: 'destructive',
        });
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetCurrentAsDefault = () => {
    if (currentCustomBg) {
      setCurrentDefaultBg(currentCustomBg);
      saveData<string>(DataItemType.DefaultBackgroundImage, currentCustomBg);
      
      // Clear the custom override so the new default takes effect
      setCurrentCustomBg(null);
      localStorage.removeItem(DataItemType.BackgroundImage); // Use direct removeItem from LocalData enum
      
      applyBackground(currentCustomBg); // Apply new default immediately
      toast({
        title: 'Default Background Set',
        description: 'The current background is now your default.',
      });
    } else {
      toast({
        title: 'No Custom Background',
        description: 'Upload a new background first to set it as default.',
        variant: 'default',
      });
    }
  };

  const handleResetToAppDefault = () => {
    setCurrentCustomBg(null);
    setCurrentDefaultBg(null);
    localStorage.removeItem(DataItemType.BackgroundImage);
    localStorage.removeItem(DataItemType.DefaultBackgroundImage);
    applyBackground(getThemeDefaultBackground());
    toast({
      title: 'Background Reset',
      description: 'Background image has been reset to the theme-appropriate default.',
    });
  };

  return (
    <div className="space-y-3 p-1">
      <h4 className="font-medium leading-none text-sm font-heading">App Background</h4> {/* Removed tracking-wide */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageUp className="mr-2 h-4 w-4" />
        Upload New Background
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleSetCurrentAsDefault}
        disabled={!currentCustomBg}
      >
        <CheckCircle className="mr-2 h-4 w-4" />
        Set Current as Default
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleResetToAppDefault}
        className="w-full"
        disabled={!currentCustomBg && !currentDefaultBg}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Reset to App Default
      </Button>
    </div>
  );
};

export default BackgroundImageSwitcher;
