// src/components/SecuritySettings.tsx

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Shield, 
  Lock, 
  Key, 
  Smartphone, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  Eye, 
  EyeOff, 
  Trash2, 
  RefreshCw, 
  Clock, 
  Users, 
  FileText, 
  Download,
  Upload,
  Zap,
  Globe,
  Database,
  History
} from 'lucide-react';
import { formatDateTime, getData, saveData } from '@/lib/utils';
// Dynamic import to prevent server-side modules from being bundled on client
// import { crossDeviceSyncManager } from '@/services/cross-device-sync-manager';
import { userAccountSyncService } from '@/services/user-account-sync';
import { DeviceRegistration, UserAccountSyncConfig, UserAccountConflict, DataItemType } from '@/lib/types';

export interface SecuritySettingsProps {
  className?: string;
}

export function SecuritySettings({ className }: SecuritySettingsProps) {
  const { currentUser } = useAuth();
  
  // State for sync configuration
  const [syncConfig, setSyncConfig] = useState<UserAccountSyncConfig | null>(null);
  const [deviceRegistration, setDeviceRegistration] = useState<DeviceRegistration | null>(null);
  const [pendingConflicts, setPendingConflicts] = useState<UserAccountConflict[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  
  // State for UI controls
  const [isLoading, setIsLoading] = useState(false);
  const [showDeviceToken, setShowDeviceToken] = useState(false);
  const [showEncryptionKey, setShowEncryptionKey] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [deviceToRevoke, setDeviceToRevoke] = useState<string | null>(null);
  const [autoSyncInterval, setAutoSyncInterval] = useState(30); // minutes
  const [conflictResolutionStrategy, setConflictResolutionStrategy] = useState<'manual' | 'auto-recent' | 'auto-merge'>('auto-recent');
  
  // Load initial data
  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setIsLoading(true);
      
      // Load sync configuration
      const config = getData<UserAccountSyncConfig>(DataItemType.UserAccountSyncConfig);
      setSyncConfig(config);
      
      // Load device registration
      const device = getData<DeviceRegistration>(DataItemType.DeviceRegistration);
      setDeviceRegistration(device);
      
      // Load sync status
      const { crossDeviceSyncManager } = await import('@/services/cross-device-sync-manager');
      const status = await crossDeviceSyncManager.getSyncStatus();
      setSyncStatus(status);
      
      // Load pending conflicts
      const conflicts = await crossDeviceSyncManager.getPendingConflicts();
      setPendingConflicts(conflicts);
      
      // Load user preferences
      const interval = getData<number>(DataItemType.AutoSyncInterval) ?? 30;
      setAutoSyncInterval(interval);
      
      const strategy = getData<string>(DataItemType.ConflictResolutionStrategy) ?? 'auto-recent';
      setConflictResolutionStrategy(strategy as any);
      
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableSync = async () => {
    try {
      setIsLoading(true);
      // Note: This would need cloud provider and auth info to properly initialize
      // For now, we'll just call disable to reset state
      const { crossDeviceSyncManager } = await import('@/services/cross-device-sync-manager');
      await crossDeviceSyncManager.disable();
      await loadSecurityData();
    } catch (error) {
      console.error('Error enabling sync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableSync = async () => {
    try {
      setIsLoading(true);
      const { crossDeviceSyncManager } = await import('@/services/cross-device-sync-manager');
      await crossDeviceSyncManager.disable();
      await loadSecurityData();
    } catch (error) {
      console.error('Error disabling sync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoSyncToggle = async (enabled: boolean) => {
    try {
      const { crossDeviceSyncManager } = await import('@/services/cross-device-sync-manager');
      if (enabled) {
        await crossDeviceSyncManager.startAutoSync();
      } else {
        crossDeviceSyncManager.stopAutoSync();
      }
      await loadSecurityData();
    } catch (error) {
      console.error('Error toggling auto sync:', error);
    }
  };

  const handleIntervalChange = async (newInterval: number) => {
    setAutoSyncInterval(newInterval);
    saveData(DataItemType.AutoSyncInterval, newInterval);
    
    // Restart auto sync with new interval if it's currently running
    if (syncStatus?.autoSyncEnabled) {
      const { crossDeviceSyncManager } = await import('@/services/cross-device-sync-manager');
      crossDeviceSyncManager.stopAutoSync();
      crossDeviceSyncManager.startAutoSync();
    }
  };

  const handleConflictStrategyChange = (strategy: string) => {
    setConflictResolutionStrategy(strategy as any);
    saveData(DataItemType.ConflictResolutionStrategy, strategy);
  };

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      setIsLoading(true);
      // Implementation would call the sync service to revoke device
      // await userAccountSyncService.revokeDevice(deviceId);
      setShowRevokeDialog(false);
      setDeviceToRevoke(null);
      await loadSecurityData();
    } catch (error) {
      console.error('Error revoking device:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setIsLoading(true);
      const { crossDeviceSyncManager } = await import('@/services/cross-device-sync-manager');
      await crossDeviceSyncManager.performSync();
      await loadSecurityData();
    } catch (error) {
      console.error('Error performing manual sync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: 'keep_local' | 'keep_remote' | 'merge') => {
    try {
      setIsLoading(true);
      // Map resolution values to match CrossDeviceSyncManager expectations
      const mappedResolution = resolution === 'keep_local' ? 'local' : 
                              resolution === 'keep_remote' ? 'cloud' : 
                              'merge';
      const { crossDeviceSyncManager } = await import('@/services/cross-device-sync-manager');
      await crossDeviceSyncManager.resolveConflict(conflictId, mappedResolution);
      await loadSecurityData();
    } catch (error) {
      console.error('Error resolving conflict:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSecurityLevel = () => {
    if (!syncConfig?.enabled) return { level: 'Low', color: 'text-red-500', description: 'Sync disabled' };
    if (!deviceRegistration?.isActive) return { level: 'Medium', color: 'text-yellow-500', description: 'Device not active' };
    if (syncConfig.encryptionEnabled && deviceRegistration.isActive) {
      return { level: 'High', color: 'text-green-500', description: 'Fully secured' };
    }
    return { level: 'Medium', color: 'text-yellow-500', description: 'Partially secured' };
  };

  const securityLevel = getSecurityLevel();

  return (
    <div className={className}>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="sync">Sync Settings</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Overview
              </CardTitle>
              <CardDescription>
                Monitor and configure your cross-device synchronization security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Security Level */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className={`h-6 w-6 ${securityLevel.color}`} />
                  <div>
                    <p className="font-medium">Security Level</p>
                    <p className="text-sm text-muted-foreground">{securityLevel.description}</p>
                  </div>
                </div>
                <Badge variant={securityLevel.level === 'High' ? 'default' : securityLevel.level === 'Medium' ? 'secondary' : 'destructive'}>
                  {securityLevel.level}
                </Badge>
              </div>

              {/* Sync Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">Sync Status</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {syncConfig?.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                  {syncStatus?.lastSyncTime && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last sync: {formatDateTime(syncStatus.lastSyncTime)}
                    </p>
                  )}
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-sm">Encryption</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {syncConfig?.encryptionEnabled ? 'AES-256-GCM' : 'Disabled'}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <Separator />
              <div className="flex flex-col sm:flex-row gap-3">
                {!syncConfig?.enabled ? (
                  <Button onClick={handleEnableSync} disabled={isLoading} className="flex-1">
                    <Shield className="mr-2 h-4 w-4" />
                    Enable Secure Sync
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleManualSync} disabled={isLoading} className="flex-1">
                      {isLoading ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Sync Now
                    </Button>
                    <Button variant="outline" onClick={handleDisableSync} disabled={isLoading} className="flex-1">
                      <Shield className="mr-2 h-4 w-4" />
                      Disable Sync
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Device Management
              </CardTitle>
              <CardDescription>
                Manage trusted devices and registration tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Device */}
              {deviceRegistration && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">Current Device</Label>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{deviceRegistration.deviceName}</p>
                          <p className="text-sm text-muted-foreground">
                            ID: {deviceRegistration.deviceId.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <Badge variant={deviceRegistration.isActive ? 'default' : 'secondary'}>
                        {deviceRegistration.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Registered</p>
                        <p>{formatDateTime(deviceRegistration.registeredAt)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Active</p>
                        <p>{formatDateTime(deviceRegistration.lastActiveAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Device Registration Token */}
              {deviceRegistration?.registrationToken && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Registration Token</Label>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Device Registration Token</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDeviceToken(!showDeviceToken)}
                        >
                          {showDeviceToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="font-mono text-xs bg-muted p-2 rounded">
                        {showDeviceToken ? deviceRegistration.registrationToken : '••••••••••••••••••••••••••••••••'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Use this token to register additional devices
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Trusted Devices List */}
              <Separator />
              <div className="space-y-3">
                <Label className="text-base font-medium">Trusted Devices</Label>
                <div className="space-y-2">
                  {/* This would be populated from the sync service */}
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-sm font-medium">Current Device</p>
                          <p className="text-xs text-muted-foreground">Last active: Now</p>
                        </div>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </div>
                  
                  {/* Example of other devices */}
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Work Laptop</p>
                          <p className="text-xs text-muted-foreground">Last active: 2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Inactive</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeviceToRevoke('work-laptop-id');
                            setShowRevokeDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Settings Tab */}
        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Synchronization Settings
              </CardTitle>
              <CardDescription>
                Configure automatic sync and conflict resolution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto Sync */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Automatic Synchronization</Label>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Auto-sync</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync user accounts across devices
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={syncStatus?.autoSyncEnabled || false}
                    onCheckedChange={handleAutoSyncToggle}
                    disabled={!syncConfig?.enabled || isLoading}
                  />
                </div>
              </div>

              {/* Sync Interval */}
              {syncStatus?.autoSyncEnabled && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">Sync Interval</Label>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <Select value={autoSyncInterval.toString()} onValueChange={(value) => handleIntervalChange(parseInt(value))}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Every 5 minutes</SelectItem>
                        <SelectItem value="15">Every 15 minutes</SelectItem>
                        <SelectItem value="30">Every 30 minutes</SelectItem>
                        <SelectItem value="60">Every hour</SelectItem>
                        <SelectItem value="180">Every 3 hours</SelectItem>
                        <SelectItem value="360">Every 6 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Separator />

              {/* Conflict Resolution Strategy */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Conflict Resolution</Label>
                <div className="space-y-3">
                  <Select value={conflictResolutionStrategy} onValueChange={handleConflictStrategyChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Resolution</SelectItem>
                      <SelectItem value="auto-recent">Auto - Keep Most Recent</SelectItem>
                      <SelectItem value="auto-merge">Auto - Merge When Possible</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="text-sm text-muted-foreground">
                    {conflictResolutionStrategy === 'manual' && (
                      <p>Conflicts will require manual resolution through the UI</p>
                    )}
                    {conflictResolutionStrategy === 'auto-recent' && (
                      <p>Automatically keep the most recently modified data</p>
                    )}
                    {conflictResolutionStrategy === 'auto-merge' && (
                      <p>Automatically merge compatible changes, prompt for conflicts</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Encryption Settings */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Encryption</Label>
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    <strong>End-to-End Encryption:</strong> All user account data is encrypted using AES-256-GCM 
                    before being stored in the cloud. Encryption keys are derived from your authentication 
                    credentials and device fingerprint.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">Algorithm</span>
                    </div>
                    <p className="text-xs text-muted-foreground">AES-256-GCM</p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">Key Derivation</span>
                    </div>
                    <p className="text-xs text-muted-foreground">PBKDF2-SHA256</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Conflict Resolution
              </CardTitle>
              <CardDescription>
                Review and resolve synchronization conflicts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {pendingConflicts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">No Conflicts</p>
                  <p className="text-muted-foreground">All user accounts are synchronized</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingConflicts.map((conflict, index) => (
                    <div key={conflict.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          <div>
                            <p className="font-medium">User Account Conflict</p>
                            <p className="text-sm text-muted-foreground">
                              {conflict.conflictType} - {formatDateTime(conflict.timestamp)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">{conflict.conflictType}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="p-3 bg-muted rounded">
                          <p className="text-sm font-medium mb-2">Local Version</p>
                          <p className="text-xs text-muted-foreground">
                            Modified: {formatDateTime(conflict.localAccount.lastModified)}
                          </p>
                        </div>
                        <div className="p-3 bg-muted rounded">
                          <p className="text-sm font-medium mb-2">Remote Version</p>
                          <p className="text-xs text-muted-foreground">
                            Modified: {formatDateTime(conflict.cloudAccount.lastModified)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveConflict(conflict.id, 'keep_local')}
                          disabled={isLoading}
                        >
                          Keep Local
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveConflict(conflict.id, 'keep_remote')}
                          disabled={isLoading}
                        >
                          Keep Remote
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResolveConflict(conflict.id, 'merge')}
                          disabled={isLoading}
                        >
                          Merge
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Device Revocation Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Device Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke access for this device? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deviceToRevoke && handleRevokeDevice(deviceToRevoke)}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}