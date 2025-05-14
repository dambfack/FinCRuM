
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData, saveData } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  pinSetupRequiredForUser: User | null;
  appLogoUrl: string | null; // Current admin-set custom logo override
  defaultAppLogoUrl: string | null; // User-set default application logo
  login: (selectedUserId: string, pin: string) => Promise<boolean>;
  logout: () => void;
  completePinSetupAndLogin: (userId: string, newPin: string) => Promise<boolean>;
  updateUserProfilePicture: (dataUri: string) => Promise<boolean>;
  updateAppLogo: (dataUri: string | null) => void; // Can be null to clear override
  setDefaultAppLogo: (dataUri: string) => void; // Sets the new default logo
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [pinSetupRequiredForUser, setPinSetupRequiredForUser] = useState<User | null>(null);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [defaultAppLogoUrl, setDefaultAppLogoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoadingAuth(true);

    const storedAppLogo = getData<string>(DataItemType.AppLogo);
    if (storedAppLogo) {
      setAppLogoUrl(storedAppLogo);
    }
    console.log('[AuthContext] Initial storedAppLogo:', storedAppLogo ? `Length: ${storedAppLogo.length}` : 'null');

    const storedDefaultAppLogo = getData<string>(DataItemType.DefaultAppLogo);
    if (storedDefaultAppLogo) {
      setDefaultAppLogoUrl(storedDefaultAppLogo);
    }
    console.log('[AuthContext] Initial storedDefaultAppLogo:', storedDefaultAppLogo ? `Length: ${storedDefaultAppLogo.length}` : 'null');


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
      const currentUsers = getData<User[]>(DataItemType.Users) || [];
      const user = currentUsers.find(u => u.id === storedUserId);
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem(DataItemType.CurrentUserId);
      }
    }
    setIsLoadingAuth(false);
  }, [toast]);

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

  const updateAppLogo = (dataUri: string | null) => {
    console.log('[AuthContext] updateAppLogo - dataUri length:', dataUri?.length, 'Saving to localStorage.');
    setAppLogoUrl(dataUri);
    if (dataUri) {
      saveData<string>(DataItemType.AppLogo, dataUri);
      toast({ title: "App Logo Updated", description: "The application logo override has been changed." });
    } else {
      localStorage.removeItem(DataItemType.AppLogo);
      toast({ title: "App Logo Override Cleared", description: "The custom app logo override has been removed." });
    }
  };

  const setDefaultAppLogo = (dataUri: string) => {
    console.log('[AuthContext] setDefaultAppLogo - dataUri length:', dataUri?.length);
    setDefaultAppLogoUrl(dataUri);
    saveData<string>(DataItemType.DefaultAppLogo, dataUri);
    updateAppLogo(null);
    toast({ title: "Default App Logo Set", description: "The new default application logo has been set." });
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setPinSetupRequiredForUser(null);
    localStorage.removeItem(DataItemType.CurrentUserId);
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  };

  return (
    <AuthContext.Provider value={{
        currentUser,
        isAuthenticated,
        isLoadingAuth,
        pinSetupRequiredForUser,
        appLogoUrl,
        defaultAppLogoUrl,
        login,
        logout,
        completePinSetupAndLogin,
        updateUserProfilePicture,
        updateAppLogo,
        setDefaultAppLogo
      }}>
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
