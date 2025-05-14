
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
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';

const PinLoginScreen: React.FC = () => {
  const { login, isLoadingAuth } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // This effect should run only on the client after hydration
    const storedUsers = getData<User[]>(DataItemType.Users) || [];
    setUsers(storedUsers);
    if (storedUsers.length > 0 && !selectedUserId) {
      // Optionally pre-select or leave empty
      // setSelectedUserId(storedUsers[0].id); 
    }
  }, []); // Empty dependency array ensures client-side execution after mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

    const success = await login(selectedUserId, pin);
    if (!success) {
      // Error messages are typically handled by the login function or SetPinScreen
      // setError('Login failed. Please check your details or set up a PIN if prompted.');
    } else {
      setPin(''); 
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
          <CardTitle className="text-2xl font-heading">Welcome Back!</CardTitle> {/* Removed tracking-wide */}
          <CardDescription>
            Select your name and enter your PIN to access Finsculpt CRM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="userSelect">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="userSelect" className="w-full">
                  <SelectValue placeholder="Select your name" />
                </SelectTrigger>
                <SelectContent>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no_users_available" disabled>No users configured</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">4-Digit PIN</Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); 
                    if (val.length <= 4) setPin(val);
                }}
                placeholder="Enter your PIN"
                maxLength={4}
                className="text-center text-lg tracking-[0.5em]"
              />
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full h-12 text-base" disabled={isLoadingAuth}>
              {isLoadingAuth ? 'Verifying...' : 'Login'}
            </Button>
          </form>
        </CardContent>
         <CardFooter className="text-center text-xs text-muted-foreground pt-4">
            If you are an employee logging in for the first time, you might be prompted to set a PIN.
        </CardFooter>
      </Card>
    </div>
  );
};

export default PinLoginScreen;
