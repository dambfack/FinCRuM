
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import type { User, UserThemeSettings, UserPreferences } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData, saveData, hexToHslString } from '@/lib/utils';
import { userManagement } from '@/services/user-management';
import { getCloudDatabase } from '@/services/shared-cloud-database';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { revokeGoogleTokensAction } from '@/app/actions/google-auth-actions';

// Default HSL values from globals.css for accent color
const DEFAULT_ACCENT_HSL: Record<'light' | 'dark', string> = {
  light: '180 100% 25%', // Teal
  dark: '180 100% 35%',  // Lighter Teal
};
const DEFAULT_ACCENT_FOREGROUND_HSL: Record<'light' | 'dark', string> = {
  light: '0 0% 98%',
  dark: '0 0% 98%',
};

// Default HSL values for chart pie slices by theme
const DEFAULT_CHART_PIE_COLORS_HSL: Record<string, Record<'light' | 'dark', string>> = {
  '--chart-pie-1': { light: '180 100% 25%', dark: '180 100% 35%' }, // Open
  '--chart-pie-2': { light: '210 100% 45%', dark: '210 90% 55%' },  // Closed
  '--chart-pie-3': { light: '40 100% 50%',  dark: '40 90% 60%' },   // Missed
  '--chart-pie-4': { light: '220 10% 60%',  dark: '220 10% 50%' },  // Other
};


interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  pinSetupRequiredForUser: User | null;
  
  headerLogoLightUrl: string | null;
  headerLogoDarkUrl: string | null;
  defaultHeaderLogoLightUrl: string | null; // New
  defaultHeaderLogoDarkUrl: string | null;  // New
  
  currentUserThemeSettings: UserThemeSettings | null;

  login: (selectedUserId: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  authenticateWithPin: (userId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  createUser: (userData: Omit<User, 'id' | 'permissions' | 'createdAt' | 'cloudPinHash' | 'deviceIds'>, pin: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  changePin: (oldPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  getAllUsers: () => Promise<{ success: boolean; users?: User[]; error?: string }>;
  completePinSetupAndLogin: (userId: string, newPin: string) => Promise<boolean>;
  updateUserProfilePicture: (dataUri: string) => Promise<boolean>;

  updateHeaderLogoLight: (dataUri: string | null) => void;
  updateHeaderLogoDark: (dataUri: string | null) => void;
  setDefaultHeaderLogoLight: (dataUri: string) => void; // New
  setDefaultHeaderLogoDark: (dataUri: string) => void;  // New

  updateCustomAccentColor: (hexColor: string | null) => void;
  updateChartPieColorOpen: (hexColor: string | null) => void;
  updateChartPieColorClosed: (hexColor: string | null) => void;
  updateChartPieColorMissed: (hexColor: string | null) => void;
  updateChartPieColorOther: (hexColor: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isHexColorDark(hexColor: string | null): boolean {
  if (!hexColor) return true; 
  let r = 0, g = 0, b = 0;
  const hex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;

  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    return true; 
  }
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
  return luminance < 128;
}

const applyCustomColorToCssVar = (cssVarName: string, colorHex: string | null, themeKey: 'light' | 'dark', defaultHslValueOverride?: string) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  let defaultHslValue: string | undefined = defaultHslValueOverride;

  if (!defaultHslValue) {
    if (cssVarName === '--accent') {
      defaultHslValue = DEFAULT_ACCENT_HSL[themeKey];
    } else if (cssVarName.startsWith('--chart-pie-')) {
      defaultHslValue = DEFAULT_CHART_PIE_COLORS_HSL[cssVarName]?.[themeKey];
    }
  }


  if (!colorHex) { // Resetting to default
    if (defaultHslValue) {
      root.style.setProperty(cssVarName, defaultHslValue);
      if (cssVarName === '--accent') {
        root.style.setProperty('--accent-foreground', DEFAULT_ACCENT_FOREGROUND_HSL[themeKey]);
      }
    } else {
      root.style.removeProperty(cssVarName); 
    }
  } else {
    const hslString = hexToHslString(colorHex);
    if (hslString) {
      root.style.setProperty(cssVarName, hslString);
      if (cssVarName === '--accent') {
        if (isHexColorDark(colorHex)) {
          root.style.setProperty('--accent-foreground', DEFAULT_ACCENT_FOREGROUND_HSL.light);
        } else {
          root.style.setProperty('--accent-foreground', '220 10% 20%'); // Dark text HSL
        }
      }
    } else { 
      if (defaultHslValue) {
        root.style.setProperty(cssVarName, defaultHslValue);
        if (cssVarName === '--accent') {
          root.style.setProperty('--accent-foreground', DEFAULT_ACCENT_FOREGROUND_HSL[themeKey]);
        }
      }
    }
  }
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [pinSetupRequiredForUser, setPinSetupRequiredForUser] = useState<User | null>(null);
  
  const [headerLogoLightUrl, setHeaderLogoLightUrl] = useState<string | null>(null);
  const [headerLogoDarkUrl, setHeaderLogoDarkUrl] = useState<string | null>(null);
  const [_defaultHeaderLogoLightUrlInternal, _setDefaultHeaderLogoLightUrlInternal] = useState<string | null>(null);
  const [_defaultHeaderLogoDarkUrlInternal, _setDefaultHeaderLogoDarkUrlInternal] = useState<string | null>(null);
  
  const [currentUserThemeSettings, setCurrentUserThemeSettings] = useState<UserThemeSettings | null>(null);
  
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const applyUserThemeSettings = useCallback((settings: UserThemeSettings | null) => {
    const currentThemeKey = (resolvedTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
    console.log('[AuthContext] applyUserThemeSettings. Settings:', settings, "ThemeKey:", currentThemeKey);

    applyCustomColorToCssVar('--accent', settings?.accentColor || null, currentThemeKey, DEFAULT_ACCENT_HSL[currentThemeKey]);
    applyCustomColorToCssVar('--chart-pie-1', settings?.chartPieColorOpen || null, currentThemeKey, DEFAULT_CHART_PIE_COLORS_HSL['--chart-pie-1'][currentThemeKey]);
    applyCustomColorToCssVar('--chart-pie-2', settings?.chartPieColorClosed || null, currentThemeKey, DEFAULT_CHART_PIE_COLORS_HSL['--chart-pie-2'][currentThemeKey]);
    applyCustomColorToCssVar('--chart-pie-3', settings?.chartPieColorMissed || null, currentThemeKey, DEFAULT_CHART_PIE_COLORS_HSL['--chart-pie-3'][currentThemeKey]);
    applyCustomColorToCssVar('--chart-pie-4', settings?.chartPieColorOther || null, currentThemeKey, DEFAULT_CHART_PIE_COLORS_HSL['--chart-pie-4'][currentThemeKey]);
  }, [resolvedTheme]);

  useEffect(() => {
    console.log('[AuthContext] Initial useEffect running - ONCE.');
    setIsLoadingAuth(true);
    
    setHeaderLogoLightUrl(getData<string>(DataItemType.HeaderLogoLight));
    setHeaderLogoDarkUrl(getData<string>(DataItemType.HeaderLogoDark));
    _setDefaultHeaderLogoLightUrlInternal(getData<string>(DataItemType.DefaultHeaderLogoLight));
    _setDefaultHeaderLogoDarkUrlInternal(getData<string>(DataItemType.DefaultHeaderLogoDark));

    let users = getData<User[]>(DataItemType.Users) || [];
    if (users.length === 0) {
      const defaultAdminId = `user-${Date.now()}-admin`;
      const defaultPin = '0000';
      const defaultAdmin: User = {
        id: defaultAdminId,
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
        cloudPinHash: userManagement.hashPin(defaultPin, defaultAdminId),
        isActive: true,
        createdAt: new Date().toISOString(),
        deviceIds: [],
        permissions: userManagement.getDefaultPermissions('admin'),
        profilePictureUrl: `https://placehold.co/128x128.png/${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}/ffffff?text=A&font=montserrat`
      };
      users = [defaultAdmin];
      if(saveData<User[]>(DataItemType.Users, users)) {
        toast({ title: "Default Admin Created", description: "PIN 0000.", duration: 7000 });
      }
    }

    const storedUserId = getData<string>(DataItemType.CurrentUserId);
    const allUserPrefs = getData<UserPreferences>(DataItemType.UserThemePreferences) || {};

    if (storedUserId) {
      const user = users.find(u => u.id === storedUserId);
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        const userPrefs = allUserPrefs[user.id] || {};
        setCurrentUserThemeSettings(userPrefs);
        applyUserThemeSettings(userPrefs);
      } else {
        localStorage.removeItem(DataItemType.CurrentUserId);
        applyUserThemeSettings(null); 
      }
    } else {
      applyUserThemeSettings(null); 
    }
    setIsLoadingAuth(false);
  }, [toast, applyUserThemeSettings]);

  useEffect(() => {
    if (!isLoadingAuth) { 
        applyUserThemeSettings(currentUserThemeSettings);
    }
  }, [resolvedTheme, currentUserThemeSettings, isLoadingAuth, applyUserThemeSettings]);


  const login = async (selectedUserId: string, pinInput: string): Promise<boolean> => {
    setIsLoadingAuth(true);
    const users = getData<User[]>(DataItemType.Users) || [];
    const userToLogin = users.find(u => u.id === selectedUserId);

    if (!userToLogin) {
      toast({ title: "Login Failed", description: "User not found.", variant: "destructive" });
      setIsLoadingAuth(false);
      return false;
    }

    if (!userToLogin.pin) {
      setPinSetupRequiredForUser(userToLogin);
      setIsAuthenticated(false);
      setCurrentUser(null);
      localStorage.removeItem(DataItemType.CurrentUserId);
      toast({ title: "PIN Setup Required", description: `Welcome ${userToLogin.name}! Please set your PIN.`, variant: "default" });
      setIsLoadingAuth(false);
      return false;
    }

    if (userToLogin.pin === pinInput) {
      setCurrentUser(userToLogin);
      setIsAuthenticated(true);
      setPinSetupRequiredForUser(null);
      saveData<string>(DataItemType.CurrentUserId, userToLogin.id);
      
      const allUserPrefs = getData<UserPreferences>(DataItemType.UserThemePreferences) || {};
      const userPrefs = allUserPrefs[userToLogin.id] || {};
      setCurrentUserThemeSettings(userPrefs);
      applyUserThemeSettings(userPrefs); 

      toast({ title: "Login Successful", description: `Welcome back, ${userToLogin.name}!` });
      setIsLoadingAuth(false);
      return true;
    }

    toast({ title: "Login Failed", description: "Invalid PIN.", variant: "destructive" });
    setIsLoadingAuth(false);
    return false;
  };

  const logout = useCallback(async () => {
    // Revoke Google tokens if they exist
    const googleDriveAccessToken = localStorage.getItem(DataItemType.GoogleDriveAccessToken);
    const googleCalendarAccessToken = localStorage.getItem(DataItemType.GoogleCalendarAccessToken);
    
    // Try to revoke Google Drive tokens
    if (googleDriveAccessToken) {
      try {
        await revokeGoogleTokensAction(googleDriveAccessToken);
      } catch (error) {
        console.warn('Failed to revoke Google Drive tokens:', error);
      }
    }
    
    // Try to revoke Google Calendar tokens (if different from Drive)
    if (googleCalendarAccessToken && googleCalendarAccessToken !== googleDriveAccessToken) {
      try {
        await revokeGoogleTokensAction(googleCalendarAccessToken);
      } catch (error) {
        console.warn('Failed to revoke Google Calendar tokens:', error);
      }
    }
    
    // Clear all Google-related tokens from localStorage
    localStorage.removeItem(DataItemType.GoogleDriveAccessToken);
    localStorage.removeItem(DataItemType.GoogleDriveRefreshToken);
    localStorage.removeItem(DataItemType.GoogleCalendarAccessToken);
    localStorage.removeItem(DataItemType.GoogleCalendarRefreshToken);
    
    // Clear user session
    setCurrentUser(null);
    setIsAuthenticated(false);
    setPinSetupRequiredForUser(null);
    setCurrentUserThemeSettings(null);
    localStorage.removeItem(DataItemType.CurrentUserId);
    applyUserThemeSettings(null); 
    toast({ title: "Logged Out", description: "You have been successfully logged out and disconnected from Google services." });
   }, [toast, applyUserThemeSettings]);

  // New cloud-first authentication methods
  const authenticateWithPin = async (userId: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    console.log('[AuthContext] authenticateWithPin called with userId:', userId, 'pin:', pin);
    setIsLoadingAuth(true);
    try {
      const result = await userManagement.authenticateUser(userId, pin);
      console.log('[AuthContext] authenticateUser result:', result);
      
      if (result.success && result.user) {
        console.log('[AuthContext] Authentication successful, setting user:', result.user);
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        setPinSetupRequiredForUser(null);
        saveData<string>(DataItemType.CurrentUserId, result.user.id);
        
        const allUserPrefs = getData<UserPreferences>(DataItemType.UserThemePreferences) || {};
        const userPrefs = allUserPrefs[result.user.id] || {};
        setCurrentUserThemeSettings(userPrefs);
        applyUserThemeSettings(userPrefs);
        
        toast({ title: "Login Successful", description: `Welcome back, ${result.user.name}!` });
      } else {
        console.log('[AuthContext] Authentication failed:', result.error);
        toast({ title: "Login Failed", description: result.error || "Authentication failed", variant: "destructive" });
      }
      
      setIsLoadingAuth(false);
      return result;
    } catch (error: any) {
      setIsLoadingAuth(false);
      const errorMsg = error.message || "Authentication error";
      console.log('[AuthContext] Authentication error:', errorMsg);
      toast({ title: "Login Error", description: errorMsg, variant: "destructive" });
      return { success: false, error: errorMsg };
    }
  };

  const createUser = async (
    userData: Omit<User, 'id' | 'permissions' | 'createdAt' | 'cloudPinHash' | 'deviceIds'>,
    pin: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: "Must be logged in to create users" };
    }
    
    try {
      const result = await userManagement.createUser(userData, pin, currentUser.id);
      
      if (result.success) {
        toast({ title: "User Created", description: `Successfully created user ${userData.name}` });
      } else {
        toast({ title: "Creation Failed", description: result.error || "Failed to create user", variant: "destructive" });
      }
      
      return result;
    } catch (error: any) {
      const errorMsg = error.message || "User creation error";
      toast({ title: "Creation Error", description: errorMsg, variant: "destructive" });
      return { success: false, error: errorMsg };
    }
  };

  const changePin = async (oldPin: string, newPin: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: "Must be logged in to change PIN" };
    }
    
    try {
      const result = await userManagement.changeUserPin(currentUser.id, oldPin, newPin);
      
      if (result.success) {
        toast({ title: "PIN Changed", description: "Your PIN has been successfully updated" });
      } else {
        toast({ title: "PIN Change Failed", description: result.error || "Failed to change PIN", variant: "destructive" });
      }
      
      return result;
    } catch (error: any) {
      const errorMsg = error.message || "PIN change error";
      toast({ title: "PIN Change Error", description: errorMsg, variant: "destructive" });
      return { success: false, error: errorMsg };
    }
  };

  const getAllUsers = async (): Promise<{ success: boolean; users?: User[]; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: "Must be logged in to view users" };
    }
    
    try {
      const result = await userManagement.getAllUsers(currentUser.id);
      
      if (!result.success) {
        toast({ title: "Access Denied", description: result.error || "Cannot access user list", variant: "destructive" });
      }
      
      return result;
    } catch (error: any) {
      const errorMsg = error.message || "Error fetching users";
      toast({ title: "Fetch Error", description: errorMsg, variant: "destructive" });
      return { success: false, error: errorMsg };
    }
  };

  const completePinSetupAndLogin = async (userId: string, newPin: string): Promise<boolean> => {
    setIsLoadingAuth(true);
    let users = getData<User[]>(DataItemType.Users) || [];
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      toast({ title: "Error", description: "User not found for PIN setup.", variant: "destructive" });
      setIsLoadingAuth(false);
      return false;
    }

    users[userIndex] = { ...users[userIndex], pin: newPin };
    if (!saveData<User[]>(DataItemType.Users, users)) { 
        toast({ title: "Storage Error", description: "Could not save PIN.", variant: "destructive" });
        setIsLoadingAuth(false); return false; 
    }
    
    const userToLogin = users[userIndex];
    setCurrentUser(userToLogin);
    setIsAuthenticated(true);
    setPinSetupRequiredForUser(null);
    saveData<string>(DataItemType.CurrentUserId, userToLogin.id);

    const allUserPrefs = getData<UserPreferences>(DataItemType.UserThemePreferences) || {};
    const userPrefs = allUserPrefs[userToLogin.id] || {}; 
    setCurrentUserThemeSettings(userPrefs);
    applyUserThemeSettings(userPrefs); 
    
    toast({ title: "PIN Set Successfully", description: `Welcome, ${userToLogin.name}!` });
    setIsLoadingAuth(false);
    return true;
  };

  const updateUserProfilePicture = async (dataUri: string): Promise<boolean> => {
    if (!currentUser) { toast({ title: "Error", description: "No user logged in.", variant: "destructive" }); return false; }
    setIsLoadingAuth(true);
    let users = getData<User[]>(DataItemType.Users) || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) { toast({ title: "Error", description: "Current user not found.", variant: "destructive" }); setIsLoadingAuth(false); return false; }
    const updatedUser = { ...users[userIndex], profilePictureUrl: dataUri };
    users[userIndex] = updatedUser;
    if (!saveData<User[]>(DataItemType.Users, users)) { toast({ title: "Storage Error", description: "Could not save profile picture."}); }
    setCurrentUser(updatedUser);
    toast({ title: "Profile Picture Updated" });
    setIsLoadingAuth(false); return true;
  };
  
  const updateLogo = useCallback((
    setter: React.Dispatch<React.SetStateAction<string | null>>, 
    itemType: DataItemType, 
    dataUri: string | null, 
    toastTitle: string
  ) => {
    const success = dataUri ? saveData<string>(itemType, dataUri) : (localStorage.removeItem(itemType), true);
    if (success) {
      setter(dataUri);
      toast({ title: toastTitle, description: dataUri ? "Logo changed." : "Logo cleared/reset." });
    } else {
      toast({ title: "Storage Full", description: `Could not save ${toastTitle}.`, variant: "destructive" });
    }
  }, [toast]);

  const updateHeaderLogoLight = useCallback((dataUri: string | null) => updateLogo(setHeaderLogoLightUrl, DataItemType.HeaderLogoLight, dataUri, "Light Header Logo"), [updateLogo]);
  const updateHeaderLogoDark = useCallback((dataUri: string | null) => updateLogo(setHeaderLogoDarkUrl, DataItemType.HeaderLogoDark, dataUri, "Dark Header Logo"), [updateLogo]);
  
  const setDefaultHeaderLogoLight = useCallback((dataUri: string) => {
    if (saveData<string>(DataItemType.DefaultHeaderLogoLight, dataUri)) {
      _setDefaultHeaderLogoLightUrlInternal(dataUri);
      updateHeaderLogoLight(null); 
      toast({ title: "Default Light Header Logo Set" });
    } else { toast({ title: "Storage Full", variant: "destructive" }); }
  }, [updateHeaderLogoLight, toast]);

  const setDefaultHeaderLogoDark = useCallback((dataUri: string) => {
    if (saveData<string>(DataItemType.DefaultHeaderLogoDark, dataUri)) {
      _setDefaultHeaderLogoDarkUrlInternal(dataUri);
      updateHeaderLogoDark(null);
      toast({ title: "Default Dark Header Logo Set" });
    } else { toast({ title: "Storage Full", variant: "destructive" }); }
  }, [updateHeaderLogoDark, toast]);

  const updateUserThemePreference = useCallback((
    colorType: keyof UserThemeSettings,
    hexColor: string | null,
    cssVarName: string,
    defaultHsl: string 
  ) => {
    if (!currentUser) return;
    const currentThemeKey = (resolvedTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
    
    const allUserPrefs = getData<UserPreferences>(DataItemType.UserThemePreferences) || {};
    let userPrefs = allUserPrefs[currentUser.id] || {};
    
    const oldColor = userPrefs[colorType];

    if (hexColor === null) { 
      delete userPrefs[colorType]; 
    } else {
      userPrefs[colorType] = hexColor;
    }
    
    allUserPrefs[currentUser.id] = userPrefs;

    if (saveData<UserPreferences>(DataItemType.UserThemePreferences, allUserPrefs)) {
      setCurrentUserThemeSettings(prev => ({...prev, ...userPrefs})); 
      applyCustomColorToCssVar(cssVarName, hexColor, currentThemeKey, defaultHsl); 
      toast({ title: `${cssVarName.replace('--','').replace('chart-pie-','Chart ').replace('-',' ')} Updated`, description: hexColor ? `Set to ${hexColor}` : "Reset to default." });
    } else {
      if (oldColor === undefined) delete userPrefs[colorType]; else userPrefs[colorType] = oldColor;
      allUserPrefs[currentUser.id] = userPrefs; 
      setCurrentUserThemeSettings(prev => ({...prev, ...userPrefs}));
      toast({ title: "Storage Error", description: "Could not save theme preference.", variant: "destructive" });
    }
  }, [currentUser, resolvedTheme, toast, applyUserThemeSettings]); // applyUserThemeSettings might not be needed if applyCustomColorToCssVar is sufficient

  const updateCustomAccentColor = useCallback((hexColor: string | null) => {
    const currentThemeKey = (resolvedTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
    updateUserThemePreference('accentColor', hexColor, '--accent', DEFAULT_ACCENT_HSL[currentThemeKey]);
  }, [updateUserThemePreference, resolvedTheme]);

  const updateChartPieColorOpen = useCallback((hexColor: string | null) => {
     const currentThemeKey = (resolvedTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
    updateUserThemePreference('chartPieColorOpen', hexColor, '--chart-pie-1', DEFAULT_CHART_PIE_COLORS_HSL['--chart-pie-1'][currentThemeKey]);
  }, [updateUserThemePreference, resolvedTheme]);
  const updateChartPieColorClosed = useCallback((hexColor: string | null) => {
    const currentThemeKey = (resolvedTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
    updateUserThemePreference('chartPieColorClosed', hexColor, '--chart-pie-2', DEFAULT_CHART_PIE_COLORS_HSL['--chart-pie-2'][currentThemeKey]);
  }, [updateUserThemePreference, resolvedTheme]);
  const updateChartPieColorMissed = useCallback((hexColor: string | null) => {
    const currentThemeKey = (resolvedTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
    updateUserThemePreference('chartPieColorMissed', hexColor, '--chart-pie-3', DEFAULT_CHART_PIE_COLORS_HSL['--chart-pie-3'][currentThemeKey]);
  }, [updateUserThemePreference, resolvedTheme]);
  const updateChartPieColorOther = useCallback((hexColor: string | null) => {
    const currentThemeKey = (resolvedTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
    updateUserThemePreference('chartPieColorOther', hexColor, '--chart-pie-4', DEFAULT_CHART_PIE_COLORS_HSL['--chart-pie-4'][currentThemeKey]);
  }, [updateUserThemePreference, resolvedTheme]);


  const contextValue = useMemo(() => {
    return {
        currentUser, isAuthenticated, isLoadingAuth, pinSetupRequiredForUser,
        headerLogoLightUrl, headerLogoDarkUrl, 
        defaultHeaderLogoLightUrl: _defaultHeaderLogoLightUrlInternal, 
        defaultHeaderLogoDarkUrl: _defaultHeaderLogoDarkUrlInternal,
        currentUserThemeSettings,
        login, logout, authenticateWithPin, createUser, changePin, getAllUsers,
        completePinSetupAndLogin, updateUserProfilePicture,
        updateHeaderLogoLight, updateHeaderLogoDark, 
        setDefaultHeaderLogoLight, setDefaultHeaderLogoDark,
        updateCustomAccentColor,
        updateChartPieColorOpen, updateChartPieColorClosed, updateChartPieColorMissed, updateChartPieColorOther,
    };
  }, [
    currentUser, isAuthenticated, isLoadingAuth, pinSetupRequiredForUser,
    headerLogoLightUrl, headerLogoDarkUrl, _defaultHeaderLogoLightUrlInternal, _defaultHeaderLogoDarkUrlInternal,
    currentUserThemeSettings,
    login, logout, authenticateWithPin, createUser, changePin, getAllUsers,
    completePinSetupAndLogin, updateUserProfilePicture,
    updateHeaderLogoLight, updateHeaderLogoDark, setDefaultHeaderLogoLight, setDefaultHeaderLogoDark,
    updateCustomAccentColor,
    updateChartPieColorOpen, updateChartPieColorClosed, updateChartPieColorMissed, updateChartPieColorOther,
  ]);
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
