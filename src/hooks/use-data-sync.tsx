
// src/hooks/use-data-sync.tsx

import { useState, useEffect, useCallback } from 'react';
import { uploadToOneDrive, downloadFromOneDrive, fetchOneDriveFileMetadata } from '@/services/onedrive'; // Added fetchOneDriveFileMetadata
import { uploadToGoogleDrive, downloadFromGoogleDrive, fetchFileMetadata as fetchGoogleDriveFileMetadata } from '@/services/google-drive';
import { 
  generateGoogleAuthUrl, 
  createCalendarEvent as apiCreateCalendarEvent,
  updateCalendarEvent as apiUpdateCalendarEvent,
  deleteCalendarEvent as apiDeleteCalendarEvent, // Added for completeness if needed
  listCalendarEvents as apiListCalendarEvents, 
} from '@/services/google-calendar';
import type { ExcelData, CloudAuthInfo, DataConflict, SyncStatus, Task, Reminder, Appointment, GoogleTokens, FileMetadata, Contact } from '@/lib/types'; 
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
  // States to track connection status for UI updates
  const [isOneDriveConnectedInternal, setIsOneDriveConnectedInternal] = useState<boolean | null>(null);
  const [isGoogleDriveConnectedInternal, setIsGoogleDriveConnectedInternal] = useState<boolean | null>(null);


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
    setIsGoogleDriveConnectedInternal(!!tokens.access_token); // Update internal state
  };

  const clearGoogleTokens = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DataItemType.GoogleDriveAccessToken);
      localStorage.removeItem(DataItemType.GoogleDriveRefreshToken);
      localStorage.removeItem('googleDriveTokenExpiry');
      setIsGoogleDriveConnectedInternal(false); // Update internal state
    }
  };

  // Check connection status on mount and when specific local storage items change (though storage event listener is more robust for cross-tab)
  useEffect(() => {
    if (typeof window !== 'undefined') {
        setIsOneDriveConnectedInternal(!!localStorage.getItem(DataItemType.OneDriveAccessToken));
        setIsGoogleDriveConnectedInternal(!!localStorage.getItem(DataItemType.GoogleDriveAccessToken));
    }
  }, []);


  const performSync = useCallback(async () => {
    if (isSyncing) return;
    setSyncStatus('syncing');
    setIsSyncing(true);
    setConflicts([]);
    toast({ title: "Sync Started", description: "Synchronizing data with cloud storage..." });

    const localCustomerData: ExcelData | null = getData<ExcelData>(DataItemType.CustomerData);
    let isAnyLocalDataPresent = !!localCustomerData;
    
    let encounteredConflicts: DataConflict[] = [];
    let mergedData: ExcelData | null = localCustomerData ? { headers: [...localCustomerData.headers], rows: [...localCustomerData.rows] } : null;

    // --- Google Drive File Sync ---
    let googleTokens = getGoogleTokensFromStorage();
    if (googleTokens && googleTokens.access_token) {
      setIsGoogleDriveConnectedInternal(true);
      try {
        toast({ title: "Google Drive Syncing...", description: "Fetching remote data..." });
        const { data: cloudData, newTokens: gDriveRefreshedTokens } = await downloadFromGoogleDrive(googleTokens);
        if (gDriveRefreshedTokens) {
          storeGoogleTokens(gDriveRefreshedTokens);
          googleTokens = gDriveRefreshedTokens; // Use refreshed tokens for subsequent operations in this sync cycle
        }
        
        if (cloudData && localCustomerData) {
          if (JSON.stringify(localCustomerData) !== JSON.stringify(cloudData)) {
              console.warn("Simplified conflict: Local and Google Drive data differ. For now, local data is preferred.");
              mergedData = localCustomerData; 
          } else {
            mergedData = localCustomerData; 
          }
        } else if (cloudData && !localCustomerData) {
          mergedData = cloudData; 
        }

        if (mergedData && encounteredConflicts.length === 0 && isAnyLocalDataPresent) { // Only upload if data exists and no critical errors
          toast({ title: "Google Drive Syncing...", description: "Uploading data..." });
          const { success, newTokens: gDriveUploadRefreshedTokens } = await uploadToGoogleDrive(mergedData, googleTokens); // Use potentially refreshed tokens
          if (gDriveUploadRefreshedTokens) storeGoogleTokens(gDriveUploadRefreshedTokens);
          if (success) toast({ title: "Google Drive Synced", description: "Customer data backed up to Google Drive." });
        } else if (!isAnyLocalDataPresent && cloudData) {
           saveData<ExcelData>(DataItemType.CustomerData, cloudData); // Save cloud data locally if no local data
           toast({ title: "Google Drive Synced", description: "Data downloaded from Google Drive."});
        }

      } catch (error: any) {
        console.error(`Error syncing with Google Drive:`, error);
        const statusCode = error.statusCode || error.response?.status;
        toast({ title: `Google Drive Sync Error`, description: error.message, variant: "destructive" });
        if (error.message.toLowerCase().includes('authentication') || 
            error.message.toLowerCase().includes('invalid_grant') || 
            statusCode === 401 || statusCode === 403) {
          clearGoogleTokens();
          toast({ title: "Google Authentication Invalid", description: "Your Google session is invalid. Please re-connect Google Drive.", variant: "warning" });
        }
      }
    } else {
      setIsGoogleDriveConnectedInternal(false);
    }


    // --- OneDrive File Sync ---
    const oneDriveAccessToken = typeof window !== 'undefined' ? localStorage.getItem(DataItemType.OneDriveAccessToken) : null;
    if (oneDriveAccessToken) {
        setIsOneDriveConnectedInternal(true);
        try {
            toast({ title: "OneDrive Syncing...", description: "Fetching remote data..." });
            const oneDriveAuth: CloudAuthInfo = { accessToken: oneDriveAccessToken, provider: 'onedrive' };
            const cloudData = await downloadFromOneDrive(oneDriveAuth);
            
            if (cloudData && localCustomerData) {
                 if (JSON.stringify(localCustomerData) !== JSON.stringify(cloudData)) {
                    console.warn("Simplified conflict: Local and OneDrive data differ. For now, local data is preferred.");
                    mergedData = localCustomerData; // Prefer local if already exists
                } else {
                    // Data is the same, no change to mergedData if it was already localCustomerData
                }
            } else if (cloudData && !localCustomerData && !mergedData) { // If no Google Drive data either, use OneDrive
                mergedData = cloudData;
            }
            
            if (mergedData && encounteredConflicts.length === 0 && isAnyLocalDataPresent) {
                 toast({ title: "OneDrive Syncing...", description: "Uploading data..." });
                 await uploadToOneDrive(mergedData, oneDriveAuth);
                 toast({ title: "OneDrive Synced", description: "Customer data backed up to OneDrive." });
            } else if (!isAnyLocalDataPresent && cloudData && !mergedData) { // No local, no GDrive, save OD data
                 saveData<ExcelData>(DataItemType.CustomerData, cloudData);
                 toast({ title: "OneDrive Synced", description: "Data downloaded from OneDrive."});
            }

        } catch (error: any) {
            console.error(`Error syncing with OneDrive:`, error);
            toast({ title: `OneDrive Sync Error`, description: error.message, variant: "destructive" });
             if (error.message.toLowerCase().includes('token') || error.message.toLowerCase().includes('authentication') || error.statusCode === 401 || error.statusCode === 403) {
                localStorage.removeItem(DataItemType.OneDriveAccessToken);
                setIsOneDriveConnectedInternal(false);
                toast({ title: "OneDrive Authentication Invalid", description: "Your OneDrive session is invalid. Please re-connect OneDrive.", variant: "warning" });
            }
        }
    } else {
        setIsOneDriveConnectedInternal(false);
    }
    
    if (mergedData && encounteredConflicts.length === 0 && (isAnyLocalDataPresent || mergedData !== localCustomerData)) {
        saveData<ExcelData>(DataItemType.CustomerData, mergedData); // Save the final merged data
    }

    // Sync Calendar Items
    if (isGoogleDriveConnectedInternal && googleTokens?.access_token) { // Check internal state which reflects current attempt
        await syncCalendar(false); // Pass false to indicate it's part of a larger sync
    }


    if (encounteredConflicts.length === 0) {
        const now = new Date();
        setLastSyncTime(now);
        saveData<string>(DataItemType.LastSyncTime, now.toISOString());
        setSyncStatus('synced');
        toast({ title: "Sync Complete", description: "Data synchronization finished." });
    } else {
        setConflicts(encounteredConflicts);
        setSyncStatus('conflict');
        toast({ title: "Sync Complete with Conflicts", description: "Manual resolution needed for some data.", variant: "default" });
    }

    setIsSyncing(false);
  }, [isSyncing, toast]);


  const syncCalendar = useCallback(async (showIndividualToasts = true) => {
    let googleTokens = getGoogleTokensFromStorage();
    if (!googleTokens || !googleTokens.access_token) {
      if (showIndividualToasts) {
        toast({ title: "Google Calendar Sync Failed", description: "Not authenticated with Google. Please link Google Calendar.", variant: "destructive"});
      }
      setIsGoogleDriveConnectedInternal(false);
      return;
    }
    setIsGoogleDriveConnectedInternal(true);

    if (showIndividualToasts) {
        toast({ title: "Syncing Calendar...", description: "Updating Google Calendar events." });
    }
    
    try {
        const localTasks: Task[] = getData<Task[]>(DataItemType.Tasks) || [];
        const localReminders: Reminder[] = getData<Reminder[]>(DataItemType.Reminders) || [];
        const localAppointments: Appointment[] = getData<Appointment[]>(DataItemType.Appointments) || [];

        const processItems = async <T extends { id: string, googleCalendarEventId?: string, title?: string }>(
            items: T[],
            itemType: 'task' | 'reminder' | 'appointment'
        ): Promise<{syncedItems: T[], newTokens?: GoogleTokens}> => {
            const syncedItemsAccumulator: T[] = [];
            let currentTokens = googleTokens!; // Assert non-null as checked above

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
                      currentTokens = result.newTokens; 
                    }
                    syncedItemsAccumulator.push({ ...item, googleCalendarEventId: result.event.id });
                } catch (error: any) {
                     console.error(`Error syncing ${itemType} ${item.id} with Google Calendar:`, error);
                     const statusCode = error.statusCode || error.response?.status;
                     if (showIndividualToasts) {
                        toast({ title: `Calendar Sync Error`, description: `Failed to sync ${itemType} "${item.title || item.id}": ${error.message}`, variant: "destructive"});
                     }
                     syncedItemsAccumulator.push(item); 
                     if (error.message.toLowerCase().includes('authentication') || error.message.toLowerCase().includes('invalid_grant') || statusCode === 401 || statusCode === 403) {
                        clearGoogleTokens();
                        if (showIndividualToasts) {
                             toast({ title: "Google Authentication Invalid", description: "Calendar sync failed. Please re-connect Google.", variant: "warning" });
                        }
                        throw error; 
                     }
                }
            }
            return {syncedItems: syncedItemsAccumulator, newTokens: currentTokens};
        };
        
        const taskResult = await processItems(localTasks, 'task');
        saveData<Task[]>(DataItemType.Tasks, taskResult.syncedItems);
        if(taskResult.newTokens) googleTokens = taskResult.newTokens;


        const reminderResult = await processItems(localReminders, 'reminder');
        saveData<Reminder[]>(DataItemType.Reminders, reminderResult.syncedItems);
        if(reminderResult.newTokens) googleTokens = reminderResult.newTokens;
        
        const appointmentResult = await processItems(localAppointments, 'appointment');
        saveData<Appointment[]>(DataItemType.Appointments, appointmentResult.syncedItems);
        if(appointmentResult.newTokens) googleTokens = appointmentResult.newTokens;


        if (showIndividualToasts) {
            toast({ title: "Calendar Synced", description: "Google Calendar events updated." });
        }
    } catch (error: any) {
        // This catch is for critical auth errors propagated from processItems
        console.error("Critical error during Google Calendar sync, likely auth failure:", error);
        // The toast for this type of failure is handled within processItems before re-throwing
    }
}, [toast]); // Removed storeGoogleTokens, clearGoogleTokens from deps as they are stable

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedLastSyncTimeString = getData<string>(DataItemType.LastSyncTime);
        if (storedLastSyncTimeString) {
            setLastSyncTime(new Date(storedLastSyncTimeString));
        }
    }
  }, []); 

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
          clearGoogleTokens(); // Clear old tokens before starting new auth
          const authUrl = await generateGoogleAuthUrl();
          window.location.href = authUrl; 
        } catch (error: any) {
          console.error("Error generating Google Auth URL:", error);
          toast({ title: "Google Auth Error", description: `Could not initiate Google authentication: ${error.message}`, variant: "destructive" });
        }
      } else if (provider === 'onedrive') {
        toast({ title: `Connecting ${provider}...`, description: "OneDrive OAuth flow not yet implemented." });
        // Placeholder:
        // const mockToken = `mock-onedrive-token-${Date.now()}`;
        // localStorage.setItem(DataItemType.OneDriveAccessToken, mockToken);
        // setIsOneDriveConnectedInternal(true);
        // toast({ title: `Connected to ${provider} (Mock)`, description: "Mock token stored." });
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
    isGoogleDriveConnected: isGoogleDriveConnectedInternal, // Expose internal state
    isOneDriveConnected: isOneDriveConnectedInternal,     // Expose internal state
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[101] p-4 backdrop-blur-sm"> {/* Increased z-index */}
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
