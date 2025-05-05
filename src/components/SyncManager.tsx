// src/components/SyncManager.tsx
'use client';

import { useState, useEffect } from 'react'; // Import useState and useEffect
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataSync, ConflictResolutionUI } from '@/hooks/use-data-sync.tsx';
import { cn } from '@/lib/utils';
import { Cloud, CloudCog, CloudOff, Loader2, RefreshCw, AlertTriangle, HelpCircle } from 'lucide-react'; // Added HelpCircle for loading state
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

const SyncManager = () => {
  const {
    isSyncing,
    conflicts,
    lastSyncTime,
    performSync,
    resolveConflict,
    initiateAuthentication,
  } = useDataSync();

  // State to track provider configuration, initialized to null (loading/unknown)
  const [isProviderConfigured, setIsProviderConfigured] = useState<boolean | null>(null);
  const [isOneDriveConnected, setIsOneDriveConnected] = useState<boolean | null>(null);
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState<boolean | null>(null);

  // Check configuration only on the client side after mount
  useEffect(() => {
    const oneDriveConfigured = !!localStorage.getItem('onedriveAccessToken');
    const googleDriveConfigured = !!localStorage.getItem('googledriveAccessToken');
    setIsOneDriveConnected(oneDriveConfigured);
    setIsGoogleDriveConnected(googleDriveConfigured);
    setIsProviderConfigured(oneDriveConfigured || googleDriveConfigured);
  }, []); // Empty dependency array ensures this runs once on mount

  const renderProviderStatusIcon = () => {
    if (isProviderConfigured === null) {
      // Loading state
      return <HelpCircle className="h-5 w-5 text-muted-foreground animate-pulse" />;
    }
    if (isSyncing) {
      return <Loader2 className="h-5 w-5 animate-spin" />;
    }
    if (conflicts.length > 0) {
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    }
    if (isProviderConfigured) {
      return <CloudCog className="h-5 w-5 text-green-600" />;
    }
    return <CloudOff className="h-5 w-5 text-muted-foreground" />;
  };

  const renderSyncStatusText = () => {
     if (isProviderConfigured === null) {
        return "Checking configuration...";
     }
     if (isSyncing) {
        return "Syncing in progress...";
     }
     if (conflicts.length > 0) {
        return `${conflicts.length} conflict(s) need resolution`;
     }
     if (lastSyncTime) {
        return `Last sync: ${formatDistanceToNow(lastSyncTime, { addSuffix: true })}`;
     }
     if (isProviderConfigured) {
        return "Ready to sync";
     }
     return "No cloud provider configured";
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {renderProviderStatusIcon()}
             Data Synchronization
           </CardTitle>
          <CardDescription>
            Manage data backup and synchronization with cloud services. Data attempts to sync daily automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                 <div>
                     <p className="text-sm font-medium">Sync Status</p>
                      {isProviderConfigured === null ? (
                          <Skeleton className="h-4 w-32 mt-1" />
                      ) : (
                         <p className={cn(
                             "text-xs",
                              isSyncing ? "text-blue-600" :
                              conflicts.length > 0 ? "text-orange-600" :
                              lastSyncTime ? "text-green-600" :
                              "text-muted-foreground"
                         )}>
                            {renderSyncStatusText()}
                         </p>
                      )}
                 </div>
                 <Button
                    onClick={performSync}
                    disabled={isSyncing || isProviderConfigured === null || !isProviderConfigured}
                    size="sm"
                 >
                    <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
           </div>

            {isProviderConfigured === false && ( // Only show if definitely not configured
                 <Card className="border-dashed border-accent">
                    <CardHeader>
                        <CardTitle className="text-base">Connect Cloud Storage</CardTitle>
                        <CardDescription>Connect your OneDrive or Google Drive account to enable backup and sync.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4">
                         {isOneDriveConnected === false && ( // Show only if not connected
                            <Button onClick={() => initiateAuthentication('onedrive')} variant="outline">
                                <Cloud className="mr-2 h-4 w-4"/> Connect OneDrive
                            </Button>
                         )}
                         {isGoogleDriveConnected === false && ( // Show only if not connected
                             <Button onClick={() => initiateAuthentication('googledrive')} variant="outline">
                                 <Cloud className="mr-2 h-4 w-4"/> Connect Google Drive
                             </Button>
                         )}
                    </CardContent>
                 </Card>
            )}

            {isProviderConfigured === true && conflicts.length === 0 && !isSyncing && ( // Show only if configured and no conflicts/syncing
                 <div className="text-sm text-green-700 flex items-center gap-2">
                     <CloudCog className="h-4 w-4" />
                     Data is up-to-date with configured cloud providers.
                 </div>
            )}

        </CardContent>
        {/* Optionally add a footer for more actions or logs */}
         {/* <CardFooter>
             <p className="text-xs text-muted-foreground">Automatic daily sync is enabled.</p>
         </CardFooter> */}
      </Card>

      {/* Render Conflict Resolution UI */}
      {conflicts.length > 0 && (
        <ConflictResolutionUI conflicts={conflicts} onResolve={resolveConflict} />
      )}
    </>
  );
};

export default SyncManager;
