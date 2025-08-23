'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { uploadToOneDrive, downloadFromOneDrive, fetchOneDriveFileMetadata } from '@/services/onedrive';
import {
  createMicrosoftCalendarEventAction,
  updateMicrosoftCalendarEventAction,
  deleteMicrosoftCalendarEventAction,
  syncToMicrosoftCalendarAction,
  batchSyncToMicrosoftCalendarAction
} from '@/app/actions/microsoft-calendar-actions';
import {
  getMicrosoftTokens,
  saveMicrosoftTokens,
  clearMicrosoftTokens,
  isMicrosoftAuthenticated
} from '@/services/auth';
import type { MicrosoftTokens, FileMetadata, SyncStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface MicrosoftSyncState {
  isConnected: boolean;
  isLoading: boolean;
  lastSyncTime: string | null;
  syncStatus: SyncStatus;
  error: string | null;
  isCalendarConnected: boolean;
}

interface MicrosoftSyncActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  uploadData: (data: any, filename: string) => Promise<boolean>;
  downloadData: (filename: string) => Promise<any>;
  syncData: (localData: any) => Promise<{ success: boolean; data?: any; hasConflicts?: boolean; conflicts?: any[] }>;
  syncCalendarEvent: (event: any, action: 'create' | 'update' | 'delete') => Promise<boolean>;
  batchSyncCalendarEvents: (events: any[]) => Promise<boolean>;
  checkConnection: () => Promise<boolean>;
  refreshTokens: () => Promise<boolean>;
}

export function useMicrosoftSync(): MicrosoftSyncState & MicrosoftSyncActions {
  const [state, setState] = useState<MicrosoftSyncState>({
    isConnected: false,
    isLoading: false,
    lastSyncTime: null,
    syncStatus: 'idle',
    error: null,
    isCalendarConnected: false
  });
  
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check if tokens are valid
  const areTokensValid = useCallback((tokens: MicrosoftTokens | null): boolean => {
    if (!tokens?.access_token) return false;
    if (!tokens.expires_at) return true; // Assume valid if no expiry
    return Date.now() < tokens.expires_at;
  }, []);

  // Check connection status
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const tokens = getMicrosoftTokens();
      if (!tokens || !areTokensValid(tokens)) {
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isCalendarConnected: false 
        }));
        return false;
      }

      // Test OneDrive connection
      const oneDriveConnected = await isMicrosoftAuthenticated();
      
      // Test Calendar connection (simplified check)
      const calendarConnected = oneDriveConnected; // Assume same auth for now
      
      setState(prev => ({ 
        ...prev, 
        isConnected: oneDriveConnected,
        isCalendarConnected: calendarConnected,
        error: oneDriveConnected ? null : 'Connection failed' 
      }));
      
      return oneDriveConnected;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isCalendarConnected: false,
        error: 'Connection check failed' 
      }));
      return false;
    }
  }, [areTokensValid]);

  // Connect to Microsoft services
  const connect = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // This would typically redirect to Microsoft OAuth
      // For now, we'll show a message
      toast({
        title: 'Microsoft Authentication',
        description: 'Please complete Microsoft authentication.',
      });
      
      // Simulate connection process
      // In real implementation, this would handle OAuth flow
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: 'Connection Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [toast]);

  // Disconnect from Microsoft services
  const disconnect = useCallback((): void => {
    clearMicrosoftTokens();
    
    setState(prev => ({ 
      ...prev, 
      isConnected: false,
      isCalendarConnected: false,
      error: null,
      lastSyncTime: null,
      syncStatus: 'idle'
    }));
    
    toast({
      title: 'Disconnected',
      description: 'Microsoft services have been disconnected.',
    });
  }, [toast]);

  // Upload data to OneDrive
  const uploadData = useCallback(async (data: any, filename: string): Promise<boolean> => {
    if (!state.isConnected) {
      toast({
        title: 'Not Connected',
        description: 'Please connect to Microsoft OneDrive first.',
        variant: 'destructive'
      });
      return false;
    }

    setState(prev => ({ ...prev, syncStatus: 'syncing' }));
    
    try {
      const tokens = getMicrosoftTokens();
      if (!tokens) {
        throw new Error('No Microsoft tokens available');
      }
      
      const authInfo = { accessToken: tokens.access_token };
      await uploadToOneDrive(data, authInfo);
      
      setState(prev => ({ 
        ...prev, 
        syncStatus: 'synced',
        lastSyncTime: new Date().toISOString(),
        error: null
      }));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setState(prev => ({ ...prev, syncStatus: 'error', error: errorMessage }));
      
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    }
  }, [state.isConnected, toast, getMicrosoftTokens]);

  // Download data from OneDrive
  const downloadData = useCallback(async (filename: string): Promise<any> => {
    if (!state.isConnected) {
      toast({
        title: 'Not Connected',
        description: 'Please connect to Microsoft OneDrive first.',
        variant: 'destructive'
      });
      return null;
    }

    setState(prev => ({ ...prev, syncStatus: 'syncing' }));
    
    try {
      const tokens = getMicrosoftTokens();
      if (!tokens) {
        throw new Error('No Microsoft tokens available');
      }
      
      const authInfo = { accessToken: tokens.access_token };
      const result = await downloadFromOneDrive(authInfo);
      
      setState(prev => ({ 
        ...prev, 
        syncStatus: 'synced',
        lastSyncTime: new Date().toISOString(),
        error: null
      }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      setState(prev => ({ ...prev, syncStatus: 'error', error: errorMessage }));
      
      toast({
        title: 'Download Failed',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    }
  }, [state.isConnected, toast, getMicrosoftTokens]);

  // Sync calendar event
  const syncCalendarEvent = useCallback(async (event: any, action: 'create' | 'update' | 'delete'): Promise<boolean> => {
    if (!state.isCalendarConnected) {
      return false;
    }

    try {
      let result;
      
      // Determine event type based on event properties
      const eventType = event.type || (event.dueDate ? 'task' : event.reminderTime ? 'reminder' : 'appointment');
      
      switch (action) {
        case 'create':
          result = await createMicrosoftCalendarEventAction(event, eventType);
          break;
        case 'update':
          result = await updateMicrosoftCalendarEventAction(event, eventType, event.id);
          break;
        case 'delete':
          result = await deleteMicrosoftCalendarEventAction(event.id);
          break;
        default:
          throw new Error('Invalid action');
      }
      
      return result.success;
    } catch (error) {
      console.error('Calendar sync failed:', error);
      return false;
    }
  }, [state.isCalendarConnected]);

  // Batch sync calendar events
  const batchSyncCalendarEvents = useCallback(async (events: any[]): Promise<boolean> => {
    if (!state.isCalendarConnected || events.length === 0) {
      return false;
    }

    try {
      const result = await batchSyncToMicrosoftCalendarAction(events);
      return result.success;
    } catch (error) {
      console.error('Batch calendar sync failed:', error);
      return false;
    }
  }, [state.isCalendarConnected]);

  // Sync data with OneDrive (bidirectional sync)
  const syncData = useCallback(async (localData: any): Promise<{ success: boolean; data?: any; hasConflicts?: boolean; conflicts?: any[] }> => {
    if (!state.isConnected) {
      return { success: false };
    }

    try {
      const filename = 'customer-data.json';
      
      // Try to download existing data from cloud
      const cloudData = await downloadData(filename);
      
      if (cloudData && localData) {
        // Simple conflict detection - in a real implementation, you'd want more sophisticated logic
        const hasConflicts = JSON.stringify(cloudData) !== JSON.stringify(localData);
        
        if (hasConflicts) {
          return {
            success: true,
            hasConflicts: true,
            conflicts: [{
              id: 'data-conflict',
              reason: 'Data mismatch between local and cloud',
              localValue: localData,
              cloudValue: cloudData
            }]
          };
        }
      }
      
      // If no conflicts or no cloud data, upload local data
      if (localData) {
        const uploadSuccess = await uploadData(localData, filename);
        return { success: uploadSuccess, data: localData };
      }
      
      // If no local data but cloud data exists, return cloud data
      if (cloudData) {
        return { success: true, data: cloudData };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Microsoft sync data error:', error);
      return { success: false };
    }
  }, [state.isConnected, uploadData, downloadData]);

  // Refresh tokens
  const refreshTokens = useCallback(async (): Promise<boolean> => {
    try {
      const tokens = getMicrosoftTokens();
      if (!tokens?.refresh_token) return false;

      // This would typically call a refresh endpoint
      // For now, we'll just check if current tokens are valid
      return isMicrosoftAuthenticated();
    } catch (error) {
      return false;
    }
  }, [getMicrosoftTokens, isMicrosoftAuthenticated]);

  // Initialize connection check on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    uploadData,
    downloadData,
    syncData,
    syncCalendarEvent,
    batchSyncCalendarEvents,
    checkConnection,
    refreshTokens
  };
}