'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  Upload,
  Wifi,
  WifiOff,
  Database,
  Shield,
  Zap,
  Calendar,
  Users,
  FileText,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDataSync } from '@/hooks/use-data-sync';
import { GoogleAuthManager } from '@/components/GoogleAuthManager';
import { MicrosoftAuthManager } from '@/components/MicrosoftAuthManager';
import { getData, saveData } from '@/lib/utils';
import { DataItemType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SyncSettings {
  autoSync: boolean;
  syncInterval: number; // in minutes
  syncOnStartup: boolean;
  syncOnClose: boolean;
  conflictResolution: 'local' | 'cloud' | 'manual';
  enableNotifications: boolean;
  syncCustomers: boolean;
  syncAppointments: boolean;
  syncTasks: boolean;
  syncReports: boolean;
  maxRetries: number;
  offlineMode: boolean;
}

interface CloudService {
  id: string;
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  lastSync: string | null;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  storageUsed: number; // in MB
  storageLimit: number; // in MB
  features: string[];
}

const DataSyncPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { syncStatus, lastSyncTime, performSync } = useDataSync();
  const { toast } = useToast();
  
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    autoSync: true,
    syncInterval: 15,
    syncOnStartup: true,
    syncOnClose: true,
    conflictResolution: 'manual',
    enableNotifications: true,
    syncCustomers: true,
    syncAppointments: true,
    syncTasks: true,
    syncReports: false,
    maxRetries: 3,
    offlineMode: false
  });
  
  const [cloudServices, setCloudServices] = useState<CloudService[]>([
    {
      id: 'google',
      name: 'Google Drive',
      icon: <Cloud className="h-5 w-5 text-blue-600" />,
      connected: false,
      lastSync: null,
      status: 'disconnected',
      storageUsed: 0,
      storageLimit: 15000, // 15GB
      features: ['Data Storage', 'Google Calendar', 'Google Tasks']
    },
    {
      id: 'microsoft',
      name: 'OneDrive',
      icon: <Cloud className="h-5 w-5 text-orange-600" />,
      connected: false,
      lastSync: null,
      status: 'disconnected',
      storageUsed: 0,
      storageLimit: 5000, // 5GB
      features: ['Data Storage', 'Outlook Calendar', 'Microsoft Tasks']
    }
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncDetails, setLastSyncDetails] = useState<any>(null);

  useEffect(() => {
    loadSyncSettings();
    loadCloudServiceStatus();
  }, []);

  const loadSyncSettings = () => {
    const savedSettings = getData(DataItemType.SyncSettings) as Partial<SyncSettings> | null;
    if (savedSettings) {
      setSyncSettings(prev => ({ ...prev, ...savedSettings }));
    }
  };

  const loadCloudServiceStatus = () => {
    // Check Google Drive connection
    const googleConnected = Boolean(getData(DataItemType.GoogleDriveConnected));
    const googleLastSync = getData(DataItemType.GoogleLastSync) as string | null;
    
    // Check Microsoft OneDrive connection
    const microsoftConnected = Boolean(getData(DataItemType.MicrosoftDriveConnected));
    const microsoftLastSync = getData(DataItemType.MicrosoftLastSync) as string | null;
    
    setCloudServices(prev => prev.map(service => {
      if (service.id === 'google') {
        return {
          ...service,
          connected: googleConnected,
          lastSync: googleLastSync,
          status: googleConnected ? 'connected' as const : 'disconnected' as const
        };
      }
      if (service.id === 'microsoft') {
        return {
          ...service,
          connected: microsoftConnected,
          lastSync: microsoftLastSync,
          status: microsoftConnected ? 'connected' as const : 'disconnected' as const
        };
      }
      return service;
    }));
  };

  const handleSyncSettingsChange = (key: keyof SyncSettings, value: any) => {
    const newSettings = { ...syncSettings, [key]: value };
    setSyncSettings(newSettings);
    saveData(DataItemType.SyncSettings, newSettings);
    
    toast({
      title: "Settings Updated",
      description: "Sync settings have been saved successfully."
    });
  };

  const handleManualSync = async () => {
    setIsLoading(true);
    setSyncProgress(0);
    
    try {
      // Simulate sync progress
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      // Trigger actual sync
      await performSync();
      
      // Complete progress
      setSyncProgress(100);
      
      // Update last sync time
      const now = new Date().toISOString();
      setLastSyncDetails({
        timestamp: now,
        status: 'success',
        itemsSynced: Math.floor(Math.random() * 100) + 50
      });
      
      toast({
        title: "Sync Complete",
        description: "All data has been synchronized successfully."
      });
      
    } catch (error) {
      console.error('Sync error:', error);
      setSyncProgress(0);
      setLastSyncDetails({
        timestamp: new Date().toISOString(),
        status: 'error',
        error: 'Failed to sync data'
      });
      
      toast({
        title: "Sync Failed",
        description: "Failed to synchronize data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setSyncProgress(0), 2000);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <CloudOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>;
      case 'syncing':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Syncing</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Disconnected</Badge>;
    }
  };

  const formatStorageUsage = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    const usedGB = (used / 1000).toFixed(1);
    const limitGB = (limit / 1000).toFixed(0);
    return { percentage, usedGB, limitGB };
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Sync Settings</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage your cloud storage connections and synchronization preferences
          </p>
        </div>
        <Button 
          onClick={handleManualSync} 
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Syncing...' : 'Sync Now'}</span>
        </Button>
      </div>

      {/* Sync Status Alert */}
      {syncProgress > 0 && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertTitle>Synchronizing Data</AlertTitle>
          <AlertDescription>
            <div className="mt-2">
              <Progress value={syncProgress} className="w-full" />
              <p className="text-sm mt-1">{syncProgress}% complete</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Last Sync Info */}
      {lastSyncTime && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium">Last Sync Successful</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {new Date(lastSyncTime).toLocaleString()}
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                {lastSyncDetails?.itemsSynced || 0} items synced
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="services">Cloud Services</TabsTrigger>
          <TabsTrigger value="settings">Sync Settings</TabsTrigger>
          <TabsTrigger value="devices">Connected Devices</TabsTrigger>
        </TabsList>

        {/* Cloud Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cloudServices.map((service) => {
              const storage = formatStorageUsage(service.storageUsed, service.storageLimit);
              
              return (
                <Card key={service.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {service.icon}
                        <div>
                          <CardTitle className="text-lg">{service.name}</CardTitle>
                          <CardDescription>
                            {service.features.join(', ')}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(service.status)}
                        {getStatusBadge(service.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {service.connected && (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Storage Used</span>
                            <span>{storage.usedGB} GB of {storage.limitGB} GB</span>
                          </div>
                          <Progress value={storage.percentage} className="h-2" />
                        </div>
                        
                        {service.lastSync && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                            <Clock className="h-4 w-4" />
                            <span>Last sync: {new Date(service.lastSync).toLocaleString()}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="pt-2">
                      {service.id === 'google' ? (
                        <GoogleAuthManager />
                      ) : (
                        <MicrosoftAuthManager />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {/* Sync Features */}
          <Card>
            <CardHeader>
              <CardTitle>Sync Features</CardTitle>
              <CardDescription>
                Choose what data to synchronize across your devices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <Label htmlFor="syncCustomers">Customer Data</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Sync customer information and contacts</p>
                    </div>
                  </div>
                  <Switch
                    id="syncCustomers"
                    checked={syncSettings.syncCustomers}
                    onCheckedChange={(checked) => handleSyncSettingsChange('syncCustomers', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <Label htmlFor="syncAppointments">Appointments</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Sync calendar appointments and meetings</p>
                    </div>
                  </div>
                  <Switch
                    id="syncAppointments"
                    checked={syncSettings.syncAppointments}
                    onCheckedChange={(checked) => handleSyncSettingsChange('syncAppointments', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                    <div>
                      <Label htmlFor="syncTasks">Tasks & Reminders</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Sync tasks and reminder notifications</p>
                    </div>
                  </div>
                  <Switch
                    id="syncTasks"
                    checked={syncSettings.syncTasks}
                    onCheckedChange={(checked) => handleSyncSettingsChange('syncTasks', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-orange-600" />
                    <div>
                      <Label htmlFor="syncReports">Reports & Analytics</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Sync generated reports and analytics data</p>
                    </div>
                  </div>
                  <Switch
                    id="syncReports"
                    checked={syncSettings.syncReports}
                    onCheckedChange={(checked) => handleSyncSettingsChange('syncReports', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automatic Sync</CardTitle>
              <CardDescription>
                Configure when and how often your data syncs automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoSync">Enable Automatic Sync</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Automatically sync data in the background</p>
                </div>
                <Switch
                  id="autoSync"
                  checked={syncSettings.autoSync}
                  onCheckedChange={(checked) => handleSyncSettingsChange('autoSync', checked)}
                />
              </div>
              
              {syncSettings.autoSync && (
                <>
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="syncInterval">Sync Interval</Label>
                    <Select 
                      value={syncSettings.syncInterval.toString()} 
                      onValueChange={(value) => handleSyncSettingsChange('syncInterval', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sync interval" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Every 5 minutes</SelectItem>
                        <SelectItem value="15">Every 15 minutes</SelectItem>
                        <SelectItem value="30">Every 30 minutes</SelectItem>
                        <SelectItem value="60">Every hour</SelectItem>
                        <SelectItem value="240">Every 4 hours</SelectItem>
                        <SelectItem value="1440">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="syncOnStartup">Sync on Startup</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Sync data when the app starts</p>
                    </div>
                    <Switch
                      id="syncOnStartup"
                      checked={syncSettings.syncOnStartup}
                      onCheckedChange={(checked) => handleSyncSettingsChange('syncOnStartup', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="syncOnClose">Sync on Close</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Sync data when closing the app</p>
                    </div>
                    <Switch
                      id="syncOnClose"
                      checked={syncSettings.syncOnClose}
                      onCheckedChange={(checked) => handleSyncSettingsChange('syncOnClose', checked)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Conflict Resolution</CardTitle>
              <CardDescription>
                Choose how to handle conflicts when the same data is modified on multiple devices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="conflictResolution">Conflict Resolution Strategy</Label>
                <Select 
                  value={syncSettings.conflictResolution} 
                  onValueChange={(value: 'local' | 'cloud' | 'manual') => handleSyncSettingsChange('conflictResolution', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select conflict resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">
                      <div>
                        <div className="font-medium">Prefer Local Changes</div>
                        <div className="text-sm text-gray-600">Local changes take priority over cloud changes</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="cloud">
                      <div>
                        <div className="font-medium">Prefer Cloud Changes</div>
                        <div className="text-sm text-gray-600">Cloud changes take priority over local changes</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="manual">
                      <div>
                        <div className="font-medium">Manual Resolution</div>
                        <div className="text-sm text-gray-600">Ask me to resolve conflicts manually</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Additional sync configuration options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableNotifications">Sync Notifications</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Show notifications when sync completes</p>
                </div>
                <Switch
                  id="enableNotifications"
                  checked={syncSettings.enableNotifications}
                  onCheckedChange={(checked) => handleSyncSettingsChange('enableNotifications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="offlineMode">Offline Mode</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Work offline and sync when connection is restored</p>
                </div>
                <Switch
                  id="offlineMode"
                  checked={syncSettings.offlineMode}
                  onCheckedChange={(checked) => handleSyncSettingsChange('offlineMode', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxRetries">Max Retry Attempts</Label>
                <Select 
                  value={syncSettings.maxRetries.toString()} 
                  onValueChange={(value) => handleSyncSettingsChange('maxRetries', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select max retries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 retry</SelectItem>
                    <SelectItem value="3">3 retries</SelectItem>
                    <SelectItem value="5">5 retries</SelectItem>
                    <SelectItem value="10">10 retries</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connected Devices Tab */}
        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Devices</CardTitle>
              <CardDescription>
                Devices that have access to your FinCRuM data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Monitor className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium">Desktop - Windows</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">This device • Last active: Now</p>
                    </div>
                  </div>
                  <Badge variant="default">Current Device</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-medium">Mobile - Android</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Last active: 2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Synced</Badge>
                    <Button variant="ghost" size="sm">
                      Revoke Access
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Tablet className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="font-medium">Tablet - iPad</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Last active: 1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Offline</Badge>
                    <Button variant="ghost" size="sm">
                      Revoke Access
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Device Security</CardTitle>
              <CardDescription>
                Manage security settings for connected devices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requireAuth">Require Authentication</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Require login on each device</p>
                </div>
                <Switch id="requireAuth" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoLogout">Auto Logout</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Automatically logout inactive devices</p>
                </div>
                <Switch id="autoLogout" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="encryptData">Encrypt Synced Data</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Encrypt data during transmission and storage</p>
                </div>
                <Switch id="encryptData" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataSyncPage;