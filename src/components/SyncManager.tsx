'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataSync, ConflictResolutionUI } from '@/hooks/use-data-sync';
import { cn } from '@/lib/utils';
import { Cloud, CloudCog, CloudOff, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SyncManager = () => {
  const {
    isSyncing,
    conflicts,
    lastSyncTime,
    performSync,
    resolveConflict,
    initiateAuthentication, // Get the auth function
  } = useDataSync();

  // Check if providers are configured (example check)
  const isOneDriveConfigured = typeof window !== 'undefined' && !!localStorage.getItem('onedriveAccessToken');
  const isGoogleDriveConfigured = typeof window !== 'undefined' && !!localStorage.getItem('googledriveAccessToken');
  const isAnyProviderConfigured = isOneDriveConfigured || isGoogleDriveConfigured;


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
             {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> :
              conflicts.length > 0 ? <AlertTriangle className="h-5 w-5 text-orange-500" /> :
              isAnyProviderConfigured ? <CloudCog className="h-5 w-5 text-green-600" /> :
              <CloudOff className="h-5 w-5 text-muted-foreground" />
             }
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
                      <p className={cn(
                          "text-xs",
                          isSyncing ? "text-blue-600" :
                          conflicts.length > 0 ? "text-orange-600" :
                          lastSyncTime ? "text-green-600" :
                          "text-muted-foreground"
                      )}>
                          {isSyncing ? "Syncing in progress..." :
                           conflicts.length > 0 ? `${conflicts.length} conflict(s) need resolution` :
                           lastSyncTime ? `Last sync: ${formatDistanceToNow(lastSyncTime, { addSuffix: true })}` :
                           isAnyProviderConfigured ? "Ready to sync" : "No cloud provider configured"
                          }
                     </p>
                 </div>
                 <Button onClick={performSync} disabled={isSyncing || !isAnyProviderConfigured} size="sm">
                    <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
           </div>

            {!isAnyProviderConfigured && (
                 <Card className="border-dashed border-accent">
                    <CardHeader>
                        <CardTitle className="text-base">Connect Cloud Storage</CardTitle>
                        <CardDescription>Connect your OneDrive or Google Drive account to enable backup and sync.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-4">
                         {!isOneDriveConfigured && (
                            <Button onClick={() => initiateAuthentication('onedrive')} variant="outline">
                                <Cloud className="mr-2 h-4 w-4"/> Connect OneDrive
                            </Button>
                         )}
                         {!isGoogleDriveConfigured && (
                             <Button onClick={() => initiateAuthentication('googledrive')} variant="outline">
                                 <Cloud className="mr-2 h-4 w-4"/> Connect Google Drive
                             </Button>
                         )}
                    </CardContent>
                 </Card>
            )}

            {isAnyProviderConfigured && conflicts.length === 0 && !isSyncing && (
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
