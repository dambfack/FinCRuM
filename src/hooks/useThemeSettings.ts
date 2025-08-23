// src/hooks/useThemeSettings.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserThemeSettings, ChartColorKeys, DataItemType } from '@/lib/types'; // Assuming these are defined in types
import { useAuth } from '@/contexts/AuthContext'; // To get current user ID
import { applyThemeSettingsToDocument } from '@/lib/utils'; // Utility to apply CSS vars

export const DEFAULT_THEME_SETTINGS: UserThemeSettings = {
  accentColor: '#3b82f6', // Default blue accent color
  chartColors: {
    open: '#34D399', // Green
    closed: '#F87171', // Red
    missed: '#FBBF24', // Amber
    other: '#60A5FA',  // Blue
  },
};

function loadThemeSettings(userId: string | null): UserThemeSettings {
  if (typeof window === 'undefined' || !userId) return DEFAULT_THEME_SETTINGS;
  try {
    const allUserSettingsString = localStorage.getItem(DataItemType.ThemePreference);
    if (allUserSettingsString) {
      const allUserSettings = JSON.parse(allUserSettingsString) as Record<string, Partial<UserThemeSettings>>;
      const userSpecificSettings = allUserSettings[userId];
      if (userSpecificSettings) {
        // Merge with defaults to ensure all keys are present
        return {
          ...DEFAULT_THEME_SETTINGS,
          ...userSpecificSettings,
          chartColors: {
            ...DEFAULT_THEME_SETTINGS.chartColors,
            ...(userSpecificSettings.chartColors || {}),
          },
        };
      }
    }
  } catch (error) {
    console.error(`Error loading theme settings for user ${userId}:`, error);
  }
  return DEFAULT_THEME_SETTINGS;
}

function saveThemeSettings(userId: string | null, settings: UserThemeSettings) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const allUserSettingsString = localStorage.getItem(DataItemType.ThemePreference);
    let allUserSettings: Record<string, UserThemeSettings> = {};
    if (allUserSettingsString) {
      allUserSettings = JSON.parse(allUserSettingsString) as Record<string, UserThemeSettings>;
    }
    allUserSettings[userId] = settings;
    localStorage.setItem(DataItemType.ThemePreference, JSON.stringify(allUserSettings));
    applyThemeSettingsToDocument(settings); // Apply changes to CSS variables
  } catch (error) {
    console.error(`Error saving theme settings for user ${userId}:`, error);
  }
}

export function useThemeSettings() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id || null;
  const [themeSettings, setThemeSettings] = useState<UserThemeSettings>(() => loadThemeSettings(userId));

  useEffect(() => {
    // Load settings when userId changes (e.g., on login/logout)
    setThemeSettings(loadThemeSettings(userId));
  }, [userId]);

  useEffect(() => {
    // Apply settings whenever they change or userId is available
    if (userId) {
      applyThemeSettingsToDocument(themeSettings);
    }
    // Listener for external changes to theme preferences
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === DataItemType.ThemePreference && userId) {
        setThemeSettings(loadThemeSettings(userId));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [themeSettings, userId]); // Rerun if themeSettings or userId changes

  const updateAccentColor = useCallback((color: string | null) => {
    if (!userId) return;
    setThemeSettings(prevSettings => {
      const newSettings = { ...prevSettings, accentColor: color };
      saveThemeSettings(userId, newSettings);
      return newSettings;
    });
  }, [userId]);

  const updateChartColor = useCallback((key: ChartColorKeys, color: string) => {
    if (!userId) return;
    setThemeSettings(prevSettings => {
      const newChartColors = { ...prevSettings.chartColors, [key]: color };
      const newSettings = { ...prevSettings, chartColors: newChartColors };
      saveThemeSettings(userId, newSettings);
      return newSettings;
    });
  }, [userId]);

  const resetThemeSettings = useCallback(() => {
    if (!userId) return;
    setThemeSettings(DEFAULT_THEME_SETTINGS);
    saveThemeSettings(userId, DEFAULT_THEME_SETTINGS);
  }, [userId]);

  return { themeSettings, updateAccentColor, updateChartColor, resetThemeSettings };
}