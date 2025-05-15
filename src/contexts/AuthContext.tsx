

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData, saveData, hexToHslString } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  updateCustomAccentColor: (newColor: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to apply accent color dynamically
const applyCustomAccentColor = (colorHex: string | null) => {
  if (typeof window === 'undefined') return; // Guard against SSR
  if (!colorHex) {
    // Reset to default if colorHex is null by removing the style property
    document.documentElement.style.removeProperty('--accent');
    console.log('[AuthContext] applyCustomAccentColor: Reset to default theme accent.');
    return;
  }
  const hslString = hexToHslString(colorHex);
  if (hslString) {
    document.documentElement.style.setProperty('--accent', hslString);
    console.log(`[AuthContext] applyCustomAccentColor: Applied ${colorHex} as HSL: ${hslString}`);
  } else {
    console.warn(`[AuthContext] applyCustomAccentColor: Could not convert ${colorHex} to HSL. Using default teal.`);
    document.documentElement.style.setProperty('--accent', '180 100% 25%'); // Fallback to default teal HSL
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
  
  const { toast } = useToast();

  useEffect(() => {
    console.log('[AuthContext] Initial useEffect running - ONCE.');
    setIsLoadingAuth(true);

    setAppLogoLightUrl(getData<string>(DataItemType.AppLogoLight));
    setAppLogoDarkUrl(getData<string>(DataItemType.AppLogoDark));
    
    const storedDefaultAppLogoLight = getData<string>(DataItemType.DefaultAppLogoLight);
    if (storedDefaultAppLogoLight) {
      _setDefaultAppLogoLightUrlInternal(storedDefaultAppLogoLight);
      console.log('[AuthContext] Initial storedDefaultAppLogoLight: Length:', storedDefaultAppLogoLight.length);
    } else {
      console.log('[AuthContext] Initial storedDefaultAppLogoLight: null');
    }

    const storedDefaultAppLogoDark = getData<string>(DataItemType.DefaultAppLogoDark);
    if (storedDefaultAppLogoDark) {
      _setDefaultAppLogoDarkUrlInternal(storedDefaultAppLogoDark);
       console.log('[AuthContext] Initial storedDefaultAppLogoDark: Length:', storedDefaultAppLogoDark.length);
    } else {
       console.log('[AuthContext] Initial storedDefaultAppLogoDark: null');
    }
    
    setHeaderLogoLightUrl(getData<string>(DataItemType.HeaderLogoLight));
    setHeaderLogoDarkUrl(getData<string>(DataItemType.HeaderLogoDark));

    const storedAccent = getData<string>(DataItemType.CustomAccentColor);
    if (storedAccent) {
      setCustomAccentColorState(storedAccent);
      applyCustomAccentColor(storedAccent);
    } else {
      applyCustomAccentColor(null); // Apply default if nothing stored
    }
    
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
      const currentUsersOnLoad = getData<User[]>(DataItemType.Users) || []; // Fetch again in case default was just created
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

  const updateLogoGeneric = useCallback((
    setter: React.Dispatch<React.SetStateAction<string | null>>, 
    key: DataItemType, 
    dataUri: string | null, 
    toastTitle: string, 
    toastDescription: string
  ) => {
    console.log(`[AuthContext] updateLogoGeneric for ${key}. Data URI length:`, dataUri?.length);
    
    const success = dataUri ? saveData<string>(key, dataUri) : (localStorage.removeItem(key), true);

    if (success) {
      setter(dataUri);
      toast({ title: toastTitle, description: toastDescription });
    } else {
      toast({ title: "Storage Full", description: `Could not save ${toastTitle.toLowerCase()}. Local storage quota exceeded.`, variant: "destructive" });
    }
  }, [toast]);

  const updateAppLogoLight = useCallback((dataUri: string | null) => {
    console.log('[AuthContext] updateAppLogoLight called. Data URI length:', dataUri?.length);
    console.log('[AuthContext] updateAppLogoLight - DefaultAppLogoLight in localStorage BEFORE saving AppLogoLight:', localStorage.getItem(DataItemType.DefaultAppLogoLight)?.length);
    const success = dataUri ? saveData<string>(DataItemType.AppLogoLight, dataUri) : (localStorage.removeItem(DataItemType.AppLogoLight), true);
    console.log('[AuthContext] updateAppLogoLight: Saved AppLogoLight to localStorage. Success:', success, 'New AppLogoLight Length:', dataUri?.length);
    if (success) {
      setAppLogoLightUrl(dataUri);
      toast({ title: "Light App Logo", description: dataUri ? "Light mode app logo override changed." : "Light mode app logo override cleared." });
    } else {
      toast({ title: "Storage Full", description: "Could not save light app logo. Storage quota exceeded.", variant: "destructive" });
    }
    console.log('[AuthContext] updateAppLogoLight - DefaultAppLogoLight in localStorage AFTER saving AppLogoLight:', localStorage.getItem(DataItemType.DefaultAppLogoLight)?.length);
  }, [toast]);

  const updateAppLogoDark = useCallback((dataUri: string | null) => updateLogoGeneric(setAppLogoDarkUrl, DataItemType.AppLogoDark, dataUri, "Dark App Logo", dataUri ? "Dark mode app logo override changed." : "Dark mode app logo override cleared."), [updateLogoGeneric]);
  
  const setDefaultAppLogoLight = useCallback((dataUri: string) => {
    console.trace("[AuthContext] setDefaultAppLogoLight trace");
    if (saveData<string>(DataItemType.DefaultAppLogoLight, dataUri)) {
      _setDefaultAppLogoLightUrlInternal(dataUri);
      updateAppLogoLight(null); 
      toast({ title: "Default Light App Logo Set", description: "The new default light mode app logo has been set." });
    } else {
      toast({ title: "Storage Full", description: "Could not set default light app logo. Storage quota exceeded.", variant: "destructive" });
    }
  }, [toast, updateAppLogoLight]);

  const setDefaultAppLogoDark = useCallback((dataUri: string) => {
     console.trace("[AuthContext] setDefaultAppLogoDark trace");
    if (saveData<string>(DataItemType.DefaultAppLogoDark, dataUri)) {
      _setDefaultAppLogoDarkUrlInternal(dataUri);
      updateAppLogoDark(null);
      toast({ title: "Default Dark App Logo Set", description: "The new default dark mode app logo has been set." });
    } else {
      toast({ title: "Storage Full", description: "Could not set default dark app logo. Storage quota exceeded.", variant: "destructive" });
    }
  }, [toast, updateAppLogoDark]);

  const updateHeaderLogoLight = useCallback((dataUri: string | null) => updateLogoGeneric(setHeaderLogoLightUrl, DataItemType.HeaderLogoLight, dataUri, "Light Header Logo", dataUri ? "Light mode header logo changed." : "Light mode header logo cleared."), [updateLogoGeneric]);
  const updateHeaderLogoDark = useCallback((dataUri: string | null) => updateLogoGeneric(setHeaderLogoDarkUrl, DataItemType.HeaderLogoDark, dataUri, "Dark Header Logo", dataUri ? "Dark mode header logo changed." : "Dark mode header logo cleared."), [updateLogoGeneric]);
  
  const updateCustomAccentColor = useCallback((newColorHex: string) => {
    console.log(`[AuthContext] updateCustomAccentColor called with: ${newColorHex}`);
    const newHslString = hexToHslString(newColorHex);
    if (newHslString) {
      if (saveData(DataItemType.CustomAccentColor, newColorHex)) {
        setCustomAccentColorState(newColorHex); 
        applyCustomAccentColor(newColorHex); 
        toast({ title: "Accent Color Updated", description: `New accent color ${newColorHex} applied.` });
      } else {
        toast({ title: "Storage Full", description: "Could not save accent color. Storage quota exceeded.", variant: "destructive" });
      }
    } else {
      toast({ title: "Invalid Color", description: "The selected color format was not valid.", variant: "destructive" });
    }
  }, [toast]);


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
    };
  }, [
    currentUser, isAuthenticated, isLoadingAuth, pinSetupRequiredForUser,
    appLogoLightUrl, appLogoDarkUrl, _defaultAppLogoLightUrlInternal, _defaultAppLogoDarkUrlInternal,
    headerLogoLightUrl, headerLogoDarkUrl, customAccentColor,
    login, logout, completePinSetupAndLogin, updateUserProfilePicture,
    updateAppLogoLight, updateAppLogoDark, setDefaultAppLogoLight, setDefaultAppLogoDark,
    updateHeaderLogoLight, updateHeaderLogoDark, updateCustomAccentColor,
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
