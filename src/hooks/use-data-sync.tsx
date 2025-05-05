// src/hooks/use-data-sync.tsx
import { useState, useEffect, useCallback } from 'react';
import { uploadToOneDrive, downloadFromOneDrive } from '@/services/onedrive';
import { uploadToGoogleDrive, downloadFromGoogleDrive } from '@/services/google-drive';
import type { ExcelData, CloudAuthInfo, DataConflict } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Cloud, CloudCog, CloudOff, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import React from 'react'; // Import React for JSX

// Placeholder for authentication - replace with actual auth logic
const getAuthInfo = async (provider: 'onedrive' | 'googledrive'): Promise<CloudAuthInfo | null> => {
  // In a real app, this would involve OAuth flows
  console.warn(`Authentication for ${provider} is not implemented. Returning mock token.`);
  // Simulating getting a token - DO NOT USE IN PRODUCTION
   if (typeof window !== 'undefined') {
       const storedToken = localStorage.getItem(`${provider}AccessToken`);
       if (storedToken) {
           return { accessToken: storedToken, provider };
       }
       // Prompt user to authenticate if no token (conceptual)
       // For now, return null or a mock token if needed for testing
       // return { accessToken: `mock-${provider}-token-${Date.now()}`, provider };
       return null; // Indicate no auth available
   }
   return null;
};

// Placeholder for getting local data
const getLocalData = (): ExcelData | null => {
   if (typeof window !== 'undefined') {
       const storedData = localStorage.getItem('customerData');
       try {
           return storedData ? JSON.parse(storedData) : null;
       } catch (e) {
           console.error("Failed to parse local data:", e);
           return null;
       }
   }
   return null;
};

// Placeholder for setting local data
const setLocalData = (data: ExcelData) => {
   if (typeof window !== 'undefined') {
        try {
            localStorage.setItem('customerData', JSON.stringify(data));
        } catch (e) {
             console.error("Failed to save local data:", e);
        }
    }
};


export function useDataSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const SYNC_INTERVAL = 24 * 60 * 60 * 1000; // Daily sync interval

  // Function to perform the sync
  const performSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setConflicts([]); // Clear old conflicts
    toast({ title: "Sync Started", description: "Synchronizing data with cloud storage..." });

    const localData = getLocalData();
    if (!localData) {
        toast({ title: "Sync Skipped", description: "No local data to sync.", variant: "destructive" });
        setIsSyncing(false);
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
         return;
    }


    let mergedData: ExcelData = { headers: localData.headers, rows: [...localData.rows] }; // Start with local data
    let encounteredConflicts: DataConflict[] = [];

    for (const provider of configuredProviders) {
        try {
            const authInfo = await getAuthInfo(provider);
            if (!authInfo) {
                console.warn(`Skipping ${provider}: Not authenticated.`);
                 toast({ title: `Skipping ${provider}`, description: `Authentication required.`, variant:"destructive" });
                continue; // Skip if not authenticated
            }

            // 1. Download data from the cloud provider
            const cloudDataRaw = await (provider === 'onedrive'
                ? downloadFromOneDrive(authInfo)
                : downloadFromGoogleDrive(authInfo));

            // Basic validation/parsing of cloud data (assuming it matches ExcelData structure)
             const cloudData = (cloudDataRaw && cloudDataRaw.headers && cloudDataRaw.rows) ? cloudDataRaw as ExcelData : null;


            if (!cloudData) {
                // If no cloud data exists, upload local data
                console.log(`No data found on ${provider}. Uploading local data.`);
                await (provider === 'onedrive'
                    ? uploadToOneDrive(localData, authInfo)
                    : uploadToGoogleDrive(localData, authInfo));
                continue; // Move to next provider
            }


            // 2. Compare and Merge (Simplified Example: Row-by-row comparison based on a key, e.g., first column)
            // THIS IS A VERY BASIC MERGE - REAL-WORLD NEEDS MORE ROBUST LOGIC
            const currentConflicts: DataConflict[] = [];
            const tempMergedRows: string[][] = [];
            const localRowCount = mergedData.rows.length;
            const cloudRowCount = cloudData.rows.length;
            const maxRows = Math.max(localRowCount, cloudRowCount);

             // Check header consistency (basic check)
             if (JSON.stringify(mergedData.headers) !== JSON.stringify(cloudData.headers)) {
                 console.error(`Header mismatch between local and ${provider} data. Aborting merge with this provider.`);
                 toast({ title: "Sync Error", description: `Header mismatch with ${provider}.`, variant: "destructive" });
                 continue; // Skip this provider due to header mismatch
             }


            for (let i = 0; i < maxRows; i++) {
                const localRow = i < localRowCount ? mergedData.rows[i] : null;
                const cloudRow = i < cloudRowCount ? cloudData.rows[i] : null;

                if (localRow && cloudRow) {
                    if (JSON.stringify(localRow) !== JSON.stringify(cloudRow)) {
                        // Conflict detected
                        currentConflicts.push({
                            rowIndex: i,
                            localValue: localRow,
                            cloudValue: cloudRow,
                            headers: mergedData.headers // Pass headers for context
                        });
                        // For now, keep local value during conflict (manual resolution needed)
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
            encounteredConflicts = [...encounteredConflicts, ...currentConflicts];


            // 3. Upload the potentially merged data back (only if no conflicts for now, or after resolution)
            if (currentConflicts.length === 0) {
                 console.log(`Uploading merged data to ${provider}.`);
                 await (provider === 'onedrive'
                    ? uploadToOneDrive(mergedData, authInfo)
                    : uploadToGoogleDrive(mergedData, authInfo));
            } else {
                 console.warn(`Conflicts detected with ${provider}. Manual resolution required before uploading.`);
            }


        } catch (error) {
            console.error(`Error syncing with ${provider}:`, error);
            toast({ title: `Sync Error with ${provider}`, description: `Failed to sync data. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
        }
    } // End loop through providers


    // 4. Update local storage with the final merged data (only if no conflicts for now)
    if (encounteredConflicts.length === 0) {
        setLocalData(mergedData);
        setLastSyncTime(new Date());
        toast({ title: "Sync Complete", description: "Data synchronized successfully." });
    } else {
         setConflicts(encounteredConflicts);
         toast({ title: "Sync Complete with Conflicts", description: "Manual resolution needed for some data.", variant: "destructive" });
         // In a real app, you'd show the ConflictResolutionUI here
         console.log("Conflicts detected:", encounteredConflicts);
         // For now, local data is NOT updated if conflicts exist
    }


    setIsSyncing(false);
  }, [isSyncing, toast]);

  // Effect to run sync periodically
  useEffect(() => {
    // Only run interval logic in the browser
    if (typeof window !== 'undefined') {
        // Perform an initial sync check shortly after load (optional)
        // setTimeout(performSync, 5000); // e.g., 5 seconds after load

        // Set up the daily interval
        const intervalId = setInterval(() => {
            console.log("Performing scheduled daily sync...");
            performSync();
        }, SYNC_INTERVAL);

        // Clear interval on component unmount
        return () => clearInterval(intervalId);
    }
  }, [performSync, SYNC_INTERVAL]);


   // Function to manually resolve a conflict
   const resolveConflict = useCallback((resolvedConflict: DataConflict) => {
       // 1. Find the conflict in the state
       const conflictIndex = conflicts.findIndex(c => c.rowIndex === resolvedConflict.rowIndex);
       if (conflictIndex === -1 || !resolvedConflict.resolvedValue) return;

       // 2. Update the local representation of merged data (get current local data again)
       let currentLocalData = getLocalData();
       if (!currentLocalData) return; // Should not happen if conflicts exist

       // Ensure the row index is valid
        if (resolvedConflict.rowIndex >= 0 && resolvedConflict.rowIndex < currentLocalData.rows.length) {
           currentLocalData.rows[resolvedConflict.rowIndex] = resolvedConflict.resolvedValue;
           setLocalData(currentLocalData); // Save the resolved data locally

           // 3. Remove the resolved conflict from the state
           setConflicts(prevConflicts => prevConflicts.filter((_, index) => index !== conflictIndex));

           // 4. Optionally, trigger an upload of the resolved data immediately
           // This might require re-running parts of the sync logic carefully
           // For simplicity now, the next scheduled sync will handle uploading the resolved state.
            toast({ title: "Conflict Resolved", description: `Row ${resolvedConflict.rowIndex + 1} updated.` });

            // If all conflicts are resolved, maybe trigger a sync?
             if (conflicts.length === 1) { // If this was the last conflict
                 // Optionally trigger a background sync to upload the fully resolved data
                 // Be cautious about triggering too many syncs
                 setTimeout(performSync, 1000); // Small delay
             }


       } else {
            console.error("Invalid row index for conflict resolution:", resolvedConflict.rowIndex);
             toast({ title: "Resolution Error", description: "Invalid row index.", variant: "destructive" });
       }


   }, [conflicts, toast, performSync]); // Added performSync dependency


  // Placeholder: Function to trigger authentication flow
  const initiateAuthentication = async (provider: 'onedrive' | 'googledrive') => {
      toast({ title: `Authenticating ${provider}...`, description: "Redirecting for authentication (simulation)." });
      // In a real app: Initiate OAuth flow here.
      // For simulation, let's just store a mock token.
      if (typeof window !== 'undefined') {
          const mockToken = `mock-${provider}-token-${Date.now()}`;
          localStorage.setItem(`${provider}AccessToken`, mockToken);
          toast({ title: `Authenticated ${provider}`, description: "Mock token stored. Please refresh or sync." });
           // Optionally trigger sync after successful auth
           // performSync();
      }
  };


  return {
    isSyncing,
    conflicts,
    lastSyncTime,
    performSync,
    resolveConflict, // Add this
    initiateAuthentication, // Add this
  };
}

// Placeholder for Conflict Resolution UI Component
// You would create a real component (e.g., src/components/ConflictResolver.tsx)
// and conditionally render it when `conflicts.length > 0`
const ConflictResolutionUI = ({ conflicts, onResolve }: { conflicts: DataConflict[], onResolve: (resolvedConflict: DataConflict) => void }) => {
    const [resolutions, setResolutions] = useState<Record<number, 'local' | 'cloud' | 'manual'>>({});
    const [manualValues, setManualValues] = useState<Record<number, string[]>>({});

    const handleResolutionChoice = (rowIndex: number, choice: 'local' | 'cloud' | 'manual') => {
        setResolutions(prev => ({ ...prev, [rowIndex]: choice }));
        if (choice === 'manual' && !manualValues[rowIndex]) {
             // Initialize manual values with local data if switching to manual and not already initialized
            const conflict = conflicts.find(c => c.rowIndex === rowIndex);
            setManualValues(prev => ({ ...prev, [rowIndex]: [...(conflict?.localValue || [])] })); // Deep copy
        }
    };

     const handleManualInputChange = (rowIndex: number, colIndex: number, value: string) => {
        setManualValues(prev => {
            const newRow = [...(prev[rowIndex] || [])];
            newRow[colIndex] = value;
            return { ...prev, [rowIndex]: newRow };
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
             if (!resolvedValue || resolvedValue.length !== conflict.localValue.length) {
                toast({ title: "Manual Edit Incomplete", description: `Please ensure all fields for Row ${conflict.rowIndex + 1} are filled.`, variant: "destructive"});
                return; // Prevent resolving incomplete manual edits
             }
        }

        if (resolvedValue) {
             // Ensure the headers are included in the resolved conflict object passed back
            onResolve({ ...conflict, resolvedValue });
        } else {
             toast({ title: "Resolution Error", description: `Please select a resolution option for Row ${conflict.rowIndex + 1}.`, variant: "destructive"});
             console.error("No resolution selected or manual data missing for row", conflict.rowIndex);
        }
    };


    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
                 <CardHeader>
                     <CardTitle>Resolve Data Conflicts</CardTitle>
                     <CardDescription>Differences found between local data and cloud data. Choose which version to keep for each conflict.</CardDescription>
                 </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-4 p-6">
                    {conflicts.map((conflict) => (
                        <Card key={conflict.rowIndex} className="p-4 border-orange-500 border bg-background shadow-md">
                             <h3 className="font-semibold mb-3 text-base">Conflict in Row {conflict.rowIndex + 1}</h3>
                              <div className="overflow-x-auto mb-4">
                                  <table className="w-full text-sm border-collapse">
                                      <thead>
                                          <tr className="border-b">
                                              <th className="text-left p-2 font-medium text-muted-foreground w-1/4">Field</th>
                                              <th className="text-left p-2 font-medium text-muted-foreground w-1/3">Local Version</th>
                                              <th className="text-left p-2 font-medium text-muted-foreground w-1/3">Cloud Version</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {conflict.localValue.map((_, colIndex) => (
                                             <tr key={colIndex} className="border-b last:border-b-0 hover:bg-muted/50">
                                                 <td className="p-2 text-muted-foreground truncate" title={conflict.headers?.[colIndex]}>{conflict.headers?.[colIndex] ?? `Col ${colIndex+1}`}</td>
                                                 <td className={`p-2 ${JSON.stringify(conflict.localValue[colIndex]) !== JSON.stringify(conflict.cloudValue[colIndex]) ? 'font-semibold text-orange-700' : ''}`}>{conflict.localValue[colIndex]}</td>
                                                 <td className={`p-2 ${JSON.stringify(conflict.localValue[colIndex]) !== JSON.stringify(conflict.cloudValue[colIndex]) ? 'font-semibold text-blue-700' : ''}`}>{conflict.cloudValue[colIndex]}</td>
                                             </tr>
                                         ))}
                                      </tbody>
                                  </table>
                              </div>

                             <RadioGroup
                                value={resolutions[conflict.rowIndex]}
                                onValueChange={(value: 'local' | 'cloud' | 'manual') => handleResolutionChoice(conflict.rowIndex, value)}
                                className="flex flex-wrap gap-4 mb-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="local" id={`local-${conflict.rowIndex}`} />
                                    <Label htmlFor={`local-${conflict.rowIndex}`}>Keep Local (Orange)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="cloud" id={`cloud-${conflict.rowIndex}`} />
                                    <Label htmlFor={`cloud-${conflict.rowIndex}`}>Use Cloud (Blue)</Label>
                                </div>
                                 <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="manual" id={`manual-${conflict.rowIndex}`} />
                                    <Label htmlFor={`manual-${conflict.rowIndex}`}>Edit Manually</Label>
                                </div>
                            </RadioGroup>

                             {resolutions[conflict.rowIndex] === 'manual' && (
                                <div className="space-y-3 mt-4 border-t pt-4">
                                    <h4 className="text-sm font-medium">Manual Edit:</h4>
                                     {manualValues[conflict.rowIndex]?.map((val, colIndex) => (
                                         <div key={colIndex} className="grid grid-cols-4 items-center gap-3">
                                              <Label className="text-xs truncate text-right col-span-1" title={conflict.headers?.[colIndex]}>{conflict.headers?.[colIndex] ?? `Col ${colIndex+1}`}</Label>
                                              <Input
                                                  value={val}
                                                  onChange={(e) => handleManualInputChange(conflict.rowIndex, colIndex, e.target.value)}
                                                  className="h-8 col-span-3"
                                              />
                                         </div>
                                     ))}
                                </div>
                            )}

                            <div className="flex justify-end mt-4">
                                <Button size="sm" onClick={() => handleApplyResolution(conflict)} disabled={!resolutions[conflict.rowIndex]}>Apply Resolution</Button>
                            </div>
                        </Card>
                    ))}
                </CardContent>
                {/* Add overall actions if needed, like "Resolve All with Local" etc. */}
                 <CardFooter className="border-t p-4 bg-muted/50">
                     <p className="text-xs text-muted-foreground">Resolved data will be saved locally. The next sync will upload the changes.</p>
                     {/* Example: Add a button to resolve all with local - requires careful implementation */}
                     {/* <Button variant="outline" size="sm" onClick={handleResolveAllLocal} className="ml-auto">Resolve All with Local</Button> */}
                 </CardFooter>
            </Card>
        </div>
    );
};


export { ConflictResolutionUI }; // Export the placeholder component
