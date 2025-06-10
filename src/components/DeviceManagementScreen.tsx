import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDeviceManager } from '@/services/device-management';
import { getRealTimeSync } from '@/services/real-time-sync';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  Globe, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle,
  Trash2,
  Eye,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'web';
  platform: string;
  userAgent: string;
  registeredAt: string;
  lastActiveAt: string;
  isActive: boolean;
  userId: string;
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
}

interface DeviceAuthRequest {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'web';
  platform: string;
  userAgent: string;
  userId: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
}

interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: string | null;
  syncInProgress: boolean;
  queueLength: number;
  conflictCount: number;
  optimisticUpdateCount: number;
}

const DeviceManagementScreen: React.FC = () => {
  const { currentUser, getAllUsers } = useAuth();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [authRequests, setAuthRequests] = useState<DeviceAuthRequest[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getRealTimeSync().getSyncStatus());
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    
    // Listen for sync status changes
    const syncStatusListener = (status: SyncStatus) => {
      setSyncStatus(status);
    };
    
    getRealTimeSync().addSyncStatusListener('device-management', syncStatusListener);
    
    return () => {
      getRealTimeSync().removeSyncStatusListener('device-management');
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load users
      const usersResult = await getAllUsers();
      if (usersResult.success && usersResult.users) {
        setUsers(usersResult.users);
        
        // Load devices for all users
        const allDevices: DeviceInfo[] = [];
        for (const user of usersResult.users) {
          const userDevicesResult = await getDeviceManager().getUserDevices(user.id);
          if (userDevicesResult.success && userDevicesResult.devices) {
            allDevices.push(...userDevicesResult.devices);
          }
        }
        setDevices(allDevices);
      }
      
      // Load pending auth requests
      const pendingRequests = getDeviceManager().getPendingAuthRequests();
      setAuthRequests(pendingRequests.filter(req => req.status === 'pending'));
      
    } catch (error) {
      console.error('Error loading device data:', error);
      toast({
        title: "Error",
        description: "Failed to load device information.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveDevice = async (requestId: string) => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const result = await getDeviceManager().approveDeviceRequest(requestId, currentUser.id);
      if (result.success) {
        toast({
          title: "Device Approved",
          description: "Device has been authorized successfully."
        });
        await loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to approve device.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error approving device:', error);
      toast({
        title: "Error",
        description: "Failed to approve device.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectDevice = async (requestId: string) => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const result = await getDeviceManager().rejectDeviceRequest(requestId, currentUser.id);
      if (result.success) {
        toast({
          title: "Device Rejected",
          description: "Device authorization has been rejected."
        });
        await loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to reject device.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error rejecting device:', error);
      toast({
        title: "Error",
        description: "Failed to reject device.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeDevice = async (userId: string, deviceId: string) => {
    setIsLoading(true);
    try {
      const result = await getDeviceManager().revokeDeviceAccess(userId, deviceId);
      if (result.success) {
        toast({
          title: "Device Revoked",
          description: "Device access has been revoked."
        });
        await loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to revoke device access.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error revoking device:', error);
      toast({
        title: "Error",
        description: "Failed to revoke device access.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSync = async () => {
    setIsLoading(true);
    try {
      const result = await getRealTimeSync().performSync();
      if (result.success) {
        toast({
          title: "Sync Complete",
          description: "Data synchronization completed successfully."
        });
      } else {
        toast({
          title: "Sync Failed",
          description: result.error || "Failed to synchronize data.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error forcing sync:', error);
      toast({
        title: "Error",
        description: "Failed to synchronize data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      case 'desktop':
        return <Monitor className="w-4 h-4" />;
      case 'web':
        return <Globe className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getDeviceTypeColor = (type: string) => {
    switch (type) {
      case 'mobile':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'tablet':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'desktop':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'web':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
  };

  const canManageDevices = currentUser?.permissions?.canModifyUsers || currentUser?.role === 'admin' || currentUser?.role === 'partner';

  if (!currentUser || !canManageDevices) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to manage devices.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Device Management</h1>
          <p className="text-muted-foreground">Monitor and manage device access across the organization</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            {syncStatus.isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-green-600">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-red-600">Offline</span>
              </>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleForceSync}
            disabled={isLoading || syncStatus.syncInProgress}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncStatus.syncInProgress ? 'animate-spin' : ''}`} />
            {syncStatus.syncInProgress ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Sync Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {syncStatus.isOnline ? (
                  <span className="text-green-600">Online</span>
                ) : (
                  <span className="text-red-600">Offline</span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">Connection</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{syncStatus.queueLength}</div>
              <div className="text-sm text-muted-foreground">Pending Sync</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{syncStatus.conflictCount}</div>
              <div className="text-sm text-muted-foreground">Conflicts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{syncStatus.optimisticUpdateCount}</div>
              <div className="text-sm text-muted-foreground">Local Changes</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">
                {syncStatus.lastSyncTime ? formatRelativeTime(syncStatus.lastSyncTime) : 'Never'}
              </div>
              <div className="text-sm text-muted-foreground">Last Sync</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices">Registered Devices</TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Pending Requests
            {authRequests.length > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {authRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>Registered Devices</CardTitle>
              <CardDescription>
                {devices.length} device{devices.length !== 1 ? 's' : ''} registered across all users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Loading devices...
                </div>
              ) : devices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No devices registered
                </div>
              ) : (
                <div className="space-y-4">
                  {devices.map((device) => (
                    <div key={device.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getDeviceIcon(device.type)}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{device.name}</h3>
                            <Badge className={`${getDeviceTypeColor(device.type)} flex items-center gap-1`}>
                              {device.type}
                            </Badge>
                            {device.isActive ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-600 border-gray-600">
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>User: {getUserName(device.userId)}</div>
                            <div>Platform: {device.platform}</div>
                            <div>Last Active: {formatRelativeTime(device.lastActiveAt)}</div>
                            {device.location?.timezone && (
                              <div>Timezone: {device.location.timezone}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1" />
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedDevice(device);
                            setShowDeviceDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke Device Access</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to revoke access for {device.name}? The user will need to re-authorize this device.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleRevokeDevice(device.userId, device.id)}
                              >
                                Revoke Access
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Authorization Requests
              </CardTitle>
              <CardDescription>
                {authRequests.length} device{authRequests.length !== 1 ? 's' : ''} waiting for authorization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Loading requests...
                </div>
              ) : authRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending authorization requests
                </div>
              ) : (
                <div className="space-y-4">
                  {authRequests.map((request) => (
                    <div key={request.deviceId} className="flex items-center gap-4 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        {getDeviceIcon(request.deviceType)}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{request.deviceName}</h3>
                            <Badge className={`${getDeviceTypeColor(request.deviceType)} flex items-center gap-1`}>
                              {request.deviceType}
                            </Badge>
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>User: {getUserName(request.userId)}</div>
                            <div>Platform: {request.platform}</div>
                            <div>Requested: {formatRelativeTime(request.requestedAt)}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1" />
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleApproveDevice(request.deviceId)}
                          disabled={isLoading}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleRejectDevice(request.deviceId)}
                          disabled={isLoading}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
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

      {/* Device Details Dialog */}
      <Dialog open={showDeviceDetails} onOpenChange={setShowDeviceDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Device Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected device
            </DialogDescription>
          </DialogHeader>
          {selectedDevice && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {getDeviceIcon(selectedDevice.type)}
                <div>
                  <h3 className="font-medium">{selectedDevice.name}</h3>
                  <Badge className={`${getDeviceTypeColor(selectedDevice.type)} mt-1`}>
                    {selectedDevice.type}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div><strong>Device ID:</strong> {selectedDevice.id}</div>
                <div><strong>User:</strong> {getUserName(selectedDevice.userId)}</div>
                <div><strong>Platform:</strong> {selectedDevice.platform}</div>
                <div><strong>Registered:</strong> {formatDate(selectedDevice.registeredAt)}</div>
                <div><strong>Last Active:</strong> {formatDate(selectedDevice.lastActiveAt)}</div>
                {selectedDevice.location?.timezone && (
                  <div><strong>Timezone:</strong> {selectedDevice.location.timezone}</div>
                )}
                <div><strong>Status:</strong> 
                  <Badge 
                    variant="outline" 
                    className={`ml-2 ${selectedDevice.isActive ? 'text-green-600 border-green-600' : 'text-gray-600 border-gray-600'}`}
                  >
                    {selectedDevice.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              
              <div className="pt-2">
                <h4 className="font-medium mb-2">User Agent</h4>
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded break-all">
                  {selectedDevice.userAgent}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeviceDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeviceManagementScreen;