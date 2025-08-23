// src/components/LocalDataStatus.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCloudDatabase } from '@/hooks/use-cloud-database';
import { HardDrive, Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { formatDateTime } from '@/lib/utils';

export interface LocalDataStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function LocalDataStatus({ className, showDetails = true }: LocalDataStatusProps) {
  const { state, actions } = useCloudDatabase();
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [isResolvingConflicts, setIsResolvingConflicts] = useState(false);

  const handleResolveConflicts = async (resolutions: any) => {
    setIsResolvingConflicts(true);
    try {
      await actions.resolveConflicts(resolutions);
      setShowConflictDialog(false);
    } finally {
      setIsResolvingConflicts(false);
    }
  };

  const getStatusIcon = () => {
    if (!state.isConnected) {
      return <CloudOff className="h-4 w-4 text-gray-500" />;
    }
    if (state.isSyncing) {
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    if (state.hasUnresolvedConflicts) {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    if (state.error) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!state.isConnected) {
      return 'Not connected';
    }
    if (state.isSyncing) {
      return 'Syncing...';
    }
    if (state.hasUnresolvedConflicts) {
      return `${state.conflicts.length} Conflict${state.conflicts.length > 1 ? 's' : ''}`;
    }
    if (state.error) {
      return 'Sync error';
    }
    return 'Connected';
  };

  const getStatusVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (!state.isConnected) {
      return 'secondary';
    }
    if (state.hasUnresolvedConflicts) {
      return 'destructive';
    }
    if (state.error) {
      return 'destructive';
    }
    return 'default';
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

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        <Badge variant={getStatusVariant()}>
          {getStatusText()}
        </Badge>
        {state.isConnected && (
          <div className="flex items-center gap-1">
            {state.hasUnresolvedConflicts && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConflictDialog(true)}
                className="h-6 px-2 text-orange-600 hover:bg-orange-50"
              >
                <AlertTriangle className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => actions.syncNow()}
              disabled={state.isSyncing}
              className="h-6 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${state.isSyncing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <HardDrive className="h-5 w-5" />
        Local Data Status
      </CardTitle>
      <CardDescription>
        Local data storage with optional cloud backup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">{getStatusText()}</span>
            </div>
            <Badge variant={getStatusVariant()}>
              {getProviderName()}
            </Badge>
          </div>

          {/* Last Sync Time */}
          {state.lastSyncTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last sync: {formatDateTime(state.lastSyncTime)}</span>
            </div>
          )}

          {/* Error Message */}
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {state.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Conflict Resolution Button */}
          {state.hasUnresolvedConflicts && (
            <Button
              onClick={() => setShowConflictDialog(true)}
              className="w-full"
              variant="destructive"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Resolve {state.conflicts.length} Conflict{state.conflicts.length > 1 ? 's' : ''}
            </Button>
          )}

          {/* Sync Button */}
          {state.isConnected && !state.hasUnresolvedConflicts && (
            <Button
              onClick={() => actions.syncNow()}
              disabled={state.isSyncing}
              className="w-full"
              variant={state.error ? 'destructive' : 'default'}
            >
              {state.isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {state.error ? 'Retry Sync' : 'Sync Now'}
                </>
              )}
            </Button>
          )}

          {/* Connection Instructions */}
          {!state.isConnected && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your data is stored locally. Optionally connect to Google Drive or OneDrive for backup.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
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

/**
 * Compact version for use in headers or toolbars
 */
export function LocalDataStatusCompact({ className }: { className?: string }) {
  return <LocalDataStatus className={className} showDetails={false} />;
}