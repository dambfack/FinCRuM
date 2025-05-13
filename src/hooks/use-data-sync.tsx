// src/hooks/use-data-sync.tsx

import { useState, useEffect, useCallback } from 'react';
import { uploadToOneDrive, downloadFromOneDrive } from '@/services/onedrive';
import { uploadToGoogleDrive, downloadFromGoogleDrive } from '@/services/google-drive';
import { getAuthInfo } from '@/services/auth';
import { createCalendarEvent, deleteCalendarEvent, listCalendarEvents, updateCalendarEvent } from "@/services/google-calendar";
import type { ExcelData, CloudAuthInfo, DataConflict, SyncStatus, Task, Reminder, Appointment } from '@/lib/types'; 
import { DataItemType } from '@/lib/types'; // Actual import of DataItemType
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

  const performSync = useCallback(async () => {
    if (isSyncing) return;
    setSyncStatus('syncing');
    setIsSyncing(true);
    setConflicts([]);
    toast({ title: "Sync Started", description: "Synchronizing data with cloud storage..." });

      const localCustomerData: ExcelData | null = getData<ExcelData>(DataItemType.CustomerData);
      const localTasks: Task[] | null = getData<Task[]>(DataItemType.Tasks);
      const localReminders: Reminder[] | null = getData<Reminder[]>(DataItemType.Reminders);
      const localAppointments: Appointment[] | null = getData<Appointment[]>(DataItemType.Appointments);

    if (!localCustomerData && !localTasks && !localReminders && !localAppointments) {
        toast({ title: "Sync Skipped", description: "No local data found to sync.", variant: "destructive" });
        setIsSyncing(false);
        setSyncStatus('error');
        return;
    }

    const configuredProviders: ('onedrive' | 'googledrive')[] = [];
    if (typeof window !== 'undefined') {
        if (localStorage.getItem(DataItemType.OneDriveAccessToken)) configuredProviders.push('onedrive');
        if (localStorage.getItem(DataItemType.GoogleDriveAccessToken)) configuredProviders.push('googledrive');
    }

    if(configuredProviders.length === 0) {
         toast({ title: "Sync Skipped", description: "No cloud storage provider configured.", variant: "destructive" });
         setIsSyncing(false);
         setSyncStatus('error');
         return;
    }

      let mergedData: ExcelData = localCustomerData ? { headers: localCustomerData.headers, rows: [...localCustomerData.rows] } : { headers: [], rows: []};
      let encounteredConflicts: DataConflict[] = [];

    for (const provider of configuredProviders) {
       try {
           const authInfo = await getAuthInfo(provider);
           if (!authInfo) {
               console.warn(`Skipping ${provider}: Not authenticated.`);
                toast({ title: `Skipping ${provider}`, description: `Authentication required. Please connect the provider.`, variant:"default" }); // Updated message
                 setSyncStatus('error');
                 if (typeof window !== 'undefined') {
                    localStorage.removeItem(provider === 'onedrive' ? DataItemType.OneDriveAccessToken : DataItemType.GoogleDriveAccessToken);
                 }
                continue;
            }

           const cloudDataRaw = await (provider === 'onedrive'
                ? downloadFromOneDrive(authInfo) : downloadFromGoogleDrive(authInfo));
             const cloudData = (cloudDataRaw && cloudDataRaw.headers && cloudDataRaw.rows) ? cloudDataRaw as ExcelData : null;

           if (!cloudData && localCustomerData) {
               const localDataToUpload = {
                   headers: localCustomerData.headers,
                   rows: localCustomerData.rows
               };
               // console.log(`No data found on ${provider}. Uploading local data.`); // Debug log
               await (provider === 'onedrive'
                   ? uploadToOneDrive(localDataToUpload, authInfo)
                   : uploadToGoogleDrive(localDataToUpload, authInfo));
               continue;
           } else if (cloudData) {
             const currentConflicts: DataConflict[] = [];
             let tempMergedRows: string[][] = [];

              if (localCustomerData && JSON.stringify(localCustomerData.headers) !== JSON.stringify(cloudData.headers)) {
                  console.error(`Header mismatch between local and ${provider} data. Aborting merge with this provider.`);
                  setSyncStatus('error');
                  toast({ title: "Sync Error", description: `Header mismatch with ${provider}. Manual data correction might be needed.`, variant: "destructive" });
                  continue;
              } else if (!localCustomerData) {
                mergedData = cloudData;
              } else {
                const localRowsMap = new Map(mergedData.rows.map(row => [row[0], row])); 
                const cloudRowsMap = new Map(cloudData.rows.map(row => [row[0], row])); 

               const allKeys = new Set([...localRowsMap.keys(), ...cloudRowsMap.keys()]);
               for (const key of allKeys) {
                   const localRow = localRowsMap.get(key) || null;
                    const cloudRow = cloudRowsMap.get(key) || null;

                  if (localRow && cloudRow) {
                       if (JSON.stringify(localRow) !== JSON.stringify(cloudRow)) {
                           currentConflicts.push({
                                rowIndex: tempMergedRows.length, 
                                localValue: localRow,
                                cloudValue: cloudRow,
                                headers: mergedData.headers
                           });
                             tempMergedRows.push(localRow); 
                        } else {
                            tempMergedRows.push(localRow);
                        }
                    } else if (localRow) {
                       tempMergedRows.push(localRow);
                   } else if (cloudRow) {
                        tempMergedRows.push(cloudRow);
                   }
               }
                mergedData = { headers: mergedData.headers, rows: tempMergedRows };
              }
             encounteredConflicts = [...encounteredConflicts, ...currentConflicts];

            if (mergedData && mergedData.rows) {
                for (let i = 0; i < mergedData.rows.length; i++) {
                    const row = mergedData.rows[i];
                    const contactIndex = mergedData.headers.indexOf('contact'); 
                    if (contactIndex > -1 && typeof row[contactIndex] === 'string') {
                        // Potentially parse or validate if needed
                    }
                }
            }

              if (currentConflicts.length === 0 && mergedData.rows.length > 0) {
                   // console.log(`Uploading merged data to ${provider}.`); // Debug log
                   await (provider === 'onedrive'
                      ? uploadToOneDrive(mergedData, authInfo)
                      : uploadToGoogleDrive(mergedData, authInfo));
              } else if (currentConflicts.length > 0) {
                   console.warn(`Conflicts detected with ${provider}. Manual resolution required before uploading changes for this provider.`);
              }
           }
       } catch (error: any) {
           console.error(`Error syncing with ${provider}:`, error);
           let toastMessage = `Failed to sync data with ${provider}.`;
           const errorMessageText = error.message ? error.message.toLowerCase() : "";

           if (errorMessageText.includes('status 401') || 
               errorMessageText.includes('status 403') ||
               errorMessageText.includes('unauthorized') ||
               errorMessageText.includes('authentication failed') ||
               errorMessageText.includes('invalid credentials') ||
               errorMessageText.includes('token')) {
              toastMessage = `Authentication error with ${provider}. Please reconnect. Details: ${error.message}`;
              setSyncStatus('error');
              if (typeof window !== 'undefined') {
                   localStorage.removeItem(provider === 'onedrive' ? DataItemType.OneDriveAccessToken : DataItemType.GoogleDriveAccessToken);
               }
           } else if (error instanceof Error) {
               toastMessage += ` ${error.message}`;
           }
           toast({ title: `Sync Error with ${provider}`, description: toastMessage, variant: "destructive" });
        }
    }
      
       if (mergedData && mergedData.rows) {
         mergedData.rows.forEach(row => {
             const contactIndex = mergedData.headers.indexOf('contact'); 
             if (contactIndex > -1 && typeof row[contactIndex] !== 'string' && row[contactIndex] !== null && row[contactIndex] !== undefined) {
                  row[contactIndex] = JSON.stringify(row[contactIndex]); 
              }
         });
       }

       if (encounteredConflicts.length === 0) {
           if (mergedData.rows.length > 0 || mergedData.headers.length > 0) {
             saveData<ExcelData>(DataItemType.CustomerData, mergedData);
           }
        const now = new Date();
        setLastSyncTime(now);
        saveData<string>(DataItemType.LastSyncTime, now.toISOString());
        setSyncStatus('synced');
        toast({ title: "Sync Complete", description: "Data synchronized successfully." });
    } else {
         setConflicts(encounteredConflicts);
         toast({ title: "Sync Complete with Conflicts", description: "Manual resolution needed for some data.", variant: "destructive" });
         setSyncStatus('conflict');
         // console.log("Conflicts detected:", encounteredConflicts); // Debug log
    }

       setIsSyncing(false);
  }, [isSyncing, toast]);


  const syncCalendar = useCallback(async () => {
    const authInfo = await getAuthInfo('googledrive'); 
    if (!authInfo) {
      toast({ title: "Google Calendar Sync Failed", description: "Not authenticated with Google.", variant: "destructive"});
      return;
    }

    toast({ title: "Syncing Calendar...", description: "Updating Google Calendar events." });

    try {
        const localTasks: Task[] = getData<Task[]>(DataItemType.Tasks) || [];
        const localReminders: Reminder[] = getData<Reminder[]>(DataItemType.Reminders) || [];
        const localAppointments: Appointment[] = getData<Appointment[]>(DataItemType.Appointments) || [];

        const syncedTasks: Task[] = [];
        for (const task of localTasks) {
            let eventType: 'task' | 'reminder' | 'appointment' = 'task';
            if (task.googleCalendarEventId) {
                await updateCalendarEvent(task.googleCalendarEventId, task, eventType);
                syncedTasks.push(task);
            } else {
                const googleEvent = await createCalendarEvent(task, eventType);
                if (googleEvent && googleEvent.id) {
                    syncedTasks.push({ ...task, googleCalendarEventId: googleEvent.id });
                } else {
                     syncedTasks.push(task);
                }
            }
        }
        saveData<Task[]>(DataItemType.Tasks, syncedTasks);

        const syncedReminders: Reminder[] = [];
         for (const reminder of localReminders) {
            let eventType: 'task' | 'reminder' | 'appointment' = 'reminder';
             if (reminder.googleCalendarEventId) {
                 await updateCalendarEvent(reminder.googleCalendarEventId, reminder, eventType);
                 syncedReminders.push(reminder);
             } else {
                 const googleEvent = await createCalendarEvent(reminder, eventType);
                 if (googleEvent && googleEvent.id) {
                    syncedReminders.push({ ...reminder, googleCalendarEventId: googleEvent.id });
                 } else {
                    syncedReminders.push(reminder);
                 }
             }
         }
         saveData<Reminder[]>(DataItemType.Reminders, syncedReminders);

         const syncedAppointments: Appointment[] = [];
         for (const appointment of localAppointments) {
            let eventType: 'task' | 'reminder' | 'appointment' = 'appointment';
             if (appointment.googleCalendarEventId) {
                 await updateCalendarEvent(appointment.googleCalendarEventId, appointment, eventType);
                 syncedAppointments.push(appointment);
             } else {
                 const googleEvent = await createCalendarEvent(appointment, eventType); 
                 if (googleEvent && googleEvent.id) {
                    syncedAppointments.push({ ...appointment, googleCalendarEventId: googleEvent.id });
                 } else {
                    syncedAppointments.push(appointment);
                 }
             }
         }
         saveData<Appointment[]>(DataItemType.Appointments, syncedAppointments);

        toast({ title: "Calendar Synced", description: "Google Calendar events updated." });
    } catch (error) {
        console.error("Error syncing with Google Calendar:", error);
        toast({ title: "Calendar Sync Error", description: `Failed to sync with Google Calendar. ${error instanceof Error ? error.message : ''}`, variant: "destructive"});
    }
}, [toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedLastSyncTimeString = getData<string>(DataItemType.LastSyncTime);
        if (storedLastSyncTimeString) {
            setLastSyncTime(new Date(storedLastSyncTimeString));
        }
        const intervalId = setInterval(() => {
            // console.log("Performing scheduled sync check..."); // Removed for production clarity
            performSync();
        }, SYNC_INTERVAL);
        return () => clearInterval(intervalId);
    }
  }, [performSync, SYNC_INTERVAL]);

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

    // TODO: Replace this mock authentication with a real OAuth flow for production.
    // This function currently simulates storing a token in localStorage.
    // For a production app, you would redirect the user to the provider's OAuth screen
    // and handle the callback to obtain and securely store the tokens.
    const initiateAuthentication = async (provider: 'onedrive' | 'googledrive') => {
        toast({ title: `Connecting ${provider}...`, description: "Attempting to authenticate (simulation)." });

        if (typeof window !== 'undefined') {
            const mockToken = `mock-${provider}-token-${Date.now()}`;
            const tokenKey = provider === 'onedrive' ? DataItemType.OneDriveAccessToken : DataItemType.GoogleDriveAccessToken;
            localStorage.setItem(tokenKey, mockToken); 
            toast({ title: `Connected to ${provider} (Mock)`, description: "Mock token stored. Sync will use this." });
            // Trigger state update in SyncManager or relevant components
             setTimeout(() => {
                // This is a bit of a hack; ideally, SyncManager would listen to localStorage changes or have a shared state.
                // For now, forcing a sync implies it will re-check auth.
                performSync();
                // A more direct way would be to pass a callback to update the SyncManager's internal state if possible,
                // or use a global state management solution (Context API, Zustand, Redux) for auth status.
             }, 500);
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
        // console.log("ConflictResolutionUI conflicts updated:", conflicts); // Debug log
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

