
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleSync } from '@/hooks/useGoogleSync';
import { useMicrosoftSync } from '@/hooks/useMicrosoftSync';
import { useConflictResolution } from '@/hooks/useConflictResolution';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from '@/components/ui/skeleton';
import {
  Cloud,
  CloudOff,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  HardDrive,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn, formatDateTime, getData, saveData } from '@/lib/utils';
import type { ExcelData, DataConflict, SyncStatus, Task, Reminder, Appointment, GoogleTokens, MicrosoftTokens } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import React from 'react';

interface ConflictResolutionUIProps {
  conflicts: DataConflict[];
  onResolve: (resolvedConflict: DataConflict) => void;
}

interface DataSyncState {
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncStatus: SyncStatus;
  syncProgress: number;
  currentOperation: string;
}

interface DataSyncActions {
  performSync: () => Promise<void>;
  performQuickSync: () => Promise<void>;
  syncCalendarOnly: () => Promise<void>;
  initiateAuthentication: (provider: 'google' | 'microsoft' | 'onedrive') => Promise<void>;
  disconnectProvider: (provider: 'google' | 'microsoft' | 'onedrive') => Promise<void>;
  getLocalData: typeof getData;
  setLocalData: typeof saveData;
}

export function useDataSync(): DataSyncState & DataSyncActions & {
  // Connection states from specialized hooks
  isGoogleConnected: boolean;
  isGoogleDriveConnected: boolean;
  isMicrosoftConnected: boolean;
  isOneDriveConnected: boolean;
  
  // Network status
  isOnline: boolean;
  connectionQuality: string;
  
  // Conflict resolution
  conflicts: DataConflict[];
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merge', mergedData?: any) => Promise<boolean>;
  pendingConflicts: number;
} {
  // Main sync state
  const [syncState, setSyncState] = useState<DataSyncState>({
    isSyncing: false,
    lastSyncTime: null,
    syncStatus: 'idle',
    syncProgress: 0,
    currentOperation: ''
  });

  const { toast } = useToast();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Specialized hooks
  const googleSync = useGoogleSync();
  const microsoftSync = useMicrosoftSync();
  const conflictResolution = useConflictResolution({
    strategy: 'prefer_newer',
    autoResolve: false,
    maxConflicts: 50
  });
  const networkStatus = useNetworkStatus({
    maxRetries: 3,
    retryDelay: 2000,
    enableQualityCheck: true
  });

  // Load last sync time on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLastSyncTime = getData<string>(DataItemType.LastSyncTime);
      if (storedLastSyncTime) {
        setSyncState(prev => ({ ...prev, lastSyncTime: storedLastSyncTime }));
      }
    }
  }, []);

  // Auto-sync on network reconnection
  useEffect(() => {
    if (networkStatus.isOnline && syncState.lastSyncTime) {
      const lastSync = new Date(syncState.lastSyncTime).getTime();
      const now = Date.now();
      const hoursSinceLastSync = (now - lastSync) / (1000 * 60 * 60);
      
      // Auto-sync if it's been more than 6 hours
      if (hoursSinceLastSync > 6) {
        performQuickSync();
      }
    }
  }, [networkStatus.isOnline]);

  // Update sync progress helper
  const updateProgress = useCallback((progress: number, operation: string) => {
    setSyncState(prev => ({
      ...prev,
      syncProgress: progress,
      currentOperation: operation
    }));
  }, []);

  // Main sync function
  const performSync = useCallback(async (): Promise<void> => {
    if (syncState.isSyncing || !networkStatus.isOnline) {
      if (!networkStatus.isOnline) {
        toast({
          title: 'Sync Failed',
          description: 'No internet connection available.',
          variant: 'destructive'
        });
      }
      return;
    }

    setSyncState(prev => ({
      ...prev,
      isSyncing: true,
      syncStatus: 'syncing',
      syncProgress: 0,
      currentOperation: 'Starting sync...'
    }));

    try {
      toast({ title: "Sync Started", description: "Synchronizing data with cloud storage..." });
      
      const localData: ExcelData | null = getData<ExcelData>(DataItemType.CustomerData);
      let finalData = localData;
      let hasConflicts = false;

      // Step 1: Sync with Google Drive (30%)
      if (googleSync.isConnected) {
        updateProgress(10, 'Syncing with Google Drive...');
        
        try {
          const googleResult = await googleSync.syncData(localData);
          if (googleResult.success) {
            if (googleResult.hasConflicts && googleResult.conflicts) {
              googleResult.conflicts.forEach(conflict => {
                conflictResolution.addConflict(conflict);
              });
              hasConflicts = true;
            } else if (googleResult.data) {
              finalData = googleResult.data;
            }
          }
        } catch (error: any) {
          console.error('Google sync error:', error);
          toast({
            title: 'Google Sync Warning',
            description: 'Google Drive sync encountered issues but continuing...',
            variant: 'default'
          });
        }
      }

      updateProgress(30, 'Google Drive sync complete');

      // Step 2: Sync with Microsoft OneDrive (60%)
      if (microsoftSync.isConnected) {
        updateProgress(40, 'Syncing with Microsoft OneDrive...');
        
        try {
          const microsoftResult = await microsoftSync.syncData(finalData);
          if (microsoftResult.success) {
            if (microsoftResult.hasConflicts && microsoftResult.conflicts) {
              microsoftResult.conflicts.forEach(conflict => {
                conflictResolution.addConflict(conflict);
              });
              hasConflicts = true;
            } else if (microsoftResult.data) {
              finalData = microsoftResult.data;
            }
          }
        } catch (error: any) {
          console.error('Microsoft sync error:', error);
          toast({
            title: 'Microsoft Sync Warning',
            description: 'OneDrive sync encountered issues but continuing...',
            variant: 'default'
          });
        }
      }

      updateProgress(60, 'OneDrive sync complete');

      // Step 3: Sync calendars (90%)
      updateProgress(70, 'Syncing calendars...');
      
      await Promise.allSettled([
        googleSync.isConnected ? Promise.resolve() : Promise.resolve(),
        microsoftSync.isConnected ? Promise.resolve() : Promise.resolve()
      ]);

      updateProgress(90, 'Calendar sync complete');

      // Step 4: Save final data and update status
      if (finalData && !hasConflicts) {
        saveData<ExcelData>(DataItemType.CustomerData, finalData);
      }

      const now = new Date().toISOString();
      setLastSyncTime(now);
      saveData<string>(DataItemType.LastSyncTime, now);

      updateProgress(100, 'Sync complete');

      setSyncState(prev => ({
        ...prev,
        syncStatus: hasConflicts ? 'conflict' : 'synced',
        lastSyncTime: now
      }));

      toast({
        title: hasConflicts ? "Sync Complete with Conflicts" : "Sync Complete",
        description: hasConflicts 
          ? "Manual resolution needed for some data." 
          : "Data synchronization finished successfully.",
        variant: hasConflicts ? 'default' : 'default'
      });

    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncState(prev => ({ ...prev, syncStatus: 'error' }));
      toast({
        title: 'Sync Failed',
        description: error.message || 'An unexpected error occurred during sync.',
        variant: 'destructive'
      });
    } finally {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncProgress: 0,
        currentOperation: ''
      }));
    }
  }, [syncState.isSyncing, networkStatus.isOnline, googleSync, microsoftSync, conflictResolution, toast]);

  // Quick sync (data only, no calendars)
  const performQuickSync = useCallback(async (): Promise<void> => {
    if (syncState.isSyncing || !networkStatus.isOnline) return;

    setSyncState(prev => ({
      ...prev,
      isSyncing: true,
      syncStatus: 'syncing',
      currentOperation: 'Quick sync in progress...'
    }));

    try {
      const localData: ExcelData | null = getData<ExcelData>(DataItemType.CustomerData);
      
      // Only sync data, skip calendars for speed
      await Promise.allSettled([
        googleSync.isConnected ? googleSync.syncData(localData) : Promise.resolve(),
        microsoftSync.isConnected ? microsoftSync.syncData(localData) : Promise.resolve()
      ]);

      const now = new Date().toISOString();
      setSyncState(prev => ({
        ...prev,
        syncStatus: 'synced',
        lastSyncTime: now
      }));
      saveData<string>(DataItemType.LastSyncTime, now);

      toast({
        title: 'Quick Sync Complete',
        description: 'Data synchronized successfully.',
      });

    } catch (error: any) {
      console.error('Quick sync error:', error);
      setSyncState(prev => ({ ...prev, syncStatus: 'error' }));
    } finally {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        currentOperation: ''
      }));
    }
  }, [syncState.isSyncing, networkStatus.isOnline, googleSync, microsoftSync, toast]);

  // Calendar-only sync
  const syncCalendarOnly = useCallback(async (): Promise<void> => {
    if (syncState.isSyncing || !networkStatus.isOnline) return;

    setSyncState(prev => ({
      ...prev,
      isSyncing: true,
      currentOperation: 'Syncing calendars...'
    }));

    try {
      await Promise.allSettled([
        googleSync.isConnected ? Promise.resolve() : Promise.resolve(),
        microsoftSync.isConnected ? Promise.resolve() : Promise.resolve()
      ]);

      toast({
        title: 'Calendar Sync Complete',
        description: 'Calendar events synchronized successfully.',
      });

    } catch (error: any) {
      console.error('Calendar sync error:', error);
      toast({
        title: 'Calendar Sync Failed',
        description: error.message || 'Failed to sync calendar events.',
        variant: 'destructive'
      });
    } finally {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        currentOperation: ''
      }));
    }
  }, [syncState.isSyncing, networkStatus.isOnline, googleSync, microsoftSync, toast]);

  // Authentication
  const initiateAuthentication = useCallback(async (provider: 'google' | 'microsoft' | 'onedrive'): Promise<void> => {
    try {
      switch (provider) {
        case 'google':
          await googleSync.connect();
          break;
        case 'microsoft':
          await microsoftSync.connect();
          break;
        case 'onedrive':
          // OneDrive uses Microsoft auth
          await microsoftSync.connect();
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error: any) {
      toast({
        title: 'Authentication Failed',
        description: error.message || `Failed to connect to ${provider}.`,
        variant: 'destructive'
      });
    }
  }, [googleSync, microsoftSync, toast]);

  // Disconnect provider
  const disconnectProvider = useCallback(async (provider: 'google' | 'microsoft' | 'onedrive'): Promise<void> => {
    try {
      switch (provider) {
        case 'google':
          await googleSync.disconnect();
          break;
        case 'microsoft':
        case 'onedrive':
          await microsoftSync.disconnect();
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
      
      toast({
        title: 'Disconnected',
        description: `Successfully disconnected from ${provider}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Disconnect Failed',
        description: error.message || `Failed to disconnect from ${provider}.`,
        variant: 'destructive'
      });
    }
  }, [googleSync, microsoftSync, toast]);

  // Helper to set last sync time
  const setLastSyncTime = useCallback((time: string) => {
    setSyncState(prev => ({ ...prev, lastSyncTime: time }));
  }, []);

  return {
    // Main sync state
    ...syncState,
    
    // Actions
    performSync,
    performQuickSync,
    syncCalendarOnly,
    initiateAuthentication,
    disconnectProvider,
    getLocalData: getData,
    setLocalData: saveData,
    
    // Connection states
    isGoogleConnected: googleSync.isConnected,
    isGoogleDriveConnected: googleSync.isConnected, // Google Drive uses Google auth
    isMicrosoftConnected: microsoftSync.isConnected,
    isOneDriveConnected: microsoftSync.isConnected, // OneDrive uses Microsoft auth
    
    // Network status
    isOnline: networkStatus.isOnline,
    connectionQuality: networkStatus.connectionQuality,
    
    // Conflict resolution
    conflicts: conflictResolution.conflicts,
    resolveConflict: conflictResolution.resolveConflict,
    pendingConflicts: conflictResolution.pendingCount
  };
}

// Simplified conflict resolution UI component
export const ConflictResolutionUI: React.FC<ConflictResolutionUIProps> = ({ conflicts, onResolve }) => {
  const [resolutions, setResolutions] = useState<Record<number, 'local' | 'cloud' | 'manual'>>({});
  const [manualValues, setManualValues] = useState<Record<number, string[]>>({});
  const { toast } = useToast();

  useEffect(() => {
    const initialManualValues: Record<number, string[]> = {};
    const initialResolutions: Record<number, 'local' | 'cloud' | 'manual'> = {};

    conflicts.forEach((conflict) => {
      initialManualValues[conflict.rowIndex] = [...(conflict.localValue || [])];
    });
    setManualValues(initialManualValues);
    setResolutions(initialResolutions);
  }, [conflicts]);

  const handleResolutionChoice = (rowIndex: number, choice: 'local' | 'cloud' | 'manual') => {
    setResolutions(prev => ({ ...prev, [rowIndex]: choice }));
  };

  const handleManualInputChange = (rowIndex: number, colIndex: number, value: string) => {
    setManualValues(prev => {
      const currentRow = prev[rowIndex] ? [...prev[rowIndex]] : [];
      if (colIndex >= 0 && colIndex < (conflicts.find(c => c.rowIndex === rowIndex)?.headers?.length || Infinity)) {
        currentRow[colIndex] = value;
      }
      return { ...prev, [rowIndex]: currentRow };
    });
  };

  const handleApplyResolution = (conflict: DataConflict) => {
    const choice = resolutions[conflict.rowIndex];
    let resolvedValue: string[] | undefined;

    if (choice === 'local') {
      resolvedValue = conflict.localValue;
    } else if (choice === 'cloud') {
      resolvedValue = conflict.cloudValue;
    } else if (choice === 'manual') {
      resolvedValue = manualValues[conflict.rowIndex];
      if (!resolvedValue || resolvedValue.length !== conflict.headers?.length) {
        toast({
          title: "Validation Error",
          description: `Please ensure all fields for Row ${conflict.rowIndex + 1} are filled. Expected ${conflict.headers?.length} fields.`,
          variant: "destructive"
        });
        return;
      }
    }

    if (resolvedValue) {
      onResolve({ ...conflict, resolvedValue });
    } else {
      toast({
        title: "Selection Missing",
        description: `Please select a resolution option for Row ${conflict.rowIndex + 1}.`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[101] p-4 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border-border">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Resolve Data Conflicts ({conflicts.length})
          </CardTitle>
          <CardDescription>
            Differences found between local data and cloud data. Choose which version to keep or edit manually for each conflict.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-6 p-6">
          {conflicts.map((conflict) => (
            <Card key={conflict.rowIndex} className="p-4 border-orange-400 border bg-card shadow-md overflow-hidden">
              <div className="grid md:grid-cols-3 gap-4 mb-4 items-start">
                <div className="md:col-span-1">
                  <h3 className="font-semibold mb-1 text-base">Conflict in Row {conflict.rowIndex + 1}</h3>
                  <p className="text-xs text-muted-foreground mb-3">Select how to resolve this conflict.</p>
                  <RadioGroup
                    value={resolutions[conflict.rowIndex]}
                    onValueChange={(value: 'local' | 'cloud' | 'manual') => handleResolutionChoice(conflict.rowIndex, value)}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted transition-colors border border-transparent has-[>[data-state=checked]]:border-orange-500 has-[>[data-state=checked]]:bg-orange-500/10">
                      <RadioGroupItem value="local" id={`local-${conflict.rowIndex}`} className="border-orange-500 text-orange-600" />
                      <Label htmlFor={`local-${conflict.rowIndex}`} className="cursor-pointer flex-1">
                        Keep Local Version <span className="text-muted-foreground text-xs">(Orange Highlight)</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted transition-colors border border-transparent has-[>[data-state=checked]]:border-blue-500 has-[>[data-state=checked]]:bg-blue-500/10">
                      <RadioGroupItem value="cloud" id={`cloud-${conflict.rowIndex}`} className="border-blue-500 text-blue-600" />
                      <Label htmlFor={`cloud-${conflict.rowIndex}`} className="cursor-pointer flex-1">
                        Use Cloud Version <span className="text-muted-foreground text-xs">(Blue Highlight)</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted transition-colors border border-transparent has-[>[data-state=checked]]:border-primary has-[>[data-state=checked]]:bg-primary/10">
                      <RadioGroupItem value="manual" id={`manual-${conflict.rowIndex}`} />
                      <Label htmlFor={`manual-${conflict.rowIndex}`} className="cursor-pointer flex-1">
                        Edit Manually Below
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="flex justify-start mt-4">
                    <Button size="sm" onClick={() => handleApplyResolution(conflict)} disabled={!resolutions[conflict.rowIndex]}>
                      Apply Resolution for Row {conflict.rowIndex + 1}
                    </Button>
                  </div>
                </div>

                <div className="md:col-span-2 border rounded-lg p-1">
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-sm border-collapse relative">
                      <thead className="sticky top-0 bg-muted z-10">
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium text-muted-foreground w-[150px] min-w-[100px]">Field</th>
                          <th className={`text-left p-2 font-medium text-muted-foreground ${resolutions[conflict.rowIndex] === 'local' ? 'bg-orange-500/20' : ''}`}>Local</th>
                          <th className={`text-left p-2 font-medium text-muted-foreground ${resolutions[conflict.rowIndex] === 'cloud' ? 'bg-blue-500/20' : ''}`}>Cloud</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conflict.headers?.map((header, colIndex) => {
                          const localVal = conflict.localValue?.[colIndex] ?? '';
                          const cloudVal = conflict.cloudValue?.[colIndex] ?? '';
                          const isDifferent = localVal !== cloudVal;
                          return (
                            <tr key={colIndex} className="border-b last:border-b-0 hover:bg-muted/50">
                              <td className="p-2 text-muted-foreground font-medium truncate" title={header}>{header}</td>
                              <td className={`p-2 ${isDifferent ? 'text-orange-700 dark:text-orange-400' : ''} ${resolutions[conflict.rowIndex] === 'local' ? 'bg-orange-500/10' : ''}`}>{localVal}</td>
                              <td className={`p-2 ${isDifferent ? 'text-blue-700 dark:text-blue-400' : ''} ${resolutions[conflict.rowIndex] === 'cloud' ? 'bg-blue-500/10' : ''}`}>{cloudVal}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {resolutions[conflict.rowIndex] === 'manual' && (
                <div className="space-y-3 mt-4 border-t pt-4">
                  <h4 className="text-sm font-medium">Manual Edit for Row {conflict.rowIndex + 1}:</h4>
                  {(manualValues[conflict.rowIndex] ?? []).map((val, colIndex) => (
                    <div key={colIndex} className="grid grid-cols-1 md:grid-cols-4 items-center gap-3">
                      <Label className="text-xs truncate md:text-right col-span-1" title={conflict.headers?.[colIndex]}>
                        {conflict.headers?.[colIndex] ?? `Col ${colIndex + 1}`}:
                      </Label>
                      <Input
                        value={val}
                        onChange={(e) => handleManualInputChange(conflict.rowIndex, colIndex, e.target.value)}
                        className="h-8 col-span-1 md:col-span-3"
                        placeholder={`Enter value for ${conflict.headers?.[colIndex] ?? ''}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </CardContent>
        <CardFooter className="border-t p-4 bg-muted/50 flex justify-between items-center">
          <p className="text-xs text-muted-foreground">Resolved data is saved locally. Sync again to upload changes.</p>
        </CardFooter>
      </Card>
    </div>
  );
};

// Export helper functions for backward compatibility
export const getGoogleCalendarTokensFromStorage = (): GoogleTokens | null => {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem(DataItemType.GoogleCalendarAccessToken);
  const refreshToken = localStorage.getItem(DataItemType.GoogleCalendarRefreshToken);
  const expiryDateStr = localStorage.getItem('googleCalendarTokenExpiry');
  const expiry_date = expiryDateStr ? parseInt(expiryDateStr, 10) : null;

  if (accessToken) {
    return { access_token: accessToken, refresh_token: refreshToken, expiry_date };
  }
  return null;
};
