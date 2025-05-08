// src/hooks/use-data-sync.tsx

import { useState, useEffect, useCallback } from 'react';
import { uploadToOneDrive, downloadFromOneDrive } from '@/services/onedrive';
import { uploadToGoogleDrive, downloadFromGoogleDrive } from '@/services/google-drive';
import { createCalendarEvent, deleteCalendarEvent, listCalendarEvents, updateCalendarEvent } from "@/services/google-calendar";
import type { ExcelData, CloudAuthInfo, DataConflict, SyncStatus, Task, Reminder, Appointment } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from 'lucide-react'; // Added HelpCircle
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'; // Added Card Imports
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';

import React from 'react'; // Import React for JSX
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton


// Placeholder for authentication - replace with actual auth logic
const getAuthInfo = async (provider: 'onedrive' | 'googledrive'): Promise<CloudAuthInfo | null> => {
  // In a real app, this would involve OAuth flows
  console.warn(`Authentication for ${provider} is not implemented. Using localStorage tokens.`);
  // Simulating getting a token - DO NOT USE IN PRODUCTION
   if (typeof window !== 'undefined') {
       const storedToken = localStorage.getItem(`${provider}AccessToken`);
       if (storedToken) {
           return { accessToken: storedToken, provider };
        }
        return null; // Indicate no auth available
    }
   return null;
};

type LocalDataFn = <T>(key: string, data?: T) => T | null | void;

// Function to get local data from localStorage
const getLocalData = <T,>(key: string): T | null => {
   if (typeof window !== 'undefined') {
       const storedData = localStorage.getItem(key);
        try {
           return storedData ? JSON.parse(storedData) : null;
       } catch (e) {
           console.error(`Failed to parse local data for ${key}:`, e);
           return null;
       }
   }
   return null;
};
const setLocalData: LocalDataFn = <T,>(key: string, data: T) => {
    if (typeof window !== 'undefined') {
       try {
            localStorage.setItem(key, JSON.stringify(data));
       } catch (e) {
            console.error(`Failed to save local data for ${key}:`, e);
       }
   }
};

export function useDataSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const { toast } = useToast();

    // PRODUCTION NOTE: This interval runs only when the user has the app open in their browser.
    // For reliable background sync independent of user sessions, consider using serverless functions
    // (e.g., Vercel Cron Jobs, Firebase Cloud Functions scheduled tasks) triggered on a schedule.
    const SYNC_INTERVAL = 24 * 60 * 60 * 1000; // Daily sync interval

    // Function to perform the sync
  const performSync = useCallback(async () => {
    if (isSyncing) return;
    setSyncStatus('syncing');
    setIsSyncing(true);
    setConflicts([]); // Clear old conflicts
    toast({ title: "Sync Started", description: "Synchronizing data with cloud storage..." });

      const localCustomerData: ExcelData | null = getLocalData<ExcelData>('customerData');
      const localTasks: Task[] | null = getLocalData<Task[]>('tasks');
      const localReminders: Reminder[] | null = getLocalData<Reminder[]>('reminders');
      const localAppointments: Appointment[] | null = getLocalData<Appointment[]>('appointments');

    if (!localCustomerData && !localTasks && !localReminders && !localAppointments) {
        toast({ title: "Sync Skipped", description: "No local data found to sync.", variant: "destructive" });
        setIsSyncing(false);
        setSyncStatus('error');
        return;
    }


  // --- Determine which providers are configured (Example: Check localStorage for tokens) ---
    const configuredProviders: ('onedrive' | 'googledrive')[] = [];
    if (typeof window !== 'undefined') {
        if (localStorage.getItem('onedriveAccessToken')) configuredProviders.push('onedrive');
        if (localStorage.getItem('googledriveAccessToken')) configuredProviders.push('googledrive');
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
                toast({ title: `Skipping ${provider}`, description: `Authentication required.`, variant:"default" });
                 setSyncStatus('error');
                // Attempt to remove invalid token if auth failed (e.g., token expired)
                 if (typeof window !== 'undefined') {
                    localStorage.removeItem(`${provider}AccessToken`);
                 }
                continue; // Skip if not authenticated
            }

            // 1. Download data from the cloud provider
            // PRODUCTION NOTE: Add robust error handling for API calls (network errors, auth errors, rate limits)
           const cloudDataRaw = await (provider === 'onedrive'
                ? downloadFromOneDrive(authInfo) : downloadFromGoogleDrive(authInfo));
             const cloudData = (cloudDataRaw && cloudDataRaw.headers && cloudDataRaw.rows) ? cloudDataRaw as ExcelData : null;


           if (!cloudData && localCustomerData) { // Only upload if localCustomerData exists
               // If no cloud data exists, upload local data
               const localDataToUpload = {
                   headers: localCustomerData.headers,
                   rows: localCustomerData.rows
               };

               console.log(`No data found on ${provider}. Uploading local data.`);
               // PRODUCTION NOTE: Handle potential upload errors gracefully.
               await (provider === 'onedrive'
                   ? uploadToOneDrive(localDataToUpload, authInfo)
                   : uploadToGoogleDrive(localDataToUpload, authInfo));
               continue; // Move to next provider
           } else if (cloudData) {
             // 2. Compare and Merge (Simplified Example: Row-by-row comparison based on a key, e.g., first column)
            // Consider using a dedicated library or a more sophisticated diffing/merging strategy,
            // potentially based on timestamps or versioning if the cloud storage supports it.
             const currentConflicts: DataConflict[] = [];
             let tempMergedRows: string[][] = [];

              // Check header consistency (basic check)
              if (localCustomerData && JSON.stringify(localCustomerData.headers) !== JSON.stringify(cloudData.headers)) {
                  console.error(`Header mismatch between local and ${provider} data. Aborting merge with this provider.`);
                  setSyncStatus('error');
                  toast({ title: "Sync Error", description: `Header mismatch with ${provider}. Manual data correction might be needed.`, variant: "destructive" });
                  continue; // Skip this provider due to header mismatch
              } else if (!localCustomerData) {
                // If no local customer data, cloud data becomes the merged data
                mergedData = cloudData;
              } else {
                // Create a map of row keys to rows for efficient lookup
                const localRowsMap = new Map(mergedData.rows.map(row => [row[0], row])); // Assuming first column as key
                const cloudRowsMap = new Map(cloudData.rows.map(row => [row[0], row])); // Assuming first column as key

               // Iterate through all unique keys and resolve
               const allKeys = new Set([...localRowsMap.keys(), ...cloudRowsMap.keys()]);
               for (const key of allKeys) {
                   const localRow = localRowsMap.get(key) || null;
                    const cloudRow = cloudRowsMap.get(key) || null;

                  if (localRow && cloudRow) {
                       // Existing in both
                       if (JSON.stringify(localRow) !== JSON.stringify(cloudRow)) {
                           currentConflicts.push({
                                rowIndex: tempMergedRows.length, // Current index in the new data
                                localValue: localRow,
                                cloudValue: cloudRow,
                                headers: mergedData.headers // Pass headers for context
                           });
                            // For now, keep local value during conflict detection (manual resolution UI will decide final state)
                             tempMergedRows.push(localRow);
                        } else {
                            // Rows are identical
                            tempMergedRows.push(localRow);
                        }
                    } else if (localRow) {
                       // Exists locally, not in cloud (add to merged)
                       tempMergedRows.push(localRow);
                   } else if (cloudRow) {
                       // Exists in cloud, not locally (add to merged)
                        tempMergedRows.push(cloudRow);
                   }
               }

                mergedData = { headers: mergedData.headers, rows: tempMergedRows }; // Update merged data with results from this provider
              }
             encounteredConflicts = [...encounteredConflicts, ...currentConflicts];


            if (mergedData && mergedData.rows) {
                for (let i = 0; i < mergedData.rows.length; i++) {
                    const row = mergedData.rows[i];
                    const contactIndex = mergedData.headers.indexOf('contact');
                    if (contactIndex > -1 && typeof row[contactIndex] === 'string') {
                        try {
                            // This was the problematic part. `row[contactIndex] = JSON.parse(row[contactIndex])`
                            // changes the type within the loop, but it doesn't guarantee it's a string array.
                            // For consistency, we'll ensure it remains string[][] and handle parsing/stringifying elsewhere
                            // or ensure the `ExcelData` type correctly reflects potential JSON strings.
                            // For now, we assume contact data is stored as a JSON string in the row.
                        } catch (e) {
                            console.warn("Could not parse contact string during merge:", row[contactIndex], e);
                        }
                    }
                }
            }

              // 3. Upload the potentially merged data back (only if no conflicts for this provider, or after resolution)
              // PRODUCTION NOTE: This strategy uploads the full merged data. For large datasets, consider delta updates if the API supports it.
              if (currentConflicts.length === 0 && mergedData.rows.length > 0) { // Ensure there's data to upload
                   console.log(`Uploading merged data to ${provider}.`);
                   // PRODUCTION NOTE: Handle potential upload errors gracefully.
                   await (provider === 'onedrive'
                      ? uploadToOneDrive(mergedData, authInfo)
                      : uploadToGoogleDrive(mergedData, authInfo));
              } else if (currentConflicts.length > 0) {
                   console.warn(`Conflicts detected with ${provider}. Manual resolution required before uploading changes for this provider.`);
                   // Data for this provider won't be uploaded until conflicts are resolved and sync is run again.
              }
           }


       } catch (error: any) {
           console.error(`Error syncing with ${provider}:`, error);
           let errorMessage = `Failed to sync data.`;
            // Handle potential authentication errors specifically
            if (error?.response?.status === 401 || error?.message?.includes('Unauthorized') || error?.message?.includes('Token')) {
               errorMessage = `Authentication failed for ${provider}. Please reconnect.`;
               // Remove the likely invalid token
               setSyncStatus('error');

               if (typeof window !== 'undefined') {
                    localStorage.removeItem(`${provider}AccessToken`);
                }
            } else if (error instanceof Error) {
                errorMessage += ` ${error.message}`;
            }
            toast({ title: `Sync Error with ${provider}`, description: errorMessage, variant: "destructive" });
            // Depending on the error, you might want to stop the sync process or just skip the provider.
            // For now, we continue to the next provider.
        }
    } // End loop through providers

       // Serialize contact objects back to JSON strings before saving/uploading
       if (mergedData && mergedData.rows) {
         mergedData.rows.forEach(row => {
             const contactIndex = mergedData.headers.indexOf('contact');
             if (contactIndex > -1 && typeof row[contactIndex] !== 'string' && row[contactIndex] !== null && row[contactIndex] !== undefined) {
                  row[contactIndex] = JSON.stringify(row[contactIndex]);
              }
         });
       }

       // 4. Update local storage with the final merged data (only if no new conflicts were encountered *during this specific sync cycle*)
       if (encounteredConflicts.length === 0) {
           if (mergedData.rows.length > 0 || mergedData.headers.length > 0) { // Only save if there's actual data
             setLocalData<ExcelData>('customerData', mergedData);
           }
        setLastSyncTime(new Date());
        // Update localStorage timestamp
        if (typeof window !== 'undefined') {
            localStorage.setItem('lastSyncTime', new Date().toISOString());
        }
        setSyncStatus('synced');
        toast({ title: "Sync Complete", description: "Data synchronized successfully." });
    } else {
         setConflicts(encounteredConflicts); // Show conflict resolution UI
         toast({ title: "Sync Complete with Conflicts", description: "Manual resolution needed for some data.", variant: "destructive" });
         // In this state, local data is NOT updated with the merged data until conflicts are resolved.
         setSyncStatus('conflict');
         // The merged data exists only in the `mergedData` variable within this function's scope.
         console.log("Conflicts detected:", encounteredConflicts);
    }

       setIsSyncing(false);
  }, [isSyncing, toast]);


  const syncCalendar = useCallback(async () => {
    const authInfo = await getAuthInfo('googledrive'); // Assuming googledrive token for calendar
    if (!authInfo) {
      toast({ title: "Google Calendar Sync Failed", description: "Not authenticated with Google.", variant: "destructive"});
      return;
    }

    toast({ title: "Syncing Calendar...", description: "Updating Google Calendar events." });

    try {
        const localTasks: Task[] = getLocalData<Task[]>('tasks') || [];
        const localReminders: Reminder[] = getLocalData<Reminder[]>('reminders') || [];
        const localAppointments: Appointment[] = getLocalData<Appointment[]>('appointments') || [];

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
                     syncedTasks.push(task); // Keep task even if calendar creation fails
                }
            }
        }
        setLocalData('tasks', syncedTasks);

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
         setLocalData('reminders', syncedReminders);

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
         setLocalData('appointments', syncedAppointments);

        toast({ title: "Calendar Synced", description: "Google Calendar events updated." });
    } catch (error) {
        console.error("Error syncing with Google Calendar:", error);
        toast({ title: "Calendar Sync Error", description: `Failed to sync with Google Calendar. ${error instanceof Error ? error.message : ''}`, variant: "destructive"});
    }
}, [toast]);

  // Effect to run sync periodically and load last sync time
  useEffect(() => {
    // Only run interval logic in the browser
    if (typeof window !== 'undefined') {
        // Load last sync time from localStorage
        const storedLastSyncTime = localStorage.getItem('lastSyncTime');
        if (storedLastSyncTime) {
            setLastSyncTime(new Date(storedLastSyncTime));
        }

        // Perform an initial sync check shortly after load if needed (optional)
        // Consider if this is desirable UX - might be better to wait for user action or timer.
        // setTimeout(performSync, 5000); // e.g., 5 seconds after load

        // Set up the interval timer
        const intervalId = setInterval(() => {
            console.log("Performing scheduled sync check...");
            performSync();
        }, SYNC_INTERVAL);

        // Clear interval on component unmount
        return () => clearInterval(intervalId);
    }
  }, [performSync, SYNC_INTERVAL]); // Add SYNC_INTERVAL to dependencies


    // Function to manually resolve a conflict
    const resolveConflict = useCallback((resolvedConflict: DataConflict) => {
        // 1. Find the conflict in the state
        const conflictIndex = conflicts.findIndex(c => c.rowIndex === resolvedConflict.rowIndex);
        if (conflictIndex === -1 || !resolvedConflict.resolvedValue) return;

        // 2. Update the local representation of merged data (get current local data again)
        let currentLocalData = getLocalData<ExcelData>('customerData');
        if (!currentLocalData) {
            toast({ title: "Error", description: "Could not load local data to apply resolution.", variant: "destructive" });
            return;
        }

        // Ensure the row index is valid
        if (resolvedConflict.rowIndex >= 0 && resolvedConflict.rowIndex < currentLocalData.rows.length) {
            currentLocalData.rows[resolvedConflict.rowIndex] = resolvedConflict.resolvedValue;
            setLocalData<ExcelData>('customerData', currentLocalData); // Save the resolved data locally

            // 3. Remove the resolved conflict from the state
            setConflicts(prevConflicts => prevConflicts.filter((_, index) => index !== conflictIndex));

            toast({ title: "Conflict Resolved", description: `Row ${resolvedConflict.rowIndex + 1} updated locally.` });

            // If all conflicts are resolved, trigger a sync to upload the changes
            if (conflicts.length === 1) { // If this was the last conflict
                toast({ title: "All Conflicts Resolved", description: "Attempting to sync changes to the cloud..." });
                // Using setTimeout to ensure state update completes before triggering sync
                setTimeout(performSync, 500); // Small delay
            }

        } else {
            console.error("Invalid row index for conflict resolution:", resolvedConflict.rowIndex);
            toast({ title: "Resolution Error", description: "Invalid row index.", variant: "destructive" });
        }
    }, [conflicts, toast, performSync]); // Added performSync dependency

    // Function to trigger authentication flow (Conceptual)
    // PRODUCTION NOTE: Implement proper OAuth 2.0 flows for production.
    // This usually involves redirecting the user to the provider's auth page
    // and handling the callback to obtain tokens. Libraries like next-auth
    // can simplify this process significantly.
    const initiateAuthentication = async (provider: 'onedrive' | 'googledrive') => {
        toast({ title: `Connecting ${provider}...`, description: "Redirecting for authentication (simulation)." });

        // --- START: SIMULATION ONLY - REPLACE WITH REAL OAUTH ---
        if (typeof window !== 'undefined') {
            const mockToken = `mock-${provider}-token-${Date.now()}`;
            localStorage.setItem(`${provider}AccessToken`, mockToken);
            toast({ title: `Connected ${provider} (Mock)`, description: "Mock token stored. Please refresh or sync." });
            // Automatically trigger a sync after mock authentication for demo purposes
             setTimeout(() => performSync(), 500);
        }
        // --- END: SIMULATION ONLY ---
    };


  return {
    isSyncing,
    conflicts,
    lastSyncTime,
    performSync,
    syncStatus,
    resolveConflict,
       initiateAuthentication,
    syncCalendar
  };
}
const ConflictResolutionUI = ({ conflicts, onResolve }: { conflicts: DataConflict[]; onResolve: (resolvedConflict: DataConflict) => void }) => {
    const [resolutions, setResolutions] = useState<Record<number, 'local' | 'cloud' | 'manual'>>({});
    const [manualValues, setManualValues] = useState<Record<number, string[]>>({});
    const { toast } = useToast();

    useEffect(() => {
        console.log("ConflictResolutionUI conflicts updated:", conflicts);
         const initialManualValues: Record<number, string[]> = {};
         const initialResolutions: Record<number, 'local' | 'cloud' | 'manual'> = {};

         conflicts.forEach((conflict) => {
            initialManualValues[conflict.rowIndex] = [...(conflict.localValue || [])]; // Default to local or empty array
            // Optionally pre-select a resolution strategy, e.g., 'manual' or 'local'
            // initialResolutions[conflict.rowIndex] = 'manual';
         });
         setManualValues(initialManualValues);
         setResolutions(initialResolutions); // Initialize resolutions as well
     }, [conflicts]);


    const handleResolutionChoice = (rowIndex: number, choice: 'local' | 'cloud' | 'manual') => {
        setResolutions(prev => ({ ...prev, [rowIndex]: choice }));
    };

    const handleManualInputChange = (rowIndex: number, colIndex: number, value: string) => {
        setManualValues(prev => {
            const currentRow = prev[rowIndex] ? [...prev[rowIndex]] : [];
             if (colIndex >= 0) {
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
          <Card className="w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border border-border">
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
