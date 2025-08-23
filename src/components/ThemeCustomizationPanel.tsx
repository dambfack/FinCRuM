'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Palette, Trash2, X } from 'lucide-react';
import { SketchPicker, type ColorResult } from 'react-color';
import { useThemeSettings } from '@/hooks/useThemeSettings';
import { toast as sonnerToast } from 'sonner'; // Renamed to avoid conflict if use-toast is different
import { UserThemeSettings, ChartColorKeys as ActualChartColorKeys } from '@/lib/types'; // Use ActualChartColorKeys
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

// Define a default chart color configuration
const DEFAULT_CHART_COLORS: Record<ActualChartColorKeys, string> = {
  open: '#34D399', // Green
  closed: '#F87171', // Red
  missed: '#FBBF24', // Amber
  other: '#60A5FA',  // Blue
};

interface ThemeCustomizationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ThemeCustomizationPanel: React.FC<ThemeCustomizationPanelProps> = ({ isOpen, onClose }) => {
  const {
    themeSettings,
    updateAccentColor,
    updateChartColor,
    resetThemeSettings: resetHookThemeSettings,
  } = useThemeSettings();

  const [showAccentColorPicker, setShowAccentColorPicker] = useState<boolean>(false);
  const [showChartColorPicker, setShowChartColorPicker] = useState<ActualChartColorKeys | null>(null);

  const handleAccentColorChange = (color: ColorResult) => {
    updateAccentColor(color.hex);
  };

  const handleChartColorChange = (key: ActualChartColorKeys, color: ColorResult) => {
    updateChartColor(key, color.hex);
  };

  const handleResetTheme = useCallback(() => {
    resetHookThemeSettings();
    sonnerToast.success('Theme settings have been reset to defaults.');
  }, [resetHookThemeSettings]);

  const handleChartColorPickerToggle = (key: ActualChartColorKeys | null) => {
    setShowChartColorPicker(prevKey => (prevKey === key ? null : key));
  };

  if (!isOpen) return null;

  const currentAccentColor = themeSettings.accentColor || '#1E90FF'; // Default accent
  const currentChartColors = themeSettings.chartColors || DEFAULT_CHART_COLORS;

  const chartColorEntries = Object.entries(currentChartColors) as [ActualChartColorKeys, string][];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-end">
      <Card className="w-full max-w-md h-full bg-background text-foreground shadow-xl flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
          <CardTitle className="text-lg font-semibold">Customize Theme</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close theme panel">
            <X className="w-6 h-6" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-6 overflow-y-auto flex-grow">
          <div>
            <Label htmlFor="accent-color-button" className="text-sm font-medium">Accent Color</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Button
                id="accent-color-button"
                onClick={() => setShowAccentColorPicker(prev => !prev)}
                className="w-full justify-start text-left"
                style={{ backgroundColor: currentAccentColor, color: getContrastColor(currentAccentColor) }}
              >
                {currentAccentColor}
              </Button>
              <div
                className="w-8 h-8 rounded border border-border"
                style={{ backgroundColor: currentAccentColor }}
              />
            </div>
            {showAccentColorPicker && (
              <div className="mt-2 relative z-10">
                <SketchPicker color={currentAccentColor} onChangeComplete={handleAccentColorChange} />
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium">Chart Colors (Status)</Label>
            <div className="space-y-3 mt-1">
              {chartColorEntries.map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`chart-color-${key}`} className="capitalize text-xs text-muted-foreground">{key}</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      id={`chart-color-${key}`}
                      onClick={() => handleChartColorPickerToggle(key)}
                      className="w-full justify-start text-left"
                      style={{ backgroundColor: value, color: getContrastColor(value) }}
                    >
                      {value}
                    </Button>
                    <div
                      className="w-8 h-8 rounded border border-border"
                      style={{ backgroundColor: value }}
                    />
                  </div>
                  {showChartColorPicker === key && (
                    <div className="mt-2 relative z-10">
                      <SketchPicker
                        color={value}
                        onChangeComplete={(color) => handleChartColorChange(key, color)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleResetTheme} variant="outline" className="w-full">
            <Trash2 className="mr-2 h-4 w-4" /> Reset to Defaults
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to determine contrast color (simple version)
function getContrastColor(hexcolor?: string): string {
  if (!hexcolor) return '#000000';
  const r = parseInt(hexcolor.slice(1, 3), 16);
  const g = parseInt(hexcolor.slice(3, 5), 16);
  const b = parseInt(hexcolor.slice(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#FFFFFF';
}


export default ThemeCustomizationPanel;