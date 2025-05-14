
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LockKeyhole } from 'lucide-react';

interface SetPinScreenProps {
  userToSetupPinFor: User; // User object passed directly
}

const SetPinScreen: React.FC<SetPinScreenProps> = ({ userToSetupPinFor }) => {
  const { completePinSetupAndLogin } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    setIsSettingPin(true);
    try {
      const success = await completePinSetupAndLogin(userToSetupPinFor.id, pin);
      if (!success) {
        // Toast for failure is handled within completePinSetupAndLogin
        setError('Failed to set PIN. Please try again.');
      }
      // On success, AuthContext will change isAuthenticated, and Layout will re-render
    } catch (err) {
      console.error("Error in completePinSetupAndLogin:", err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      toast({title: "Error Setting PIN", description: err instanceof Error ? err.message : "Could not set PIN.", variant: "destructive"});
    } finally {
      setIsSettingPin(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background/80 to-background/60 p-4">
      <Card className="w-full max-w-md shadow-2xl glass-effect">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit mb-4">
            <LockKeyhole className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl font-heading tracking-wide">Set Your Secure PIN</CardTitle>
          <CardDescription>
            Welcome, {userToSetupPinFor.name}! Please set a 4-digit PIN for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pin">New 4-Digit PIN</Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); // Allow only digits
                    if (val.length <= 4) setPin(val);
                }}
                placeholder="Enter 4-digit PIN"
                maxLength={4}
                className="text-center text-lg tracking-[0.5em]"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <Input
                id="confirmPin"
                type="password"
                value={confirmPin}
                onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); // Allow only digits
                    if (val.length <= 4) setConfirmPin(val);
                }}
                placeholder="Confirm 4-digit PIN"
                maxLength={4}
                className="text-center text-lg tracking-[0.5em]"
              />
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full h-12 text-base" disabled={isSettingPin}>
              {isSettingPin ? 'Setting PIN...' : 'Set PIN & Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground pt-4">
            This PIN will be used to access your Finsculpt CRM account.
        </CardFooter>
      </Card>
    </div>
  );
};

export default SetPinScreen;
