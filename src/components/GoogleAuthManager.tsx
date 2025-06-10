import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { DataItemType } from '@/lib/types';
import { revokeGoogleTokensAction } from '@/app/actions/google-auth-actions';
// Removed direct import of isGoogleOAuthConfigured to avoid client-side google-auth-library issues
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
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [configLoading, setConfigLoading] = useState<boolean>(true);

  // Check if Google OAuth is configured
  useEffect(() => {
    const checkConfiguration = async () => {
      try {
        const response = await fetch('/api/auth/google/config');
        const data = await response.json();
        setIsConfigured(data.configured);
      } catch (error) {
        console.error('Error checking Google configuration:', error);
        setIsConfigured(false);
      } finally {
        setConfigLoading(false);
      }
    };

    checkConfiguration();
  }, []);

  // Load services and their connection status
  useEffect(() => {
    const loadServices = () => {
      const googleServices: GoogleService[] = [
        {
          name: 'Google Calendar',
          icon: <Calendar className="h-4 w-4" />,
          accessTokenKey: DataItemType.GoogleCalendarAccessToken,
          refreshTokenKey: DataItemType.GoogleCalendarRefreshToken,
          isConnected: false,
        },
        {
          name: 'Google Drive',
          icon: <HardDrive className="h-4 w-4" />,
          accessTokenKey: DataItemType.GoogleDriveAccessToken,
          refreshTokenKey: DataItemType.GoogleDriveRefreshToken,
          isConnected: false,
        },
      ];

      // Check connection status for each service
      const updatedServices = googleServices.map(service => {
        const accessToken = localStorage.getItem(service.accessTokenKey);
        const refreshToken = localStorage.getItem(service.refreshTokenKey);
        return {
          ...service,
          isConnected: !!(accessToken && refreshToken),
          accessToken: accessToken || undefined,
        };
      });

      setServices(updatedServices);
    };

    loadServices();
    
    // Set up an interval to refresh the connection status
    const interval = setInterval(loadServices, 5000);
    return () => clearInterval(interval);
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
      const result = await revokeGoogleTokensAction([service.accessTokenKey]);
      
      if (result.success) {
        // Remove tokens from localStorage
        localStorage.removeItem(service.accessTokenKey);
        localStorage.removeItem(service.refreshTokenKey);
        
        // Update services state
        setServices(prev => prev.map(s => 
          s.name === service.name 
            ? { ...s, isConnected: false, accessToken: undefined }
            : s
        ));
        
        toast({
          title: 'Service Disconnected',
          description: `Successfully disconnected from ${service.name}.`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to disconnect from ${service.name}.`,
          variant: 'destructive',
        });
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
    const connectedServices = services.filter(s => s.isConnected);
    
    if (connectedServices.length === 0) {
      toast({
        title: 'No Services Connected',
        description: 'There are no Google services currently connected.',
      });
      return;
    }

    setIsRevoking('all');
    try {
      const tokenKeys = connectedServices.map(s => s.accessTokenKey);
      const result = await revokeGoogleTokensAction(tokenKeys);
      
      // Process results
      const successful: string[] = [];
      const failed: string[] = [];
      
      await Promise.all(
        connectedServices.map(async (service) => {
          try {
            // Remove tokens from localStorage
            localStorage.removeItem(service.accessTokenKey);
            localStorage.removeItem(service.refreshTokenKey);
            successful.push(service.name);
          } catch (error) {
            failed.push(service.name);
          }
        })
      );

      // Update services state
      setServices(prev => prev.map(s => ({
        ...s,
        isConnected: false,
        accessToken: undefined,
      })));

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
        {configLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-gray-500">Checking configuration...</div>
          </div>
        ) : !isConfigured ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 mb-1">Google OAuth Not Configured</h4>
                <p className="text-sm text-yellow-700">
                  Google OAuth credentials are not configured. Please set up your Google OAuth credentials in the environment variables to enable Google services.
                </p>
              </div>
            </div>
          </div>
        ) : hasConnectedServices ? (
          <>
            <div className="space-y-3">
              {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {service.icon}
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-gray-500">
                        {service.isConnected ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Connected
                          </div>
                        ) : (
                          <div className="text-gray-400">Not connected</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={service.isConnected ? 'default' : 'secondary'}>
                      {service.isConnected ? 'Active' : 'Inactive'}
                    </Badge>
                    {service.isConnected && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeService(service)}
                        disabled={isRevoking === service.name}
                      >
                        {isRevoking === service.name ? 'Disconnecting...' : 'Disconnect'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="font-medium">Disconnect All Services</div>
                <div className="text-sm text-gray-500">
                  Remove access for all connected Google services at once.
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={handleRevokeAll}
                disabled={isRevoking === 'all'}
              >
                {isRevoking === 'all' ? 'Disconnecting...' : 'Disconnect All'}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Unlink className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No Connected Services</p>
            <p className="text-sm">
              No Google services are currently connected.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}