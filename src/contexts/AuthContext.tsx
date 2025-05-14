
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData, saveData } from '@/lib/utils';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [pinSetupRequiredForUser, setPinSetupRequiredForUser] = useState<User | null>(null);
  
  const [appLogoLightUrl, setAppLogoLightUrl] = useState<string | null>(null);
  const [appLogoDarkUrl, setAppLogoDarkUrl] = useState<string | null>(null);
  const [defaultAppLogoLightUrl, setDefaultAppLogoLightUrl] = useState<string | null>(null);
  const [defaultAppLogoDarkUrl, setDefaultAppLogoDarkUrl] = useState<string | null>(null);
  const [headerLogoLightUrl, setHeaderLogoLightUrl] = useState<string | null>(null);
  const [headerLogoDarkUrl, setHeaderLogoDarkUrl] = useState<string | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    console.log('[AuthContext] Initial useEffect running - ONCE.');
    setIsLoadingAuth(true);

    setAppLogoLightUrl(getData<string>(DataItemType.AppLogoLight));
    setAppLogoDarkUrl(getData<string>(DataItemType.AppLogoDark));
    setDefaultAppLogoLightUrl(getData<string>(DataItemType.DefaultAppLogoLight));
    setDefaultAppLogoDarkUrl(getData<string>(DataItemType.DefaultAppLogoDark));
    setHeaderLogoLightUrl(getData<string>(DataItemType.HeaderLogoLight));
    setHeaderLogoDarkUrl(getData<string>(DataItemType.HeaderLogoDark));
    
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
      saveData<User[]>(DataItemType.Users, users);
      toast({
        title: "Default Admin Created",
        description: "No users found. Default 'Admin' (partner) created with PIN 0000.",
        duration: 7000,
      });
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
    saveData<User[]>(DataItemType.Users, users);

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
    saveData<User[]>(DataItemType.Users, users);
    setCurrentUser(updatedUser);

    toast({ title: "Profile Picture Updated", description: "Your profile picture has been changed." });
    setIsLoadingAuth(false);
    return true;
  };

  const updateLogo = useCallback((setter: React.Dispatch<React.SetStateAction<string | null>>, key: DataItemType, dataUri: string | null, toastTitle: string, toastDescription: string) => {
    setter(dataUri);
    if (dataUri) {
      saveData<string>(key, dataUri);
    } else {
      if (typeof window !== 'undefined') localStorage.removeItem(key);
    }
    toast({ title: toastTitle, description: toastDescription });
  }, [toast]);

  const updateAppLogoLight = useCallback((dataUri: string | null) => updateLogo(setAppLogoLightUrl, DataItemType.AppLogoLight, dataUri, "Light App Logo Updated", dataUri ? "Light mode app logo override changed." : "Light mode app logo override cleared."), [updateLogo]);
  const updateAppLogoDark = useCallback((dataUri: string | null) => updateLogo(setAppLogoDarkUrl, DataItemType.AppLogoDark, dataUri, "Dark App Logo Updated", dataUri ? "Dark mode app logo override changed." : "Dark mode app logo override cleared."), [updateLogo]);
  
  const setDefaultAppLogoLight = useCallback((dataUri: string) => {
    setDefaultAppLogoLightUrl(dataUri);
    saveData<string>(DataItemType.DefaultAppLogoLight, dataUri);
    updateAppLogoLight(null); // Clear override
    toast({ title: "Default Light App Logo Set", description: "The new default light mode app logo has been set." });
  }, [toast, updateAppLogoLight]);

  const setDefaultAppLogoDark = useCallback((dataUri: string) => {
    setDefaultAppLogoDarkUrl(dataUri);
    saveData<string>(DataItemType.DefaultAppLogoDark, dataUri);
    updateAppLogoDark(null); // Clear override
    toast({ title: "Default Dark App Logo Set", description: "The new default dark mode app logo has been set." });
  }, [toast, updateAppLogoDark]);

  const updateHeaderLogoLight = useCallback((dataUri: string | null) => updateLogo(setHeaderLogoLightUrl, DataItemType.HeaderLogoLight, dataUri, "Light Header Logo Updated", dataUri ? "Light mode header logo changed." : "Light mode header logo cleared."), [updateLogo]);
  const updateHeaderLogoDark = useCallback((dataUri: string | null) => updateLogo(setHeaderLogoDarkUrl, DataItemType.HeaderLogoDark, dataUri, "Dark Header Logo Updated", dataUri ? "Dark mode header logo changed." : "Dark mode header logo cleared."), [updateLogo]);


  const contextValue = React.useMemo(() => ({
    currentUser,
    isAuthenticated,
    isLoadingAuth,
    pinSetupRequiredForUser,
    appLogoLightUrl,
    appLogoDarkUrl,
    defaultAppLogoLightUrl,
    defaultAppLogoDarkUrl,
    headerLogoLightUrl,
    headerLogoDarkUrl,
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
  }), [
    currentUser, 
    isAuthenticated, 
    isLoadingAuth, 
    pinSetupRequiredForUser, 
    appLogoLightUrl, appLogoDarkUrl, defaultAppLogoLightUrl, defaultAppLogoDarkUrl, headerLogoLightUrl, headerLogoDarkUrl,
    logout, login, completePinSetupAndLogin, updateUserProfilePicture,
    updateAppLogoLight, updateAppLogoDark, setDefaultAppLogoLight, setDefaultAppLogoDark, updateHeaderLogoLight, updateHeaderLogoDark,
  ]);
  
  if (typeof window !== 'undefined') { 
    // console.log('[AuthContext] PROVIDING CONTEXT VALUE. appLogoUrl len:', appLogoUrl?.length, 'defaultAppLogoUrl len:', _defaultAppLogoUrlInternal?.length, 'headerLogoUrl len:', headerLogoUrl?.length);
  }

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
