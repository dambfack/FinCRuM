
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
  login: (selectedUserId: string, pin: string) => Promise<boolean>;
  logout: () => void;
  completePinSetupAndLogin: (userId: string, newPin: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [pinSetupRequiredForUser, setPinSetupRequiredForUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Attempt to restore session on initial load
    setIsLoadingAuth(true);
    const storedUserId = getData<string>(DataItemType.CurrentUserId);
    if (storedUserId) {
      const users = getData<User[]>(DataItemType.Users) || [];
      const user = users.find(u => u.id === storedUserId);
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
      } else {
        // Clear invalid stored ID
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

    // Case 1: Employee, no PIN set yet, and no PIN was entered (first login attempt)
    if (userToLogin.role === 'employee' && !userToLogin.pin && pinInput === '') {
      setPinSetupRequiredForUser(userToLogin);
      setIsAuthenticated(false);
      setCurrentUser(null);
      localStorage.removeItem(DataItemType.CurrentUserId);
      // Toast will be shown by the SetPinScreen or calling component
      setIsLoadingAuth(false);
      return false; // Indicate login not complete, PIN setup needed
    }

    // Case 2: User has a PIN set, and PIN was entered correctly
    if (userToLogin.pin && pinInput === userToLogin.pin) {
      setCurrentUser(userToLogin);
      setIsAuthenticated(true);
      setPinSetupRequiredForUser(null); // Clear any pending PIN setup
      saveData<string>(DataItemType.CurrentUserId, userToLogin.id);
      toast({ title: "Login Successful", description: `Welcome back, ${userToLogin.name}!` });
      setIsLoadingAuth(false);
      return true;
    }

    // Case 3: Login failed
    if (userToLogin.role === 'partner' && !userToLogin.pin) {
        toast({ title: "Login Failed", description: "Partner account has no PIN set. Please contact an administrator.", variant: "destructive" });
    } else if (userToLogin.role === 'employee' && !userToLogin.pin && pinInput !== '') {
        // This case means an employee without a PIN *tried* to enter one.
        // We should still guide them to PIN setup.
        toast({ title: "PIN Setup Required", description: `Welcome ${userToLogin.name}! Please set your PIN to continue.`, variant: "default" });
        setPinSetupRequiredForUser(userToLogin); // Trigger PIN setup
        setIsAuthenticated(false);
        setCurrentUser(null);
    } else {
      // Generic PIN mismatch
      toast({ title: "Login Failed", description: "Invalid PIN.", variant: "destructive" });
    }
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

    // Now log the user in
    setCurrentUser(users[userIndex]);
    setIsAuthenticated(true);
    setPinSetupRequiredForUser(null);
    saveData<string>(DataItemType.CurrentUserId, users[userIndex].id);
    toast({ title: "PIN Set Successfully", description: `Welcome, ${users[userIndex].name}! You are now logged in.` });
    setIsLoadingAuth(false);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setPinSetupRequiredForUser(null);
    localStorage.removeItem(DataItemType.CurrentUserId);
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, isLoadingAuth, pinSetupRequiredForUser, login, logout, completePinSetupAndLogin }}>
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
