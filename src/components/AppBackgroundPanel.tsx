import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { toast as sonnerToast } from 'sonner'; // Using sonner for consistency
import { useToast } from '@/hooks/use-toast';
import { APP_BACKGROUND_KEY, DEFAULT_BACKGROUND_URL } from '@/lib/constants';
import { trackEvent } from '@/lib/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useTheme } from 'next-themes';

const APP_DEFAULT_LIGHT_BACKGROUND = '/default-bg-light.svg';
const APP_DEFAULT_DARK_BACKGROUND = '/default-bg-dark.svg';

interface AppBackgroundPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AppBackgroundPanel: React.FC<AppBackgroundPanelProps> = ({ isOpen, onClose }) => {
  const { theme, resolvedTheme } = useTheme();
  const [currentBackground, setCurrentBackground] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Get the appropriate default background based on theme
  const getThemeDefaultBackground = useCallback(() => {
    const currentTheme = resolvedTheme || theme;
    return currentTheme === 'dark' ? APP_DEFAULT_DARK_BACKGROUND : APP_DEFAULT_LIGHT_BACKGROUND;
  }, [theme, resolvedTheme]);

  // Initialize background state
  useEffect(() => {
    const storedBackground = localStorage.getItem(APP_BACKGROUND_KEY);
    setCurrentBackground(storedBackground || getThemeDefaultBackground());
  }, [getThemeDefaultBackground]);

  // Effect to update body background when currentBackground changes
  useEffect(() => {
    if (currentBackground) {
      document.body.style.backgroundImage = `url(${currentBackground})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed'; // Optional: keeps background fixed during scroll
    } else {
      document.body.style.backgroundImage = ''; // Remove background if null
    }
  }, [currentBackground]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
      const base64String = reader.result as string;
      localStorage.setItem(APP_BACKGROUND_KEY, base64String);
      setCurrentBackground(base64String); // This will trigger the useEffect to update the body
      sonnerToast.success('Background Updated', { description: 'New background image has been set.' });
      trackEvent('App Background Changed');
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

  const handleSetAsDefault = useCallback(() => {
    const themeDefault = getThemeDefaultBackground();
    if (currentBackground && currentBackground !== themeDefault) {
      // The current background is already set in localStorage by handleFileUpload
      // This button might be redundant if uploading automatically sets it.
      // If it's meant to save a *previewed* but not *uploaded* background, the logic needs adjustment.
      // For now, assuming upload = set.
      sonnerToast.info('Background Saved', { description: 'Current background is already set.' });
      trackEvent('App Background Set Default');
    } else if (currentBackground === themeDefault) {
      sonnerToast.info('Default Background', { description: 'The application default background is already active.' });
    } else {
      sonnerToast.error('Error', { description: 'No background to set as default.' });
    }
  }, [currentBackground, getThemeDefaultBackground]);

  const handleResetToDefault = useCallback(() => {
    localStorage.removeItem(APP_BACKGROUND_KEY);
    const themeDefault = getThemeDefaultBackground();
    setCurrentBackground(themeDefault);
    // The useEffect will update the body background
    sonnerToast.success('Background Reset', { description: 'Background reset to application default.' });
    trackEvent('App Background Reset');
  }, [getThemeDefaultBackground]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-end">
      <Card className="w-full max-w-md h-full bg-background text-foreground shadow-xl flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
          <CardTitle className="text-lg font-semibold">Change App Background</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close background panel">
            <X className="w-6 h-6" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-6 overflow-y-auto flex-grow">
          <div>
            <Label className="text-sm font-medium">Current Background Preview</Label>
            {currentBackground && (
              <div className="mt-1 aspect-video rounded-md overflow-hidden border border-border bg-muted flex items-center justify-center">
                <img src={currentBackground} alt="Current app background" className="w-full h-full object-cover" />
              </div>
            )}
            {!currentBackground && (
                <div className="mt-1 aspect-video rounded-md border border-dashed border-border bg-muted flex flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mb-2" />
                    <span>No custom background set.</span>
                </div>
            )}
          </div>

          <input type="file" accept="image/jpeg, image/png, image/webp, image/gif" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
          
          <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}> 
            <Upload className="mr-2 h-4 w-4" />Upload New Background
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleSetAsDefault} 
            disabled={!currentBackground || currentBackground === DEFAULT_BACKGROUND_URL || localStorage.getItem(APP_BACKGROUND_KEY) === currentBackground}
          >
            <CheckCircle className="mr-2 h-4 w-4" />Set Current as Default
          </Button>
          
          <Button 
            variant="destructive" 
            className="w-full" 
            onClick={handleResetToDefault} 
            disabled={currentBackground === DEFAULT_BACKGROUND_URL && localStorage.getItem(APP_BACKGROUND_KEY) === DEFAULT_BACKGROUND_URL}
          >
            <Trash2 className="mr-2 h-4 w-4" />Reset to App Default
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppBackgroundPanel;