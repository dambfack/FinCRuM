// src/components/SyncManager.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataSync, ConflictResolutionUI } from '@/hooks/use-data-sync';
import { cn, formatDateTime, getData, saveData } from '@/lib/utils';
import { Cloud, CloudCog, CloudOff, Loader2, RefreshCw as RefreshCwIcon, AlertTriangle, HelpCircle } from 'lucide-react'; // Renamed RefreshCw
import { Skeleton } from '@/components/ui/skeleton';

const SyncManager = () => {
  const {
    isSyncing, // This is a boolean from the original hook, now covered by syncStatus
    conflicts,
    lastSyncTime,
    performSync,
    resolveConflict,
    initiateAuthentication,
    syncStatus, 
    isGoogleDriveConnected, // Now directly from the hook
    isOneDriveConnected,   // Now directly from the hook
  } = useDataSync();

  const formattedLastSyncTime = lastSyncTime ? formatDateTime(lastSyncTime) : 'Never';
  
  const isAnyProviderConfigured = useCallback(() => {
    return isOneDriveConnected || isGoogleDriveConnected;
  }, [isOneDriveConnected, isGoogleDriveConnected]);

  const renderProviderStatusIcon = () => {
    if (isOneDriveConnected === null || isGoogleDriveConnected === null) {
      return <HelpCircle className="h-5 w-5 text-muted-foreground animate-pulse" />;
    }
    if (syncStatus === 'syncing') {
      return <Loader2 className="h-5 w-5 animate-spin" />;
    }
    if (conflicts.length > 0) {
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    }
    if (isAnyProviderConfigured()) {
      return <CloudCog className="h-5 w-5 text-green-600" />;
    }
    return <CloudOff className="h-5 w-5 text-muted-foreground" />;
  };

  const renderSyncStatusText = () => {
    if (isOneDriveConnected === null || isGoogleDriveConnected === null) {
      return "Checking cloud configuration...";
    }
    if (syncStatus === 'syncing') {
      return "Syncing in progress...";
    }
    if (conflicts.length > 0) {
      return `${conflicts.length} conflict(s) need resolution.`;
    }
    if (lastSyncTime) {
      const timeAgo = formatDateTime(lastSyncTime);
      return `Last sync: ${timeAgo}`;
    }
    if (isAnyProviderConfigured()) {
      return "Ready to sync.";
    }
    return "No cloud provider configured.";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {renderProviderStatusIcon()}
            Data Synchronization
          </CardTitle>
          <CardDescription>
            Manage data backup and synchronization with cloud services.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:space-x-3 p-3 bg-secondary/50 rounded-md">
                 <div className="min-w-0 flex-1"> 
                     <p className="text-sm font-medium">Sync Status</p>
                      {(isOneDriveConnected === null || isGoogleDriveConnected === null) ? (
                          <Skeleton className="h-4 w-48 mt-1" />
                      ) : (
                         <p className={cn(
                             "text-xs",
                              syncStatus === 'syncing' ? "text-blue-600 dark:text-blue-400" :
                              conflicts.length > 0 ? "text-orange-600 dark:text-orange-400" :
                              lastSyncTime && syncStatus === 'synced' ? "text-green-600 dark:text-green-400" :
                              "text-muted-foreground"
                         )}>
                            {renderSyncStatusText()}
                         </p>
                      )}
                 </div>
                 <Button
                    onClick={() => performSync()} 
                    disabled={syncStatus === 'syncing' || (isOneDriveConnected === null || isGoogleDriveConnected === null) || !isAnyProviderConfigured()}
                    size="sm"
                    className="flex-shrink-0 self-start sm:self-center whitespace-nowrap" 
                 >
                    <RefreshCwIcon className={cn("mr-2 h-4 w-4", syncStatus === 'syncing' && "animate-spin")} />
                    {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                  </Button>
           </div>

            {(isOneDriveConnected === false || isGoogleDriveConnected === false) && !(isOneDriveConnected === null || isGoogleDriveConnected === null) && (
                 <Card className="border-dashed border-accent">
                    <CardHeader>
                        <CardTitle className="text-base font-heading">Connect Cloud Storage</CardTitle>
                        <CardDescription>Connect your OneDrive or Google Drive account to enable data backup and sync.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4">
                         {isOneDriveConnected === false && (
                            <Button onClick={() => initiateAuthentication('onedrive')} variant="outline">
                                <Cloud className="mr-2 h-4 w-4"/> Connect OneDrive
                            </Button>
                         )}
                         {isGoogleDriveConnected === false && (
                             <Button onClick={() => initiateAuthentication('googledrive')} variant="outline">
                                 <Cloud className="mr-2 h-4 w-4"/> Connect Google Drive
                             </Button>
                         )}
                    </CardContent>
                 </Card>
            )}

            {isAnyProviderConfigured() && conflicts.length === 0 && syncStatus !== 'syncing' && syncStatus !== 'error' && syncStatus !== 'conflict' && (
                 <div className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                     <CloudCog className="h-4 w-4" />
                     Data is up-to-date with configured cloud providers.
                 </div>
            )}
             {syncStatus === 'error' && !isAnyProviderConfigured() && (isOneDriveConnected !== null && isGoogleDriveConnected !== null) && (
                <div className="text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Could not sync. Please configure a cloud provider.
                </div>
            )}


        </CardContent>
        <CardFooter>
              <p className="text-xs text-muted-foreground">Data attempts to sync automatically. Manual sync is also available.</p>
          </CardFooter>
        </Card>

      {conflicts.length > 0 && (
        <ConflictResolutionUI conflicts={conflicts} onResolve={resolveConflict} />
      )}
    </>
  );
};

export default SyncManager;
