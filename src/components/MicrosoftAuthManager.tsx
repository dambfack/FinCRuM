'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { generateMicrosoftAuthUrl, isMicrosoftOAuthConfigured } from '@/services/microsoft-oauth';
import { isMicrosoftAuthenticated, clearMicrosoftTokens } from '@/services/auth';
import { Unlink, Calendar, HardDrive, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface MicrosoftService {
  name: string;
  icon: React.ReactNode;
  isConnected: boolean;
  description: string;
}

export function MicrosoftAuthManager() {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [services, setServices] = useState<MicrosoftService[]>([]);

  useEffect(() => {
    const checkConnectedServices = () => {
      const isConnected = isMicrosoftAuthenticated();

      const serviceList: MicrosoftService[] = [
        {
          name: 'Outlook Calendar',
          icon: <Calendar className="h-4 w-4" />,
          isConnected,
          description: 'Sync tasks, reminders, and appointments with Outlook Calendar',
        },
        {
          name: 'OneDrive',
          icon: <HardDrive className="h-4 w-4" />,
          isConnected,
          description: 'Access and sync files with OneDrive storage',
        },
      ];

      setServices(serviceList);
    };

    checkConnectedServices();
    
    // Listen for storage changes to update the UI
    const handleStorageChange = () => {
      checkConnectedServices();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleConnect = async () => {
    if (!isMicrosoftOAuthConfigured()) {
      toast({
        title: 'Configuration Required',
        description: 'Microsoft OAuth is not configured. Please set up the required environment variables.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsConnecting(true);
    
    try {
      const authUrl = await generateMicrosoftAuthUrl();
      
      // Store state for security verification
      const queryString = authUrl.split('?')[1];
      if (queryString) {
        const urlParams = new URLSearchParams(queryString);
        const state = urlParams.get('state');
        if (state) {
          sessionStorage.setItem('microsoftOAuthState', state);
        }
      }
      
      // Open Microsoft OAuth in the same window
      window.location.href = authUrl;
      
    } catch (error: any) {
      console.error('Error initiating Microsoft OAuth:', error);
      toast({
        title: 'Connection Error',
        description: `Failed to connect to Microsoft: ${error.message}`,
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);

    try {
      // Clear Microsoft tokens from localStorage
      clearMicrosoftTokens();
      
      // Update the services state
      setServices(prev => 
        prev.map(s => ({ ...s, isConnected: false }))
      );
      
      toast({
        title: 'Disconnected',
        description: 'Successfully disconnected from Microsoft services.',
      });
    } catch (error: any) {
      console.error('Error disconnecting Microsoft services:', error);
      toast({
        title: 'Error',
        description: `Failed to disconnect from Microsoft services: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isConnected = services.some(s => s.isConnected);
  const isConfigured = isMicrosoftOAuthConfigured();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Microsoft Services
        </CardTitle>
        <CardDescription>
          Connect your Microsoft account to sync with Outlook Calendar and OneDrive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConfigured ? (
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Microsoft OAuth is not configured. Please set up the required environment variables.
            </p>
            <p className="text-xs text-muted-foreground">
              Required: NEXT_PUBLIC_MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, NEXT_PUBLIC_MICROSOFT_REDIRECT_URI
            </p>
          </div>
        ) : !isConnected ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Microsoft account to access Outlook Calendar and OneDrive integration.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {isConnecting ? (
                'Connecting...'
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect Microsoft Account
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            {services.map((service, index) => (
              <div key={service.name}>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    {service.icon}
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">{service.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {service.isConnected ? (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <Badge variant="secondary" className="text-xs">
                              Connected
                            </Badge>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 text-gray-400" />
                            <Badge variant="outline" className="text-xs">
                              Not Connected
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {index < services.length - 1 && <Separator />}
              </div>
            ))}
            
            <Separator />
            <div className="pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="w-full"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect Microsoft Account'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                This will revoke access to all Microsoft services (Outlook Calendar and OneDrive).
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}