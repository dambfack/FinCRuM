'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { DataItemType } from '@/lib/types';
import { revokeGoogleTokensAction } from '@/app/actions/google-auth-actions';
import { Unlink, Calendar, HardDrive, CheckCircle, AlertCircle } from 'lucide-react';

interface GoogleService {
  name: string;
  icon: React.ReactNode;
  accessTokenKey: DataItemType;
  refreshTokenKey: DataItemType;
  isConnected: boolean;
  accessToken?: string;
}

export function GoogleAuthManager() {
  const { toast } = useToast();
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [services, setServices] = useState<GoogleService[]>([]);

  useEffect(() => {
    const checkConnectedServices = () => {
      const googleDriveAccessToken = localStorage.getItem(DataItemType.GoogleDriveAccessToken);
      const googleCalendarAccessToken = localStorage.getItem(DataItemType.GoogleCalendarAccessToken);

      const serviceList: GoogleService[] = [
        {
          name: 'Google Drive',
          icon: <HardDrive className="h-4 w-4" />,
          accessTokenKey: DataItemType.GoogleDriveAccessToken,
          refreshTokenKey: DataItemType.GoogleDriveRefreshToken,
          isConnected: !!googleDriveAccessToken,
          accessToken: googleDriveAccessToken || undefined,
        },
        {
          name: 'Google Calendar',
          icon: <Calendar className="h-4 w-4" />,
          accessTokenKey: DataItemType.GoogleCalendarAccessToken,
          refreshTokenKey: DataItemType.GoogleCalendarRefreshToken,
          isConnected: !!googleCalendarAccessToken,
          accessToken: googleCalendarAccessToken || undefined,
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

  const handleRevokeService = async (service: GoogleService) => {
    if (!service.accessToken) {
      toast({
        title: 'Error',
        description: 'No access token found for this service.',
        variant: 'destructive',
      });
      return;
    }

    setIsRevoking(service.name);

    try {
      const result = await revokeGoogleTokensAction(service.accessToken);
      
      if (result.success) {
        // Clear tokens from localStorage
        localStorage.removeItem(service.accessTokenKey);
        localStorage.removeItem(service.refreshTokenKey);
        
        // Update the services state
        setServices(prev => 
          prev.map(s => 
            s.name === service.name 
              ? { ...s, isConnected: false, accessToken: undefined }
              : s
          )
        );
        
        toast({
          title: 'Disconnected',
          description: `Successfully disconnected from ${service.name}.`,
        });
      } else {
        throw new Error(result.error || 'Failed to revoke tokens');
      }
    } catch (error: any) {
      console.error(`Error revoking ${service.name} tokens:`, error);
      toast({
        title: 'Error',
        description: `Failed to disconnect from ${service.name}: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    const connectedServices = services.filter(s => s.isConnected && s.accessToken);
    
    if (connectedServices.length === 0) {
      toast({
        title: 'No Services Connected',
        description: 'There are no Google services to disconnect.',
      });
      return;
    }

    setIsRevoking('all');

    try {
      const revokePromises = connectedServices.map(async (service) => {
        if (service.accessToken) {
          const result = await revokeGoogleTokensAction(service.accessToken);
          if (result.success) {
            localStorage.removeItem(service.accessTokenKey);
            localStorage.removeItem(service.refreshTokenKey);
          }
          return { service: service.name, success: result.success, error: result.error };
        }
        return { service: service.name, success: false, error: 'No access token' };
      });

      const results = await Promise.all(revokePromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      // Update services state
      setServices(prev => 
        prev.map(s => ({
          ...s,
          isConnected: false,
          accessToken: undefined,
        }))
      );

      if (failed.length === 0) {
        toast({
          title: 'All Services Disconnected',
          description: `Successfully disconnected from all ${successful.length} Google services.`,
        });
      } else {
        toast({
          title: 'Partial Success',
          description: `Disconnected from ${successful.length} services. ${failed.length} failed.`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error revoking all Google tokens:', error);
      toast({
        title: 'Error',
        description: `Failed to disconnect from Google services: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsRevoking(null);
    }
  };

  const connectedServices = services.filter(s => s.isConnected);
  const hasConnectedServices = connectedServices.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Unlink className="h-5 w-5" />
          Google Account Management
        </CardTitle>
        <CardDescription>
          Manage your Google service connections and revoke access when needed. Note: Google services are now connected together through unified authentication.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {services.map((service, index) => (
          <div key={service.name}>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                {service.icon}
                <div>
                  <p className="font-medium">{service.name}</p>
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
              {service.isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevokeService(service)}
                  disabled={isRevoking === service.name || isRevoking === 'all'}
                >
                  {isRevoking === service.name ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              )}
            </div>
            {index < services.length - 1 && <Separator />}
          </div>
        ))}
        
        {hasConnectedServices && (
          <>
            <Separator />
            <div className="pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevokeAll}
                disabled={isRevoking !== null}
                className="w-full"
              >
                {isRevoking === 'all' ? 'Disconnecting All...' : 'Disconnect All Google Services'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                This will revoke access to all connected Google services.
              </p>
            </div>
          </>
        )}
        
        {!hasConnectedServices && (
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No Google services are currently connected.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}