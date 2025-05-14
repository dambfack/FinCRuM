
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
  appLogoUrl: string | null;
  defaultAppLogoUrl: string | null;
  login: (selectedUserId: string, pin: string) => Promise<boolean>;
  logout: () => void;
  completePinSetupAndLogin: (userId: string, newPin: string) => Promise<boolean>;
  updateUserProfilePicture: (dataUri: string) => Promise<boolean>;
  updateAppLogo: (dataUri: string | null) => void;
  setDefaultAppLogo: (dataUri: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [pinSetupRequiredForUser, setPinSetupRequiredForUser] = useState<User | null>(null);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [_defaultAppLogoUrl, _setDefaultAppLogoUrlInternal] = useState<string | null>(null); // Renamed for clarity
  const { toast } = useToast();

  useEffect(() => {
    setIsLoadingAuth(true);
    console.log('[AuthContext] Initial useEffect running...');

    const storedAppLogo = getData<string>(DataItemType.AppLogo);
    console.log('[AuthContext] Initial storedAppLogo:', storedAppLogo ? `Length: ${storedAppLogo.length}` : 'null');
    if (storedAppLogo) {
      setAppLogoUrl(storedAppLogo);
    }

    const storedDefaultAppLogo = getData<string>(DataItemType.DefaultAppLogo);
    console.log('[AuthContext] Initial storedDefaultAppLogo:', storedDefaultAppLogo ? `Length: ${storedDefaultAppLogo.length}` : 'null');
    if (storedDefaultAppLogo) {
      _setDefaultAppLogoUrlInternal(storedDefaultAppLogo);
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
      saveData<User[]>(DataItemType.Users, users);
      console.log('[AuthContext] No users found. Created default Admin (partner) with PIN 0000. Saved to localStorage:', DataItemType.Users);
      toast({
        title: "Default Admin Created",
        description: "No users found. Default 'Admin' (partner) created with PIN 0000.",
        duration: 7000,
      });
      window.dispatchEvent(new CustomEvent('dataChanged', { detail: { type: DataItemType.Users, data: users } }));
    }

    const storedUserId = getData<string>(DataItemType.CurrentUserId);
    if (storedUserId) {
      const currentUsersOnLoad = getData<User[]>(DataItemType.Users) || []; // Re-fetch
      const user = currentUsersOnLoad.find(u => u.id === storedUserId);
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem(DataItemType.CurrentUserId);
      }
    }
    setIsLoadingAuth(false);
  }, []); // Empty dependency array to run once on mount

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
    console.log('[AuthContext] completePinSetupAndLogin: Saved updated users with new PIN to localStorage:', DataItemType.Users);


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
    console.log('[AuthContext] updateUserProfilePicture: Saved updated users with new profile picture to localStorage:', DataItemType.Users);
    setCurrentUser(updatedUser);

    toast({ title: "Profile Picture Updated", description: "Your profile picture has been changed." });
    setIsLoadingAuth(false);
    return true;
  };

  const updateAppLogo = useCallback((dataUri: string | null) => {
    console.log('[AuthContext] updateAppLogo called. Data URI length:', dataUri?.length);
    setAppLogoUrl(dataUri);
    if (dataUri) {
      saveData<string>(DataItemType.AppLogo, dataUri);
      console.log('[AuthContext] updateAppLogo: Saved AppLogo to localStorage:', DataItemType.AppLogo, 'Length:', dataUri.length);
      toast({ title: "App Logo Updated", description: "The application logo override has been changed." });
    } else {
      localStorage.removeItem(DataItemType.AppLogo);
      console.log('[AuthContext] updateAppLogo: Removed AppLogo from localStorage:', DataItemType.AppLogo);
      toast({ title: "App Logo Override Cleared", description: "The custom app logo override has been removed." });
    }
  }, [toast]);

  const setDefaultAppLogo = useCallback((dataUri: string) => {
    console.log("[AuthContext] setDefaultAppLogo CALLED. Data URI length:", dataUri?.length);
    _setDefaultAppLogoUrlInternal(dataUri);
    saveData<string>(DataItemType.DefaultAppLogo, dataUri);
    console.log('[AuthContext] setDefaultAppLogo: Saved DefaultAppLogo to localStorage:', DataItemType.DefaultAppLogo, 'Length:', dataUri.length);
    updateAppLogo(null); // Clear the current override, new default will show
    toast({ title: "Default App Logo Set", description: "The new default application logo has been set." });
  }, [toast, updateAppLogo]);

  const contextValue: AuthContextType = {
    currentUser,
    isAuthenticated,
    isLoadingAuth,
    pinSetupRequiredForUser,
    appLogoUrl,
    defaultAppLogoUrl: _defaultAppLogoUrl,
    login,
    logout,
    completePinSetupAndLogin,
    updateUserProfilePicture,
    updateAppLogo,
    setDefaultAppLogo,
  };

  console.log('[AuthContext] PROVIDING CONTEXT VALUE. appLogoUrl len:', appLogoUrl?.length, 'defaultAppLogoUrl len:', _defaultAppLogoUrl?.length);


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

