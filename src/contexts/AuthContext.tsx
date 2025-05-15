
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData, saveData, hexToHslString } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Default HSL values from globals.css for chart pie slices
const DEFAULT_CHART_PIE_COLORS_HSL: Record<string, string> = {
  '--chart-pie-1': '180 100% 25%', // Teal for 'Open' (light theme)
  '--chart-pie-2': '210 100% 45%', // Blue for 'Closed' (light theme)
  '--chart-pie-3': '40 100% 50%',  // Yellow/Orange for 'Missed' (light theme)
  '--chart-pie-4': '220 10% 60%',  // Gray for 'Other' (light theme)
};
const DEFAULT_DARK_CHART_PIE_COLORS_HSL: Record<string, string> = {
  '--chart-pie-1': '180 100% 35%', // Lighter Teal for 'Open' (dark theme)
  '--chart-pie-2': '210 90% 55%',  // Lighter Blue for 'Closed' (dark theme)
  '--chart-pie-3': '40 90% 60%',   // Lighter Yellow/Orange for 'Missed' (dark theme)
  '--chart-pie-4': '220 10% 50%',  // Darker Gray for 'Other' (dark theme)
};


interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  pinSetupRequiredForUser: User | null;
  
  appLogoLightUrl: string | null;
  appLogoDarkUrl: string | null;
  defaultAppLogoLightUrl: string | null;
  defaultAppLogoDarkUrl: string | null;
  headerLogoLightUrl: string | null;
  headerLogoDarkUrl: string | null;
  customAccentColor: string | null;

  chartPieColorOpen: string | null;
  chartPieColorClosed: string | null;
  chartPieColorMissed: string | null;
  chartPieColorOther: string | null;

  login: (selectedUserId: string, pin: string) => Promise<boolean>;
  logout: () => void;
  completePinSetupAndLogin: (userId: string, newPin: string) => Promise<boolean>;
  updateUserProfilePicture: (dataUri: string) => Promise<boolean>;

  updateAppLogoLight: (dataUri: string | null) => void;
  updateAppLogoDark: (dataUri: string | null) => void;
  setDefaultAppLogoLight: (dataUri: string) => void;
  setDefaultAppLogoDark: (dataUri: string) => void;
  updateHeaderLogoLight: (dataUri: string | null) => void;
  updateHeaderLogoDark: (dataUri: string | null) => void;
  updateCustomAccentColor: (newColor: string | null) => void;

  updateChartPieColorOpen: (hexColor: string | null) => void;
  updateChartPieColorClosed: (hexColor: string | null) => void;
  updateChartPieColorMissed: (hexColor: string | null) => void;
  updateChartPieColorOther: (hexColor: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to apply accent color dynamically
const applyCustomColorToCssVar = (cssVarName: string, colorHex: string | null, defaultHslValue?: string) => {
  if (typeof window === 'undefined') return; 
  if (!colorHex) {
    if (defaultHslValue) {
      document.documentElement.style.setProperty(cssVarName, defaultHslValue);
      console.log(`[AuthContext] applyCustomColorToCssVar: Reset ${cssVarName} to default HSL: ${defaultHslValue}`);
    } else {
      document.documentElement.style.removeProperty(cssVarName);
      console.log(`[AuthContext] applyCustomColorToCssVar: Removed ${cssVarName}.`);
    }
    return;
  }
  const hslString = hexToHslString(colorHex);
  if (hslString) {
    document.documentElement.style.setProperty(cssVarName, hslString);
    console.log(`[AuthContext] applyCustomColorToCssVar: Applied ${colorHex} as HSL to ${cssVarName}: ${hslString}`);
  } else {
    console.warn(`[AuthContext] applyCustomColorToCssVar: Could not convert ${colorHex} to HSL for ${cssVarName}. Using default.`);
    if (defaultHslValue) {
        document.documentElement.style.setProperty(cssVarName, defaultHslValue);
    } else if (cssVarName === '--accent') {
        document.documentElement.style.setProperty('--accent', '180 100% 25%'); 
    }
  }
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [pinSetupRequiredForUser, setPinSetupRequiredForUser] = useState<User | null>(null);
  
  const [appLogoLightUrl, setAppLogoLightUrl] = useState<string | null>(null);
  const [appLogoDarkUrl, setAppLogoDarkUrl] = useState<string | null>(null);
  const [_defaultAppLogoLightUrlInternal, _setDefaultAppLogoLightUrlInternal] = useState<string | null>(null);
  const [_defaultAppLogoDarkUrlInternal, _setDefaultAppLogoDarkUrlInternal] = useState<string | null>(null);
  const [headerLogoLightUrl, setHeaderLogoLightUrl] = useState<string | null>(null);
  const [headerLogoDarkUrl, setHeaderLogoDarkUrl] = useState<string | null>(null);
  const [customAccentColor, setCustomAccentColorState] = useState<string | null>(null);

  const [chartPieColorOpen, setChartPieColorOpen] = useState<string | null>(null);
  const [chartPieColorClosed, setChartPieColorClosed] = useState<string | null>(null);
  const [chartPieColorMissed, setChartPieColorMissed] = useState<string | null>(null);
  const [chartPieColorOther, setChartPieColorOther] = useState<string | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    console.log('[AuthContext] Initial useEffect running - ONCE.');
    setIsLoadingAuth(true);

    setAppLogoLightUrl(getData<string>(DataItemType.AppLogoLight));
    setAppLogoDarkUrl(getData<string>(DataItemType.AppLogoDark));
    
    const storedDefaultAppLogoLight = getData<string>(DataItemType.DefaultAppLogoLight);
    _setDefaultAppLogoLightUrlInternal(storedDefaultAppLogoLight);
    
    const storedDefaultAppLogoDark = getData<string>(DataItemType.DefaultAppLogoDark);
    _setDefaultAppLogoDarkUrlInternal(storedDefaultAppLogoDark);
    
    setHeaderLogoLightUrl(getData<string>(DataItemType.HeaderLogoLight));
    setHeaderLogoDarkUrl(getData<string>(DataItemType.HeaderLogoDark));

    const storedAccent = getData<string>(DataItemType.CustomAccentColor);
    setCustomAccentColorState(storedAccent);
    applyCustomColorToCssVar('--accent', storedAccent, '180 100% 25%'); // Default HSL for accent

    // Load and apply custom chart colors
    const currentThemeIsDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultPieColors = currentThemeIsDark ? DEFAULT_DARK_CHART_PIE_COLORS_HSL : DEFAULT_CHART_PIE_COLORS_HSL;

    const storedChartPieColorOpen = getData<string>(DataItemType.ChartPieColorOpen);
    setChartPieColorOpen(storedChartPieColorOpen);
    applyCustomColorToCssVar('--chart-pie-1', storedChartPieColorOpen, defaultPieColors['--chart-pie-1']);

    const storedChartPieColorClosed = getData<string>(DataItemType.ChartPieColorClosed);
    setChartPieColorClosed(storedChartPieColorClosed);
    applyCustomColorToCssVar('--chart-pie-2', storedChartPieColorClosed, defaultPieColors['--chart-pie-2']);

    const storedChartPieColorMissed = getData<string>(DataItemType.ChartPieColorMissed);
    setChartPieColorMissed(storedChartPieColorMissed);
    applyCustomColorToCssVar('--chart-pie-3', storedChartPieColorMissed, defaultPieColors['--chart-pie-3']);
    
    const storedChartPieColorOther = getData<string>(DataItemType.ChartPieColorOther);
    setChartPieColorOther(storedChartPieColorOther);
    applyCustomColorToCssVar('--chart-pie-4', storedChartPieColorOther, defaultPieColors['--chart-pie-4']);
    
    let users = getData<User[]>(DataItemType.Users) || [];
    if (users.length === 0) {
      const defaultAdmin: User = {
        id: `user-${Date.now()}-admin`,
        name: 'Admin',
        email: 'admin@example.com',
        role: 'partner',
        pin: '0000',
        profilePictureUrl: `https://placehold.co/128x128.png?text=A`,
      };
      users = [defaultAdmin];
      if(saveData<User[]>(DataItemType.Users, users)){
        toast({
          title: "Default Admin Created",
          description: "No users found. Default 'Admin' (partner) created with PIN 0000.",
          duration: 7000,
        });
      }
      window.dispatchEvent(new CustomEvent('dataChanged', { detail: { type: DataItemType.Users, data: users } }));
    }

    const storedUserId = getData<string>(DataItemType.CurrentUserId);
    if (storedUserId) {
      const currentUsersOnLoad = getData<User[]>(DataItemType.Users) || []; 
      const user = currentUsersOnLoad.find(u => u.id === storedUserId);
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem(DataItemType.CurrentUserId);
      }
    }
    setIsLoadingAuth(false);
  }, []); 

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
      toast({
        title: "PIN Setup Required",
        description: `Welcome ${userToLogin.name}! Please set your 4-digit PIN to continue.`,
        variant: "default"
      });
      setPinSetupRequiredForUser(userToLogin);
      setIsAuthenticated(false);
      setCurrentUser(null);
      localStorage.removeItem(DataItemType.CurrentUserId);
      setIsLoadingAuth(false);
      return false;
    }

    if (userToLogin.pin && pinInput === userToLogin.pin) {
      setCurrentUser(userToLogin);
      setIsAuthenticated(true);
      setPinSetupRequiredForUser(null);
      saveData<string>(DataItemType.CurrentUserId, userToLogin.id);
      toast({ title: "Login Successful", description: `Welcome back, ${userToLogin.name}!` });
      setIsLoadingAuth(false);
      return true;
    }

    toast({ title: "Login Failed", description: "Invalid PIN.", variant: "destructive" });
    setIsLoadingAuth(false);
    return false;
  };

  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setPinSetupRequiredForUser(null);
    localStorage.removeItem(DataItemType.CurrentUserId);
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  }, [toast]);

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
      toast({ title: "Storage Error", description: "Could not save PIN due to storage limitations.", variant: "destructive" });
      setIsLoadingAuth(false);
      return false;
    }

    setCurrentUser(users[userIndex]);
    setIsAuthenticated(true);
    setPinSetupRequiredForUser(null);
    saveData<string>(DataItemType.CurrentUserId, users[userIndex].id);
    toast({ title: "PIN Set Successfully", description: `Welcome, ${users[userIndex].name}! You are now logged in.` });
    setIsLoadingAuth(false);
    return true;
  };

  const updateUserProfilePicture = async (dataUri: string): Promise<boolean> => {
    if (!currentUser) {
      toast({ title: "Error", description: "No user logged in.", variant: "destructive" });
      return false;
    }
    setIsLoadingAuth(true);
    let users = getData<User[]>(DataItemType.Users) || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);

    if (userIndex === -1) {
      toast({ title: "Error", description: "Current user not found in user list.", variant: "destructive" });
      setIsLoadingAuth(false);
      return false;
    }

    const updatedUser = { ...users[userIndex], profilePictureUrl: dataUri };
    users[userIndex] = updatedUser;
    if (!saveData<User[]>(DataItemType.Users, users)) {
      toast({ title: "Storage Error", description: "Profile picture updated locally but could not save to storage.", variant: "destructive" });
    }
    setCurrentUser(updatedUser);

    toast({ title: "Profile Picture Updated", description: "Your profile picture has been changed." });
    setIsLoadingAuth(false);
    return true;
  };
  
  const updateAppLogoLight = useCallback((dataUri: string | null) => {
    const success = dataUri ? saveData<string>(DataItemType.AppLogoLight, dataUri) : (localStorage.removeItem(DataItemType.AppLogoLight), true);
    if (success) {
      setAppLogoLightUrl(dataUri);
      toast({ title: "Light App Logo", description: dataUri ? "Light mode app logo override changed." : "Light mode app logo override cleared." });
    } else {
      toast({ title: "Storage Full", description: "Could not save light app logo. Storage quota exceeded.", variant: "destructive" });
    }
  }, [toast]);

  const updateAppLogoDark = useCallback((dataUri: string | null) => {
    const success = dataUri ? saveData<string>(DataItemType.AppLogoDark, dataUri) : (localStorage.removeItem(DataItemType.AppLogoDark), true);
    if (success) {
      setAppLogoDarkUrl(dataUri);
      toast({ title: "Dark App Logo", description: dataUri ? "Dark mode app logo override changed." : "Dark mode app logo override cleared." });
    } else {
      toast({ title: "Storage Full", description: "Could not save dark app logo. Storage quota exceeded.", variant: "destructive" });
    }
  }, [toast]);
  
  const setDefaultAppLogoLight = useCallback((dataUri: string) => {
    if (saveData<string>(DataItemType.DefaultAppLogoLight, dataUri)) {
      _setDefaultAppLogoLightUrlInternal(dataUri);
      updateAppLogoLight(null); 
      toast({ title: "Default Light App Logo Set", description: "The new default light mode app logo has been set." });
    } else {
      toast({ title: "Storage Full", description: "Could not set default light app logo. Storage quota exceeded.", variant: "destructive" });
    }
  }, [toast, updateAppLogoLight]);

  const setDefaultAppLogoDark = useCallback((dataUri: string) => {
    if (saveData<string>(DataItemType.DefaultAppLogoDark, dataUri)) {
      _setDefaultAppLogoDarkUrlInternal(dataUri);
      updateAppLogoDark(null);
      toast({ title: "Default Dark App Logo Set", description: "The new default dark mode app logo has been set." });
    } else {
      toast({ title: "Storage Full", description: "Could not set default dark app logo. Storage quota exceeded.", variant: "destructive" });
    }
  }, [toast, updateAppLogoDark]);

  const updateHeaderLogoLight = useCallback((dataUri: string | null) => {
    const success = dataUri ? saveData<string>(DataItemType.HeaderLogoLight, dataUri) : (localStorage.removeItem(DataItemType.HeaderLogoLight), true);
    if (success) {
      setHeaderLogoLightUrl(dataUri);
      toast({ title: "Light Header Logo", description: dataUri ? "Light mode header logo changed." : "Light mode header logo cleared." });
    } else {
      toast({ title: "Storage Full", description: "Could not save light header logo. Storage quota exceeded.", variant: "destructive" });
    }
  }, [toast]);

  const updateHeaderLogoDark = useCallback((dataUri: string | null) => {
     const success = dataUri ? saveData<string>(DataItemType.HeaderLogoDark, dataUri) : (localStorage.removeItem(DataItemType.HeaderLogoDark), true);
    if (success) {
      setHeaderLogoDarkUrl(dataUri);
      toast({ title: "Dark Header Logo", description: dataUri ? "Dark mode header logo changed." : "Dark mode header logo cleared." });
    } else {
      toast({ title: "Storage Full", description: "Could not save dark header logo. Storage quota exceeded.", variant: "destructive" });
    }
  }, [toast]);
  
  const updateCustomAccentColor = useCallback((newColorHex: string | null) => {
    console.log(`[AuthContext] updateCustomAccentColor called with: ${newColorHex}`);
    const success = newColorHex ? saveData(DataItemType.CustomAccentColor, newColorHex) : (localStorage.removeItem(DataItemType.CustomAccentColor), true);
    if (success) {
        setCustomAccentColorState(newColorHex);
        applyCustomColorToCssVar('--accent', newColorHex, '180 100% 25%');
        toast({ title: "Accent Color Updated", description: newColorHex ? `New accent color ${newColorHex} applied.` : "Accent color reset to default." });
    } else {
        toast({ title: "Storage Full", description: "Could not save accent color. Storage quota exceeded.", variant: "destructive" });
    }
  }, [toast]);

  const updateChartPieColor = useCallback((
    dataItemType: DataItemType,
    cssVarName: string,
    defaultHslValue: string,
    setter: React.Dispatch<React.SetStateAction<string | null>>,
    hexColor: string | null
  ) => {
    console.log(`[AuthContext] updateChartPieColor for ${cssVarName} called with: ${hexColor}`);
    const success = hexColor ? saveData(dataItemType, hexColor) : (localStorage.removeItem(dataItemType), true);
    if (success) {
      setter(hexColor);
      applyCustomColorToCssVar(cssVarName, hexColor, defaultHslValue);
      toast({ title: `Chart Color Updated`, description: `${cssVarName.replace('--chart-pie-', 'Slice ')} color ${hexColor ? 'set to ' + hexColor : 'reset to default'}.` });
    } else {
      toast({ title: "Storage Full", description: `Could not save ${cssVarName} color. Storage quota exceeded.`, variant: "destructive" });
    }
  }, [toast]);

  const updateChartPieColorOpen = useCallback((hexColor: string | null) => {
    const currentThemeIsDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultColor = (currentThemeIsDark ? DEFAULT_DARK_CHART_PIE_COLORS_HSL : DEFAULT_CHART_PIE_COLORS_HSL)['--chart-pie-1'];
    updateChartPieColor(DataItemType.ChartPieColorOpen, '--chart-pie-1', defaultColor, setChartPieColorOpen, hexColor);
  }, [updateChartPieColor]);

  const updateChartPieColorClosed = useCallback((hexColor: string | null) => {
    const currentThemeIsDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultColor = (currentThemeIsDark ? DEFAULT_DARK_CHART_PIE_COLORS_HSL : DEFAULT_CHART_PIE_COLORS_HSL)['--chart-pie-2'];
    updateChartPieColor(DataItemType.ChartPieColorClosed, '--chart-pie-2', defaultColor, setChartPieColorClosed, hexColor);
  }, [updateChartPieColor]);

  const updateChartPieColorMissed = useCallback((hexColor: string | null) => {
    const currentThemeIsDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultColor = (currentThemeIsDark ? DEFAULT_DARK_CHART_PIE_COLORS_HSL : DEFAULT_CHART_PIE_COLORS_HSL)['--chart-pie-3'];
    updateChartPieColor(DataItemType.ChartPieColorMissed, '--chart-pie-3', defaultColor, setChartPieColorMissed, hexColor);
  }, [updateChartPieColor]);

  const updateChartPieColorOther = useCallback((hexColor: string | null) => {
    const currentThemeIsDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultColor = (currentThemeIsDark ? DEFAULT_DARK_CHART_PIE_COLORS_HSL : DEFAULT_CHART_PIE_COLORS_HSL)['--chart-pie-4'];
    updateChartPieColor(DataItemType.ChartPieColorOther, '--chart-pie-4', defaultColor, setChartPieColorOther, hexColor);
  }, [updateChartPieColor]);


  const contextValue = React.useMemo(() => {
    console.log(`[AuthContext] PROVIDING CONTEXT VALUE. appLogoLightUrl len: ${appLogoLightUrl?.length} defaultAppLogoLightUrl len: ${_defaultAppLogoLightUrlInternal?.length}`);
    console.log(`[AuthContext] PROVIDING CONTEXT VALUE. appLogoDarkUrl len: ${appLogoDarkUrl?.length} defaultAppLogoDarkUrl len: ${_defaultAppLogoDarkUrlInternal?.length}`);
    console.log(`[AuthContext] PROVIDING CONTEXT VALUE. headerLogoLightUrl len: ${headerLogoLightUrl?.length} headerLogoDarkUrl len: ${headerLogoDarkUrl?.length}`);

    return {
        currentUser,
        isAuthenticated,
        isLoadingAuth,
        pinSetupRequiredForUser,
        appLogoLightUrl,
        appLogoDarkUrl,
        defaultAppLogoLightUrl: _defaultAppLogoLightUrlInternal,
        defaultAppLogoDarkUrl: _defaultAppLogoDarkUrlInternal,
        headerLogoLightUrl,
        headerLogoDarkUrl,
        customAccentColor,
        chartPieColorOpen,
        chartPieColorClosed,
        chartPieColorMissed,
        chartPieColorOther,
        login,
        logout,
        completePinSetupAndLogin,
        updateUserProfilePicture,
        updateAppLogoLight,
        updateAppLogoDark,
        setDefaultAppLogoLight,
        setDefaultAppLogoDark,
        updateHeaderLogoLight,
        updateHeaderLogoDark,
        updateCustomAccentColor,
        updateChartPieColorOpen,
        updateChartPieColorClosed,
        updateChartPieColorMissed,
        updateChartPieColorOther,
    };
  }, [
    currentUser, isAuthenticated, isLoadingAuth, pinSetupRequiredForUser,
    appLogoLightUrl, appLogoDarkUrl, _defaultAppLogoLightUrlInternal, _defaultAppLogoDarkUrlInternal,
    headerLogoLightUrl, headerLogoDarkUrl, customAccentColor,
    chartPieColorOpen, chartPieColorClosed, chartPieColorMissed, chartPieColorOther,
    login, logout, completePinSetupAndLogin, updateUserProfilePicture,
    updateAppLogoLight, updateAppLogoDark, setDefaultAppLogoLight, setDefaultAppLogoDark,
    updateHeaderLogoLight, updateHeaderLogoDark, updateCustomAccentColor,
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
