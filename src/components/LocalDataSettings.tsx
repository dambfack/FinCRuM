// src/components/LocalDataSettings.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCloudDatabase } from '@/hooks/use-cloud-database';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Cloud, 
  Settings, 
  Shield, 
  Users, 
  Database, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  FileText
} from 'lucide-react';
import { ConflictResolutionLog } from './ConflictResolutionLog';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { formatDateTime, getData, saveData } from '@/lib/utils';
import { DataItemType } from '@/lib/types';

export interface LocalDataSettingsProps {
  className?: string;
}

export function LocalDataSettings({ className }: LocalDataSettingsProps) {
  const { state, actions } = useCloudDatabase();
  const { user } = useAuth();
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(
    getData<boolean>('autoSyncEnabled') ?? true
  );
  const [isInitializing, setIsInitializing] = useState(false);
  const [showConflictLog, setShowConflictLog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [isResolvingConflicts, setIsResolvingConflicts] = useState(false);

  const handleAutoSyncToggle = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    actions.enableAutoSync(enabled);
    saveData('autoSyncEnabled', enabled);
  };

  const handleInitializeSharedDatabase = async () => {
    if (!state.provider) return;
    
    setIsInitializing(true);
    try {
      await actions.syncNow();
    } finally {
      setIsInitializing(false);
    }
  };

  const handleResolveConflicts = async (resolutions: any) => {
    setIsResolvingConflicts(true);
    try {
      await actions.resolveConflicts(resolutions);
      setShowConflictDialog(false);
    } finally {
      setIsResolvingConflicts(false);
    }
  };

  const getProviderName = () => {
    switch (state.provider) {
      case 'googledrive':
        return 'Google Drive';
      case 'onedrive':
        return 'OneDrive';
      default:
        return 'None';
    }
  };

  return (
    <>
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Local Data Settings
        </CardTitle>
        <CardDescription>
          Configure local data storage and optional cloud backup synchronization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Connection Status</Label>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {state.isConnected ? 'Connected' : 'Not Connected'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Provider: {getProviderName()}
                </p>
              </div>
            </div>
            <Badge variant={state.isConnected ? 'default' : 'secondary'}>
              {state.isConnected ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Auto-Sync Settings */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Automatic Synchronization</Label>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Auto-sync</p>
                <p className="text-sm text-muted-foreground">
                  Automatically sync changes with cloud storage
                </p>
              </div>
            </div>
            <Switch
              checked={autoSyncEnabled}
              onCheckedChange={handleAutoSyncToggle}
              disabled={!state.isConnected}
            />
          </div>
        </div>

        <Separator />

        {/* Shared Database Info */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Shared Database</Label>
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> All authenticated users share the same database. 
              Changes made by any user will be visible to all other users after synchronization.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Multi-User Access</span>
              </div>
              <p className="text-xs text-muted-foreground">
                All valid users can read and write to the same database
              </p>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">Conflict Prevention</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Automatic merge prevents data duplication
              </p>
            </div>
          </div>
        </div>

        {/* Last Sync Info */}
        {state.lastSyncTime && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-base font-medium">Last Synchronization</Label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{formatDateTime(state.lastSyncTime)}</span>
              </div>
            </div>
          </>
        )}

        {/* Error Display */}
        {state.error && (
          <>
            <Separator />
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Sync Error:</strong> {state.error}
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* Conflict Resolution */}
        {state.hasUnresolvedConflicts && (
          <>
            <Separator />
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {state.conflicts.length} unresolved conflict{state.conflicts.length > 1 ? 's' : ''} detected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowConflictDialog(true)}
                  className="ml-2"
                >
                  Resolve
                </Button>
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* Action Buttons */}
        <Separator />
        <div className="flex flex-col sm:flex-row gap-3">
          {state.isConnected ? (
            <>
              <Button
                onClick={actions.syncNow}
                disabled={state.isSyncing}
                className="flex-1"
              >
                {state.isSyncing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleInitializeSharedDatabase}
                disabled={isInitializing || state.isSyncing}
                className="flex-1"
              >
                {isInitializing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Initialize Shared DB
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => setShowConflictLog(!showConflictLog)}
                variant="outline"
                className="flex-1"
              >
                <FileText className="mr-2 h-4 w-4" />
                {showConflictLog ? 'Hide' : 'View'} Conflict Log
              </Button>
            </>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Please authenticate with Google Drive or OneDrive in the Authentication 
                section to enable cloud synchronization.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* User Info */}
        {user && (
          <>
            <Separator />
            <div className="text-xs text-muted-foreground">
              <p>Current user: {user.name || user.email}</p>
              <p>User ID: {user.id}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
    
    {/* Conflict Resolution Log */}
    {showConflictLog && (
      <ConflictResolutionLog className="mt-6" />
    )}
    
    <ConflictResolutionDialog
      open={showConflictDialog}
      onOpenChange={setShowConflictDialog}
      conflicts={state.conflicts}
      onResolve={handleResolveConflicts}
      isResolving={isResolvingConflicts}
    />
    </>
  );
}