
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import type { User, UserThemeSettings, UserPreferences } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData, saveData, hexToHslString } from '@/lib/utils';
import { userManagement } from '@/services/user-management';
// Dynamic import to prevent server-side modules from being bundled on client
// import { getCloudDatabase } from '@/services/shared-cloud-database';
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
  isInitialAdminSetupRequired: boolean; // Added

  headerLogoLightUrl: string | null;
  headerLogoDarkUrl: string | null;
  defaultHeaderLogoLightUrl: string | null;
  defaultHeaderLogoDarkUrl: string | null;

  currentUserThemeSettings: UserThemeSettings | null;

  login: (selectedUserId: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  authenticateWithPin: (userId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  createUser: (userData: Omit<User, 'id' | 'permissions' | 'createdAt' | 'cloudPinHash' | 'deviceIds'>, pin: string, creatorId?: string) => Promise<{ success: boolean; user?: User; error?: string }>; // Modified to include optional creatorId
  changePin: (oldPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  getAllUsers: () => Promise<{ success: boolean; users?: User[]; error?: string }>;
  completePinSetupAndLogin: (userId: string, newPin: string) => Promise<boolean>;
  updateUserProfilePicture: (dataUri: string) => Promise<boolean>;
  completeInitialAdminSetup: (adminName: string, adminEmail: string, adminPin: string) => Promise<boolean>; // Added
  adminResetUserPin: (targetUserId: string, newPin: string) => Promise<{ success: boolean; error?: string }>; // Added

  updateHeaderLogoLight: (dataUri: string | null) => void;
  updateHeaderLogoDark: (dataUri: string | null) => void;
  setDefaultHeaderLogoLight: (dataUri: string) => void;
  setDefaultHeaderLogoDark: (dataUri: string) => void;

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [pinSetupRequiredForUser, setPinSetupRequiredForUser] = useState<User | null>(null);
  const [isInitialAdminSetupRequired, setIsInitialAdminSetupRequired] = useState<boolean>(false);
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
        profilePictureUrl: `data:image/svg+xml;base64,${btoa(`<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg"><rect width="128" height="128" fill="#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}"/><text x="64" y="74" font-family="Arial" font-size="48" fill="white" text-anchor="middle">A</text></svg>`)}`
      };
      users = [defaultAdmin];
      if(saveData<User[]>(DataItemType.Users, users)) {
        toast({ title: "Default Admin Created", description: "PIN 0000.", duration: 7000 });
      }
    }

    const storedUserId = getData<string>(DataItemType.CurrentUserId);
    const allUserPrefs = getData<UserPreferences>(DataItemType.ThemePreference) || {};

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
      
      const allUserPrefs = getData<UserPreferences>(DataItemType.ThemePreference) || {};
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
        await revokeGoogleTokensAction();
      } catch (error) {
        console.warn('Failed to revoke Google Drive tokens:', error);
      }
    }
    
    // Try to revoke Google Calendar tokens (if different from Drive)
    if (googleCalendarAccessToken && googleCalendarAccessToken !== googleDriveAccessToken) {
      try {
        await revokeGoogleTokensAction();
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
        
        const allUserPrefs = getData<UserPreferences>(DataItemType.ThemePreference) || {};
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
    pin: string,
    creatorId?: string // Optional: ID of the user creating this user (for auditing or permissions)
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    // If creatorId is not provided, and a currentUser exists, use currentUser.id
    // This allows initial admin setup to call this without a logged-in user initially.
    const effectiveCreatorId = creatorId || currentUser?.id;

    if (!effectiveCreatorId && userData.role !== 'admin') { // Allow admin creation without a creator during initial setup
      return { success: false, error: "Creator ID is required to create non-admin users" };
    }
    
    try {
      // For the very first admin, creatorId might be undefined.
      // The userManagement.createUser should handle this scenario or be adapted.
      const result = await userManagement.createUser(userData, pin, effectiveCreatorId);
      
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

  const getAllUsers = async (): Promise<{ success: boolean; users?: User[]; error?: string }> => {
    try {
      if (!currentUser) {
        return { success: false, error: "No user logged in." };
      }
      const result = await userManagement.getAllUsers(currentUser.id);
      return result;
    } catch (error: any) {
      const errorMessage = error.message || "Could not retrieve user list.";
      console.error("Error fetching all users:", error);
      toast({ title: "Error Fetching Users", description: errorMessage, variant: "destructive" });
      return { success: false, error: errorMessage };
    }
  };

  const changePin = async (oldPin: string, newPin: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: "No user logged in." };
    }
    setIsLoadingAuth(true);
    try {
      const result = await userManagement.changeUserPin(currentUser.id, oldPin, newPin);
      if (result.success) {
        // Optionally re-fetch or update currentUser if the user object itself changes (e.g., lastPinChangeDate)
        // For now, we assume the pin change doesn't alter other currentUser details visible in the app immediately.
        // If the user object in local storage needs updating (e.g. if pin hash was stored there, which it isn't directly for `currentUser` state)
        // you would update it here.
        toast({ title: "PIN Changed", description: "Your PIN has been successfully updated." });
      } else {
        toast({ title: "PIN Change Failed", description: result.error || "Failed to change PIN.", variant: "destructive" });
      }
      setIsLoadingAuth(false);
      return result;
    } catch (error: any) {
      setIsLoadingAuth(false);
      const errorMsg = error.message || "PIN change error";
      toast({ title: "PIN Change Error", description: errorMsg, variant: "destructive" });
      return { success: false, error: errorMsg };
    }
  };

  const completeInitialAdminSetup = async (adminName: string, adminEmail: string, adminPin: string): Promise<boolean> => {
    setIsLoadingAuth(true);
    const adminUserData: Omit<User, 'id' | 'permissions' | 'createdAt' | 'cloudPinHash' | 'deviceIds'> = {
      name: adminName,
      email: adminEmail,
      role: 'admin',
      profilePictureUrl: '', // Default or allow upload later
      // pin will be handled by createUser
    };

    const result = await createUser(adminUserData, adminPin); // Pass undefined for creatorId for the first admin

    if (result.success && result.user) {
      setCurrentUser(result.user);
      setIsAuthenticated(true);
      setPinSetupRequiredForUser(null);
      setIsInitialAdminSetupRequired(false);
      saveData<string>(DataItemType.CurrentUserId, result.user.id);
      
      const allUserPrefs = getData<UserPreferences>(DataItemType.ThemePreference) || {};
      const userPrefs = allUserPrefs[result.user.id] || {};
      setCurrentUserThemeSettings(userPrefs);
      applyUserThemeSettings(userPrefs); 

      toast({ title: "Admin Setup Successful", description: `Welcome, ${result.user.name}!` });
      setIsLoadingAuth(false);
      return true;
    } else {
      toast({ title: "Admin Setup Failed", description: result.error || "Could not create admin user.", variant: "destructive" });
      setIsLoadingAuth(false);
      return false;
    }
  };

  const adminResetUserPin = async (targetUserId: string, newPin: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: "Unauthorized: Only admins can reset PINs." };
    }
    if (currentUser.id === targetUserId) {
        return { success: false, error: "Admin cannot reset their own PIN using this function. Please use Change PIN feature." };
    }

    setIsLoadingAuth(true);
    try {
      // This implementation assumes local data management primarily.
      // For cloud-synced users, userManagement.adminResetUserPin should be called here.
      // For now, we'll focus on the local data update path.
      const result = await userManagement.adminResetUserPin(currentUser.id, targetUserId, newPin);

      if (result.success) {
        toast({ title: "PIN Reset Successful", description: `PIN for user ${targetUserId} has been reset.` });
      } else {
        toast({ title: "PIN Reset Failed", description: result.error || "Failed to reset PIN.", variant: "destructive" });
      }
      setIsLoadingAuth(false);
      return result;
    } catch (error: any) {
      setIsLoadingAuth(false);
      const errorMsg = error.message || "PIN reset error";
      toast({ title: "PIN Reset Error", description: errorMsg, variant: "destructive" });
      return { success: false, error: errorMsg };
    }
  };

  const completePinSetupAndLogin = async (userId: string, newPin: string): Promise<boolean> => {
    setIsLoadingAuth(true);
    try {
      const result = await userManagement.setUserPin(userId, newPin);
      if (result.success && result.user) {
        // Attempt to log in the user immediately after PIN setup
        const loginSuccess = await authenticateWithPin(userId, newPin);
        if (loginSuccess.success) {
          setPinSetupRequiredForUser(null); // Clear the requirement
          toast({ title: "PIN Setup Successful", description: `Welcome, ${result.user.name}! You are now logged in.` });
          setIsLoadingAuth(false);
          return true;
        } else {
          // PIN was set, but immediate login failed. This is unusual.
          // User might need to log in manually.
          toast({ title: "PIN Set, Login Required", description: "Your PIN has been set. Please log in.", variant: "default" });
          setIsLoadingAuth(false);
          return false; // Indicates PIN set, but login not automatic
        }
      } else {
        toast({ title: "PIN Setup Failed", description: result.error || "Could not set PIN.", variant: "destructive" });
        setIsLoadingAuth(false);
        return false;
      }
    } catch (error: any) {
      setIsLoadingAuth(false);
      const errorMsg = error.message || "PIN setup error";
      toast({ title: "PIN Setup Error", description: errorMsg, variant: "destructive" });
      return false;
    }
  };

  const updateUserProfilePicture = async (dataUri: string): Promise<boolean> => {
    if (!currentUser) {
      toast({ title: "Error", description: "No user logged in.", variant: "destructive" });
      return false;
    }
    try {
      const success = await userManagement.updateUserProfilePicture(currentUser.id, dataUri);
      if (success) {
        // Optimistically update the currentUser state or re-fetch
        const updatedUser = { ...currentUser, profilePictureUrl: dataUri };
        setCurrentUser(updatedUser);
        // Update local storage if necessary (userManagement might already do this)
        const users = getData<User[]>(DataItemType.Users) || [];
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
          users[userIndex] = updatedUser;
          saveData<User[]>(DataItemType.Users, users);
        }
        toast({ title: "Profile Picture Updated", description: "Your profile picture has been changed." });
        return true;
      } else {
        toast({ title: "Update Failed", description: "Could not update profile picture.", variant: "destructive" });
        return false;
      }
    } catch (error: any) {
      toast({ title: "Update Error", description: error.message || "An error occurred.", variant: "destructive" });
      return false;
    }
  };

  const updateHeaderLogoLight = async (logoUrl: string): Promise<boolean> => {
    // Placeholder implementation - replace with actual logic
    console.log('updateHeaderLogoLight called with:', logoUrl);
    setHeaderLogoLightUrl(logoUrl);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: "Success", description: "Light header logo updated." });
    return true;
  };

  const updateHeaderLogoDark = async (logoUrl: string): Promise<boolean> => {
    // Placeholder implementation - replace with actual logic
    console.log('updateHeaderLogoDark called with:', logoUrl);
    setHeaderLogoDarkUrl(logoUrl);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: "Success", description: "Dark header logo updated." });
    return true;
  };

  const setDefaultHeaderLogoLight = async (): Promise<boolean> => {
    // Placeholder implementation - replace with actual logic
    console.log('setDefaultHeaderLogoLight called');
    setHeaderLogoLightUrl(_defaultHeaderLogoLightUrlInternal);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: "Success", description: "Light header logo reset to default." });
    return true;
  };

  const setDefaultHeaderLogoDark = async (): Promise<boolean> => {
    // Placeholder implementation - replace with actual logic
    console.log('setDefaultHeaderLogoDark called');
    setHeaderLogoDarkUrl(_defaultHeaderLogoDarkUrlInternal);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: "Success", description: "Dark header logo reset to default." });
    return true;
  };

  const updateCustomAccentColor = async (color: string): Promise<boolean> => {
    // Placeholder implementation - replace with actual logic
    console.log('updateCustomAccentColor called with:', color);
    // setCurrentUserThemeSettings(prev => ({ ...prev, customAccentColor: color }));
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: "Success", description: "Custom accent color updated." });
    return true;
  };

  const updateChartPieColorOpen = async (color: string): Promise<boolean> => {
    // Placeholder implementation - replace with actual logic
    console.log('updateChartPieColorOpen called with:', color);
    // setCurrentUserThemeSettings(prev => ({ ...prev, chartPieColorOpen: color }));
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: "Success", description: "Chart 'Open' color updated." });
    return true;
  };

  const updateChartPieColorClosed = async (color: string): Promise<boolean> => {
    // Placeholder implementation - replace with actual logic
    console.log('updateChartPieColorClosed called with:', color);
    // setCurrentUserThemeSettings(prev => ({ ...prev, chartPieColorClosed: color }));
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: "Success", description: "Chart 'Closed' color updated." });
    return true;
  };

  const updateChartPieColorMissed = async (color: string): Promise<boolean> => {
    // Placeholder implementation - replace with actual logic
    console.log('updateChartPieColorMissed called with:', color);
    // setCurrentUserThemeSettings(prev => ({ ...prev, chartPieColorMissed: color }));
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: "Success", description: "Chart 'Missed' color updated." });
    return true;
  };

  const updateChartPieColorOther = async (color: string): Promise<boolean> => {
    // Placeholder implementation - replace with actual logic
    console.log('updateChartPieColorOther called with:', color);
    // setCurrentUserThemeSettings(prev => ({ ...prev, chartPieColorOther: color }));
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: "Success", description: "Chart 'Other' color updated." });
    return true;
  };

  const contextValue = useMemo(() => {
    return {
        currentUser, isAuthenticated, isLoadingAuth, pinSetupRequiredForUser,
        isInitialAdminSetupRequired, // Add this
        headerLogoLightUrl, headerLogoDarkUrl, 
        defaultHeaderLogoLightUrl: _defaultHeaderLogoLightUrlInternal, 
        defaultHeaderLogoDarkUrl: _defaultHeaderLogoDarkUrlInternal,
        currentUserThemeSettings,
        login, logout, authenticateWithPin, createUser, changePin, getAllUsers,
        completePinSetupAndLogin, updateUserProfilePicture,
        completeInitialAdminSetup, // Add this
        adminResetUserPin, // Add this
        updateHeaderLogoLight, updateHeaderLogoDark, 
        setDefaultHeaderLogoLight, setDefaultHeaderLogoDark,
        updateCustomAccentColor,
        updateChartPieColorOpen, updateChartPieColorClosed, updateChartPieColorMissed, updateChartPieColorOther,
    };
  }, [
    currentUser, isAuthenticated, isLoadingAuth, pinSetupRequiredForUser,
    isInitialAdminSetupRequired, // Add this
    headerLogoLightUrl, headerLogoDarkUrl, _defaultHeaderLogoLightUrlInternal, _defaultHeaderLogoDarkUrlInternal,
    currentUserThemeSettings,
    login, logout, authenticateWithPin, createUser, changePin, getAllUsers,
    completePinSetupAndLogin, updateUserProfilePicture,
    completeInitialAdminSetup, // Add this
    adminResetUserPin, // Add this
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
