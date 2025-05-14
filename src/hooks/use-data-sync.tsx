
// src/hooks/use-data-sync.tsx

import { useState, useEffect, useCallback } from 'react';
import { uploadToOneDrive, downloadFromOneDrive, fetchOneDriveFileMetadata } from '@/services/onedrive'; // Added fetchOneDriveFileMetadata
import { uploadToGoogleDrive, downloadFromGoogleDrive, fetchFileMetadata as fetchGoogleDriveFileMetadata } from '@/services/google-drive';
import { 
  generateGoogleAuthUrl, 
  createCalendarEvent as apiCreateCalendarEvent,
  updateCalendarEvent as apiUpdateCalendarEvent,
  // listCalendarEvents as apiListCalendarEvents, // Uncomment if needed
} from '@/services/google-calendar';
import type { ExcelData, CloudAuthInfo, DataConflict, SyncStatus, Task, Reminder, Appointment, GoogleTokens, FileMetadata } from '@/lib/types'; 
import { DataItemType } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDateTime, getData, saveData } from '@/lib/utils'; 

export function useDataSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const { toast } = useToast();

  const SYNC_INTERVAL = 24 * 60 * 60 * 1000; // Daily sync interval

  const getGoogleTokensFromStorage = (): GoogleTokens | null => {
    if (typeof window === 'undefined') return null;
    const accessToken = localStorage.getItem(DataItemType.GoogleDriveAccessToken);
    const refreshToken = localStorage.getItem(DataItemType.GoogleDriveRefreshToken);
    const expiryDateStr = localStorage.getItem('googleDriveTokenExpiry');
    const expiry_date = expiryDateStr ? parseInt(expiryDateStr, 10) : null;

    if (accessToken) {
      return { access_token: accessToken, refresh_token: refreshToken, expiry_date };
    }
    return null;
  };

  const storeGoogleTokens = (tokens: GoogleTokens) => {
    if (typeof window === 'undefined') return;
    if (tokens.access_token) {
      localStorage.setItem(DataItemType.GoogleDriveAccessToken, tokens.access_token);
    }
    if (tokens.refresh_token) {
      localStorage.setItem(DataItemType.GoogleDriveRefreshToken, tokens.refresh_token);
    }
    if (tokens.expiry_date) {
      localStorage.setItem('googleDriveTokenExpiry', tokens.expiry_date.toString());
    }
  };


  const performSync = useCallback(async () => {
    if (isSyncing) return;
    setSyncStatus('syncing');
    setIsSyncing(true);
    setConflicts([]);
    toast({ title: "Sync Started", description: "Synchronizing data with cloud storage..." });

    const localCustomerData: ExcelData | null = getData<ExcelData>(DataItemType.CustomerData);
    // Other local data items (tasks, reminders, appointments) are synced via syncCalendar

    let isAnyLocalDataPresent = !!localCustomerData;
    // Consider if other data types should gatekeep this general file sync
    // For now, focusing on CustomerData for file sync.

    if (!isAnyLocalDataPresent) {
        toast({ title: "Sync Skipped", description: "No local customer data found to sync via file backup.", variant: "default" });
        // Don't set error, as calendar sync might still proceed
    }
    
    let encounteredConflicts: DataConflict[] = [];
    let mergedData: ExcelData | null = localCustomerData ? { headers: [...localCustomerData.headers], rows: [...localCustomerData.rows] } : null;


    // Google Drive File Sync
    const googleTokens = getGoogleTokensFromStorage();
    if (googleTokens && googleTokens.access_token) {
      try {
        const { data: cloudData, newTokens: gDriveRefreshedTokens } = await downloadFromGoogleDrive(googleTokens);
        if (gDriveRefreshedTokens) storeGoogleTokens(gDriveRefreshedTokens);
        
        if (cloudData && localCustomerData) {
          // Basic conflict detection (simplified: if different, it's a conflict)
          // This is a placeholder for more sophisticated row-by-row comparison & merging logic
          if (JSON.stringify(localCustomerData) !== JSON.stringify(cloudData)) {
             // For simplicity, let's assume local wins or a very basic merge/conflict
             // A real scenario needs row-level diffing.
             // Here, we'll just push a generic conflict if they differ, for UI demonstration.
              const conflict: DataConflict = {
                  rowIndex: 0, // Placeholder, real diffing would identify specific rows
                  localValue: localCustomerData.rows[0] || [], // Example
                  cloudValue: cloudData.rows[0] || [], // Example
                  headers: localCustomerData.headers,
              };
              // encounteredConflicts.push(conflict); // Simplified conflict for demo
              console.warn("Simplified conflict: Local and Google Drive data differ. Manual review or more advanced merging needed.");
              // For now, if different, prefer local and re-upload.
              mergedData = localCustomerData; // Or apply merge logic
          } else {
            mergedData = localCustomerData; // They are the same
          }
        } else if (cloudData && !localCustomerData) {
          mergedData = cloudData; // No local data, use cloud data
        }
        // If localCustomerData exists and no cloudData, localCustomerData is already set in mergedData

        if (mergedData && encounteredConflicts.length === 0) { // Only upload if no conflicts from this provider
          const { success, newTokens: gDriveUploadRefreshedTokens } = await uploadToGoogleDrive(mergedData, gDriveRefreshedTokens || googleTokens);
          if (gDriveUploadRefreshedTokens) storeGoogleTokens(gDriveUploadRefreshedTokens);
          if (success) toast({ title: "Google Drive Synced", description: "Customer data backed up." });
        }

      } catch (error: any) {
        console.error(`Error syncing with Google Drive:`, error);
        toast({ title: `Google Drive Sync Error`, description: error.message, variant: "destructive" });
        if (error.message.includes('re-authenticate')) {
            localStorage.removeItem(DataItemType.GoogleDriveAccessToken);
            localStorage.removeItem(DataItemType.GoogleDriveRefreshToken);
        }
      }
    } else if (getData(DataItemType.GoogleDriveAccessToken)) { // Token key exists but couldn't parse to object
        console.warn("Google Drive configured but tokens issue, skipping sync.");
    }


    // OneDrive File Sync (similar structure to Google Drive)
    const oneDriveAccessToken = typeof window !== 'undefined' ? localStorage.getItem(DataItemType.OneDriveAccessToken) : null;
    if (oneDriveAccessToken) {
        try {
            const oneDriveAuth: CloudAuthInfo = { accessToken: oneDriveAccessToken, provider: 'onedrive' };
            const cloudData = await downloadFromOneDrive(oneDriveAuth);
            
            if (cloudData && localCustomerData) {
                 if (JSON.stringify(localCustomerData) !== JSON.stringify(cloudData)) {
                    console.warn("Simplified conflict: Local and OneDrive data differ. Manual review or more advanced merging needed.");
                    // Prefer local for now
                    mergedData = localCustomerData;
                } else {
                    mergedData = localCustomerData;
                }
            } else if (cloudData && !localCustomerData) {
                mergedData = cloudData;
            }

            if (mergedData && encounteredConflicts.length === 0) { // Only upload if no conflicts from this provider
                 await uploadToOneDrive(mergedData, oneDriveAuth);
                 toast({ title: "OneDrive Synced", description: "Customer data backed up." });
            }

        } catch (error: any) {
            console.error(`Error syncing with OneDrive:`, error);
            toast({ title: `OneDrive Sync Error`, description: error.message, variant: "destructive" });
             if (error.message.toLowerCase().includes('token') || error.message.toLowerCase().includes('authentication')) {
                localStorage.removeItem(DataItemType.OneDriveAccessToken);
                // localStorage.removeItem(DataItemType.OneDriveRefreshToken); // If you add refresh token for OneDrive
            }
        }
    }

    // Finalize sync status
    if (mergedData && encounteredConflicts.length === 0 && isAnyLocalDataPresent) { // Only save if there was data to sync and no conflicts
        saveData<ExcelData>(DataItemType.CustomerData, mergedData);
    }

    if (encounteredConflicts.length === 0) {
        const now = new Date();
        setLastSyncTime(now);
        saveData<string>(DataItemType.LastSyncTime, now.toISOString());
        setSyncStatus('synced');
        toast({ title: "File Sync Complete", description: "Customer data synchronization finished." });
    } else {
        setConflicts(encounteredConflicts);
        toast({ title: "File Sync Complete with Conflicts", description: "Manual resolution needed for some data.", variant: "default" });
        setSyncStatus('conflict');
    }

    setIsSyncing(false);
  }, [isSyncing, toast]);


  const syncCalendar = useCallback(async () => {
    const googleTokens = getGoogleTokensFromStorage();
    if (!googleTokens || !googleTokens.access_token) {
      toast({ title: "Google Calendar Sync Failed", description: "Not authenticated with Google. Please link Google Calendar.", variant: "destructive"});
      return;
    }

    toast({ title: "Syncing Calendar...", description: "Updating Google Calendar events." });
    let currentTokens = googleTokens;

    try {
        const localTasks: Task[] = getData<Task[]>(DataItemType.Tasks) || [];
        const localReminders: Reminder[] = getData<Reminder[]>(DataItemType.Reminders) || [];
        const localAppointments: Appointment[] = getData<Appointment[]>(DataItemType.Appointments) || [];

        const processItems = async <T extends { id: string, googleCalendarEventId?: string }>(
            items: T[],
            itemType: 'task' | 'reminder' | 'appointment'
        ): Promise<T[]> => {
            const syncedItems: T[] = [];
            for (const item of items) {
                try {
                    let result;
                    if (item.googleCalendarEventId) {
                        result = await apiUpdateCalendarEvent(item.googleCalendarEventId, item as any, itemType, currentTokens);
                    } else {
                        result = await apiCreateCalendarEvent(item as any, itemType, currentTokens);
                    }
                    if (result.newTokens) {
                      storeGoogleTokens(result.newTokens);
                      currentTokens = result.newTokens; // Use refreshed tokens for subsequent calls
                    }
                    syncedItems.push({ ...item, googleCalendarEventId: result.event.id });
                } catch (error: any) {
                     console.error(`Error syncing ${itemType} ${item.id} with Google Calendar:`, error);
                     toast({ title: `Calendar Sync Error`, description: `Failed to sync ${itemType} "${(item as any).title || item.id}": ${error.message}`, variant: "destructive"});
                     syncedItems.push(item); // Keep local item even if sync failed
                     if (error.message.includes('re-authenticate')) { // If auth error, stop further attempts
                        localStorage.removeItem(DataItemType.GoogleDriveAccessToken);
                        localStorage.removeItem(DataItemType.GoogleDriveRefreshToken);
                        throw error; // Propagate to stop sync
                     }
                }
            }
            return syncedItems;
        };
        
        const syncedTasks = await processItems(localTasks, 'task');
        saveData<Task[]>(DataItemType.Tasks, syncedTasks);

        const syncedReminders = await processItems(localReminders, 'reminder');
        saveData<Reminder[]>(DataItemType.Reminders, syncedReminders);
        
        const syncedAppointments = await processItems(localAppointments, 'appointment');
        saveData<Appointment[]>(DataItemType.Appointments, syncedAppointments);

        toast({ title: "Calendar Synced", description: "Google Calendar events updated." });
    } catch (error: any) {
        // This catch is for errors propagated from processItems, like auth failure
        console.error("Critical error during Google Calendar sync:", error);
        // Toast for this critical failure already handled or will be general
    }
}, [toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedLastSyncTimeString = getData<string>(DataItemType.LastSyncTime);
        if (storedLastSyncTimeString) {
            setLastSyncTime(new Date(storedLastSyncTimeString));
        }
        // Auto-sync on interval is disabled for now, to focus on manual OAuth flow
        // const intervalId = setInterval(() => {
        //     performSync();
        // }, SYNC_INTERVAL);
        // return () => clearInterval(intervalId);
    }
  }, [SYNC_INTERVAL]); // Removed performSync from deps to avoid re-triggering interval on its change

    const resolveConflict = useCallback((resolvedConflict: DataConflict) => {
        const conflictIndex = conflicts.findIndex(c => c.rowIndex === resolvedConflict.rowIndex);
        if (conflictIndex === -1 || !resolvedConflict.resolvedValue) return;

        let currentLocalData = getData<ExcelData>(DataItemType.CustomerData);
        if (!currentLocalData) {
            toast({ title: "Error", description: "Could not load local data to apply resolution.", variant: "destructive" });
            return;
        }

        if (resolvedConflict.rowIndex >= 0 && resolvedConflict.rowIndex < currentLocalData.rows.length) {
            currentLocalData.rows[resolvedConflict.rowIndex] = resolvedConflict.resolvedValue;
            saveData<ExcelData>(DataItemType.CustomerData, currentLocalData);

            setConflicts(prevConflicts => prevConflicts.filter((_, index) => index !== conflictIndex));

            toast({ title: "Conflict Resolved", description: `Row ${resolvedConflict.rowIndex + 1} updated locally.` });

            if (conflicts.length === 1) { 
                toast({ title: "All Conflicts Resolved", description: "Attempting to sync changes to the cloud..." });
                setTimeout(performSync, 500);
            }

        } else {
            console.error("Invalid row index for conflict resolution:", resolvedConflict.rowIndex);
            toast({ title: "Resolution Error", description: "Invalid row index.", variant: "destructive" });
        }
    }, [conflicts, toast, performSync]);

    const initiateAuthentication = async (provider: 'onedrive' | 'googledrive') => {
      if (provider === 'googledrive') {
        try {
          const authUrl = await generateGoogleAuthUrl();
          window.location.href = authUrl; // Redirect user to Google's OAuth consent screen
        } catch (error: any) {
          console.error("Error generating Google Auth URL:", error);
          toast({ title: "Google Auth Error", description: `Could not initiate Google authentication: ${error.message}`, variant: "destructive" });
        }
      } else if (provider === 'onedrive') {
        // Placeholder for OneDrive OAuth initiation
        toast({ title: `Connecting ${provider}...`, description: "OneDrive OAuth flow not yet implemented." });
        // In a real scenario:
        // const authUrl = await generateOneDriveAuthUrl(); // From onedrive.ts
        // window.location.href = authUrl;
        // For mock:
        // const mockToken = `mock-onedrive-token-${Date.now()}`;
        // localStorage.setItem(DataItemType.OneDriveAccessToken, mockToken);
        // toast({ title: `Connected to ${provider} (Mock)`, description: "Mock token stored." });
        // performSync(); // Or some other update mechanism
      }
    };


  return {
    isSyncing,
    conflicts,
    lastSyncTime,
    performSync,
    syncStatus,
    resolveConflict,
    initiateAuthentication,
    syncCalendar,
    getLocalData: getData, 
    setLocalData: saveData
  };
}
const ConflictResolutionUI = ({ conflicts, onResolve }: { conflicts: DataConflict[]; onResolve: (resolvedConflict: DataConflict) => void }) => {
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
                toast({title: "Validation Error", description: `Please ensure all fields for Row ${conflict.rowIndex + 1} are filled. Expected ${conflict.headers?.length} fields.`, variant: "destructive"});
                return;
             }
        }

        if (resolvedValue) {
            onResolve({ ...conflict, resolvedValue });
        } else {
             toast({ title: "Selection Missing", description: `Please select a resolution option for Row ${conflict.rowIndex + 1}.`, variant: "destructive" });
        }
    };


    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border-border">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                             <AlertTriangle className="h-5 w-5 text-orange-500" />
                             Resolve Data Conflicts ({conflicts.length})
                         </CardTitle>
                         <CardDescription>Differences found between local data and cloud data. Choose which version to keep or edit manually for each conflict.</CardDescription>
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
                                    <Label htmlFor={`local-${conflict.rowIndex}`} className="cursor-pointer flex-1">Keep Local Version <span className="text-muted-foreground text-xs">(Orange Highlight)</span></Label>
                                  </div>
                                  <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted transition-colors border border-transparent has-[>[data-state=checked]]:border-blue-500 has-[>[data-state=checked]]:bg-blue-500/10">
                                    <RadioGroupItem value="cloud" id={`cloud-${conflict.rowIndex}`} className="border-blue-500 text-blue-600" />
                                    <Label htmlFor={`cloud-${conflict.rowIndex}`} className="cursor-pointer flex-1">Use Cloud Version <span className="text-muted-foreground text-xs">(Blue Highlight)</span></Label>
                                  </div>
                                  <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted transition-colors border border-transparent has-[>[data-state=checked]]:border-primary has-[>[data-state=checked]]:bg-primary/10">
                                    <RadioGroupItem value="manual" id={`manual-${conflict.rowIndex}`} />
                                    <Label htmlFor={`manual-${conflict.rowIndex}`} className="cursor-pointer flex-1">Edit Manually Below</Label>
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
                                    <Label className="text-xs truncate md:text-right col-span-1" title={conflict.headers?.[colIndex]}>{conflict.headers?.[colIndex] ?? `Col ${colIndex + 1}`}:</Label>
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


export { ConflictResolutionUI };
