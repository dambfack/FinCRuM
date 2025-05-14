
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
  headerLogoUrl: string | null; // New: for header text logo
  login: (selectedUserId: string, pin: string) => Promise<boolean>;
  logout: () => void;
  completePinSetupAndLogin: (userId: string, newPin: string) => Promise<boolean>;
  updateUserProfilePicture: (dataUri: string) => Promise<boolean>;
  updateAppLogo: (dataUri: string | null) => void;
  setDefaultAppLogo: (dataUri: string) => void;
  updateHeaderLogo: (dataUri: string | null) => void; // New: for header text logo
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [pinSetupRequiredForUser, setPinSetupRequiredForUser] = useState<User | null>(null);
  
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [_defaultAppLogoUrlInternal, _setDefaultAppLogoUrlInternal] = useState<string | null>(null);
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string | null>(null); // New state for header logo
  
  const { toast } = useToast();

  useEffect(() => {
    console.log('[AuthContext] Initial useEffect running - ONCE.');
    setIsLoadingAuth(true);

    const storedAppLogo = getData<string>(DataItemType.AppLogo);
    console.log('[AuthContext] Initial load - storedAppLogo:', storedAppLogo ? `Length: ${storedAppLogo.length}` : 'null');
    if (storedAppLogo) {
      setAppLogoUrl(storedAppLogo);
    }

    const storedDefaultAppLogo = getData<string>(DataItemType.DefaultAppLogo);
    console.log('[AuthContext] Initial load - storedDefaultAppLogo:', storedDefaultAppLogo ? `Length: ${storedDefaultAppLogo.length}` : 'null');
    if (storedDefaultAppLogo) {
      _setDefaultAppLogoUrlInternal(storedDefaultAppLogo);
    }

    const storedHeaderLogo = getData<string>(DataItemType.HeaderLogo); // Load header logo
    console.log('[AuthContext] Initial load - storedHeaderLogo:', storedHeaderLogo ? `Length: ${storedHeaderLogo.length}` : 'null');
    if (storedHeaderLogo) {
      setHeaderLogoUrl(storedHeaderLogo);
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

  const updateAppLogo = useCallback((dataUri: string | null) => {
    console.log('[AuthContext] updateAppLogo called. Data URI length:', dataUri?.length);
    
    console.log('[AuthContext] updateAppLogo - DefaultAppLogo in localStorage BEFORE saving AppLogo:', localStorage.getItem(DataItemType.DefaultAppLogo) ? `len: ${localStorage.getItem(DataItemType.DefaultAppLogo)!.length}` : 'null');
    
    setAppLogoUrl(dataUri); 
    
    if (dataUri) {
      saveData<string>(DataItemType.AppLogo, dataUri);
      console.log('[AuthContext] updateAppLogo: Saved AppLogo to localStorage:', DataItemType.AppLogo, 'Length:', dataUri.length);
      toast({ title: "App Logo Updated", description: "The application logo override has been changed." });
    } else {
      if (typeof window !== 'undefined') localStorage.removeItem(DataItemType.AppLogo);
      console.log('[AuthContext] updateAppLogo: Removed AppLogo from localStorage:', DataItemType.AppLogo);
      toast({ title: "App Logo Override Cleared", description: "The custom app logo override has been removed." });
    }
     console.log('[AuthContext] updateAppLogo - DefaultAppLogo in localStorage AFTER saving AppLogo:', localStorage.getItem(DataItemType.DefaultAppLogo) ? `len: ${localStorage.getItem(DataItemType.DefaultAppLogo)!.length}` : 'null');
  }, [toast]);

  const setDefaultAppLogo = useCallback((dataUri: string) => {
    console.trace("[AuthContext] setDefaultAppLogo trace"); 
    _setDefaultAppLogoUrlInternal(dataUri); 
    saveData<string>(DataItemType.DefaultAppLogo, dataUri); 
    console.log('[AuthContext] setDefaultAppLogo: Saved DefaultAppLogo to localStorage:', DataItemType.DefaultAppLogo, 'Length:', dataUri.length);
    updateAppLogo(null); 
    toast({ title: "Default App Logo Set", description: "The new default application logo has been set." });
  }, [toast, updateAppLogo]);

  const updateHeaderLogo = useCallback((dataUri: string | null) => {
    console.log('[AuthContext] updateHeaderLogo called. Data URI length:', dataUri?.length);
    setHeaderLogoUrl(dataUri);
    if (dataUri) {
      saveData<string>(DataItemType.HeaderLogo, dataUri);
      toast({ title: "Header Logo Updated", description: "The header text logo has been changed." });
    } else {
      if (typeof window !== 'undefined') localStorage.removeItem(DataItemType.HeaderLogo);
      toast({ title: "Header Logo Cleared", description: "The custom header text logo has been removed." });
    }
  }, [toast]);

  const contextValue = React.useMemo(() => ({
    currentUser,
    isAuthenticated,
    isLoadingAuth,
    pinSetupRequiredForUser,
    appLogoUrl,
    defaultAppLogoUrl: _defaultAppLogoUrlInternal, 
    headerLogoUrl, // New
    login,
    logout,
    completePinSetupAndLogin,
    updateUserProfilePicture,
    updateAppLogo,
    setDefaultAppLogo,
    updateHeaderLogo, // New
  }), [
    currentUser, 
    isAuthenticated, 
    isLoadingAuth, 
    pinSetupRequiredForUser, 
    appLogoUrl, 
    _defaultAppLogoUrlInternal,
    headerLogoUrl, // New
    logout, 
    login,
    completePinSetupAndLogin,
    updateUserProfilePicture,
    updateAppLogo,
    setDefaultAppLogo,
    updateHeaderLogo, // New
  ]);
  
  if (typeof window !== 'undefined') { 
    console.log('[AuthContext] PROVIDING CONTEXT VALUE. appLogoUrl len:', appLogoUrl?.length, 'defaultAppLogoUrl len:', _defaultAppLogoUrlInternal?.length, 'headerLogoUrl len:', headerLogoUrl?.length);
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
