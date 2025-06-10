
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/lib/types';
import { DataItemType } from '@/lib/types'; // Ensure this is imported for runtime use
import { getData } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, LogIn, UserPlus, Shield, Users, Cloud } from 'lucide-react';
import { getCloudDatabase } from '@/services/shared-cloud-database';

const PinLoginScreen: React.FC = () => {
  const { login, isLoadingAuth, authenticateWithPin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadUsers = async () => {
      setIsCloudSyncing(true);
      try {
        // First try to sync from cloud to get latest user data
        await getCloudDatabase().syncFromCloud('googledrive');
      await getCloudDatabase().syncFromCloud('onedrive');
      } catch (error) {
        console.warn('Cloud sync failed during user load:', error);
      }
      
      const storedUsers = getData<User[]>(DataItemType.Users) || [];
      setUsers(storedUsers);
      if (storedUsers.length > 0 && !selectedUserId) {
        setSelectedUserId(storedUsers[0].id);
      }
      setIsCloudSyncing(false);
    };
    loadUsers();
  }, []); // Empty dependency array ensures client-side execution after mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    console.log('[PinLoginScreen] handleSubmit called with selectedUserId:', selectedUserId, 'pin:', pin);

    if (!selectedUserId) {
      setError('Please select a user.');
      toast({ title: "Login Error", description: "Please select a user.", variant: "destructive" });
      return;
    }
    // PIN validation can be minimal here as AuthContext will handle logic for first-time PIN setup etc.
    // However, if a PIN is entered, basic format check can be good.
    if (pin && !/^\d{4}$/.test(pin)) {
        setError('PIN must be 4 digits if entered.');
        toast({ title: "Login Error", description: "PIN must be 4 digits if entered.", variant: "destructive" });
        return;
    }

    console.log('[PinLoginScreen] About to call authenticateWithPin');
    // Use new cloud-first authentication
    const result = await authenticateWithPin(selectedUserId, pin);
    console.log('[PinLoginScreen] authenticateWithPin result:', result);
    
    if (!result.success) {
      setPin('');
    } else {
      setPin(''); 
    }
  };
  
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'partner':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'employee':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-3 h-3" />;
      case 'partner':
        return <Users className="w-3 h-3" />;
      case 'employee':
        return <UserPlus className="w-3 h-3" />;
      default:
        return null;
    }
  };
  
  // Avoid rendering form elements if users haven't loaded and it's not initial auth check
  if (isLoadingAuth && users.length === 0) { 
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background/80 to-background/60 p-4">
        <Card className="w-full max-w-md shadow-2xl glass-effect">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-heading">Loading...</CardTitle> {/* Removed tracking-wide */}
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">Initializing application...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background/80 to-background/60 p-4">
      <Card className="w-full max-w-md shadow-2xl glass-effect">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit mb-4">
            <LogIn className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl font-heading">Welcome Back!</CardTitle>
          <CardDescription>
            Select your account and enter your PIN to access FinCRuM.
            {isCloudSyncing && (
              <div className="flex items-center justify-center gap-2 mt-2 text-blue-600 dark:text-blue-400">
                <Cloud className="w-4 h-4 animate-pulse" />
                <span className="text-sm">Syncing with cloud...</span>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="userSelect">Select User Account</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="userSelect" className="w-full h-16">
                  <SelectValue placeholder="Select your account" />
                </SelectTrigger>
                <SelectContent>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id} className="h-16">
                        <div className="flex items-center gap-3 w-full">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user.profilePictureUrl} alt={user.name} />
                            <AvatarFallback className="text-sm font-medium">
                              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                          <Badge className={`${getRoleBadgeColor(user.role)} flex items-center gap-1`}>
                            {getRoleIcon(user.role)}
                            {user.role}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no_users_available" disabled>
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        No users configured
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">4-Digit PIN</Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, ''); 
                      if (val.length <= 4) setPin(val);
                  }}
                  placeholder="Enter your PIN"
                  maxLength={4}
                  className="text-center text-lg tracking-[0.5em] pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full h-12 text-base" disabled={isLoadingAuth || isCloudSyncing}>
              {isLoadingAuth ? (
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 animate-pulse" />
                  Authenticating...
                </div>
              ) : isCloudSyncing ? (
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 animate-pulse" />
                  Syncing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Login
                </div>
              )}
            </Button>
          </form>
        </CardContent>
         <CardFooter className="text-center text-xs text-muted-foreground pt-4">
            <div className="space-y-2">
              <p>Multi-device cloud authentication enabled.</p>
              <p>If you are logging in for the first time, you might be prompted to set a PIN.</p>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PinLoginScreen;
