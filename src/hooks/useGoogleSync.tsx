'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { uploadToGoogleDriveAction, downloadFromGoogleDriveAction, fetchGoogleDriveFileMetadataAction } from '@/app/actions/google-drive-actions';
import { generateGoogleAuthUrlAction, exchangeCodeForTokensAction } from '@/app/actions/google-auth-actions';
import {
  createCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction
} from '@/app/actions/google-calendar-actions';
import { getGoogleTokens } from '@/services/auth';
import type { GoogleTokens, FileMetadata, SyncStatus } from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { isElectron, isElectronIPCAvailable, getElectronAPI } from '@/utils/electron';

interface GoogleSyncState {
  isConnected: boolean;
  isLoading: boolean;
  lastSyncTime: string | null;
  syncStatus: SyncStatus;
  error: string | null;
}

interface GoogleSyncActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  uploadData: (data: any, filename: string) => Promise<boolean>;
  downloadData: (filename: string) => Promise<any>;
  syncData: (localData: any) => Promise<{ success: boolean; data?: any; hasConflicts?: boolean; conflicts?: any[] }>;
  syncCalendarEvent: (event: any, action: 'create' | 'update' | 'delete') => Promise<boolean>;
  checkConnection: () => Promise<boolean>;
  refreshTokens: () => Promise<boolean>;
}

export function useGoogleSync(): GoogleSyncState & GoogleSyncActions {
  const [state, setState] = useState<GoogleSyncState>({
    isConnected: false,
    isLoading: false,
    lastSyncTime: null,
    syncStatus: 'idle',
    error: null
  });
  
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get Google tokens from storage using the centralized auth service
  const getGoogleTokensFromStorage = useCallback((): GoogleTokens | null => {
    return getGoogleTokens();
  }, []);

  // Check if tokens are valid
  const areTokensValid = useCallback((tokens: GoogleTokens | null): boolean => {
    if (!tokens?.access_token) return false;
    if (!tokens.expiry_date) return true; // Assume valid if no expiry
    return Date.now() < tokens.expiry_date;
  }, []);

  // Check connection status
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const tokens = getGoogleTokensFromStorage();
      if (!tokens || !areTokensValid(tokens)) {
        setState(prev => ({ ...prev, isConnected: false }));
        return false;
      }

      // Additional validation to ensure we have at least access_token or refresh_token
      if (!tokens.access_token && !tokens.refresh_token) {
        console.warn('Google tokens found but both access_token and refresh_token are missing');
        setState(prev => ({ ...prev, isConnected: false, error: 'Invalid tokens - authentication required' }));
        return false;
      }

      // Test connection by fetching file metadata
      const result = await fetchGoogleDriveFileMetadataAction(tokens);
      const isConnected = result.success;
      
      setState(prev => ({ ...prev, isConnected, error: isConnected ? null : 'Connection failed' }));
      return isConnected;
    } catch (error) {
      console.error('Google connection check failed:', error);
      setState(prev => ({ ...prev, isConnected: false, error: 'Connection check failed' }));
      return false;
    }
  }, [getGoogleTokensFromStorage, areTokensValid]);

  // Connect to Google Drive
  const connect = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const authUrlResult = await generateGoogleAuthUrlAction([
        'https://www.googleapis.com/auth/tasks',
        'https://www.googleapis.com/auth/drive.file'
      ], isElectron());
      if (!authUrlResult.success || !authUrlResult.authUrl) {
        throw new Error('Failed to generate auth URL');
      }

      // Store the provider in sessionStorage for the callback
      sessionStorage.setItem('googleAuthProvider', 'google');
      
      // Check if we're in Electron and use the appropriate method
      if (isElectron() && isElectronIPCAvailable()) {
        const electronAPI = getElectronAPI();
        
        // Set up OAuth callback listener
        const handleOAuthCallback = (code: string) => {
          console.log('OAuth callback received in renderer:', code);
          // Process the code using the existing action
          exchangeCodeForTokensAction(code, true)
            .then(async () => {
              console.log('OAuth tokens exchanged successfully');
              // Remove the listener
              electronAPI.removeOAuthListener(handleOAuthCallback);
              // Check connection status to update UI
              await checkConnection();
              setState(prev => ({ ...prev, isLoading: false }));
              toast({
                title: 'Google Drive Connected',
                description: 'Successfully connected to Google Drive.',
              });
            })
            .catch((error) => {
              console.error('Error exchanging OAuth tokens:', error);
              setState(prev => ({ ...prev, error: 'Failed to complete authentication', isLoading: false }));
              electronAPI.removeOAuthListener(handleOAuthCallback);
            });
        };
        
        // Set up error listener
        const handleOAuthError = (error: string) => {
          console.error('OAuth error received:', error);
          setState(prev => ({ ...prev, error: `Authentication failed: ${error}` }));
          electronAPI.removeOAuthListener(handleOAuthCallback);
        };
        
        // Add listeners
        electronAPI.onOAuthCallback(handleOAuthCallback);
        electronAPI.onOAuthError?.(handleOAuthError);
        
        // Open URL in system browser via Electron
        const result = await electronAPI.openOAuthUrl(authUrlResult.authUrl);
        if (!result.success) {
          throw new Error(result.error || 'Failed to open OAuth URL');
        }
      } else {
        // Fallback to window.open for web browsers
        window.open(authUrlResult.authUrl, '_blank', 'width=500,height=600');
        
        // For web browsers, we need to handle the callback differently
        // The user will need to manually refresh or we could implement polling
        toast({
          title: 'Google Authentication',
          description: 'After completing authentication, please refresh the page to see the connection status.',
        });
        return; // Exit early for web browsers
      }
      
      // This toast is only for Electron environment
      toast({
        title: 'Google Authentication',
        description: 'Please complete authentication in the popup window.',
      });
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

  // Disconnect from Google Drive
  const disconnect = useCallback((): void => {
    // Clear tokens from storage
    localStorage.removeItem(DataItemType.GoogleDriveAccessToken);
    localStorage.removeItem(DataItemType.GoogleDriveRefreshToken);
    localStorage.removeItem('googleDriveTokenExpiry');
    
    setState(prev => ({ 
      ...prev, 
      isConnected: false, 
      error: null,
      lastSyncTime: null,
      syncStatus: 'idle'
    }));
    
    toast({
      title: 'Disconnected',
      description: 'Google Drive has been disconnected.',
    });
  }, [toast]);

  // Upload data to Google Drive
  const uploadData = useCallback(async (data: any, filename: string): Promise<boolean> => {
    if (!state.isConnected) {
      toast({
        title: 'Not Connected',
        description: 'Please connect to Google Drive first.',
        variant: 'destructive'
      });
      return false;
    }

    setState(prev => ({ ...prev, syncStatus: 'syncing' }));
    
    try {
      const tokens = getGoogleTokensFromStorage();
      if (!tokens) {
        throw new Error('No Google tokens available');
      }
      
      const result = await uploadToGoogleDriveAction(data, tokens);
      
      if (result.success) {
        setState(prev => ({ 
          ...prev, 
          syncStatus: 'synced',
          lastSyncTime: new Date().toISOString(),
          error: null
        }));
        return true;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
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
  }, [state.isConnected, toast, getGoogleTokensFromStorage]);

  // Download data from Google Drive
  const downloadData = useCallback(async (filename: string): Promise<any> => {
    if (!state.isConnected) {
      toast({
        title: 'Not Connected',
        description: 'Please connect to Google Drive first.',
        variant: 'destructive'
      });
      return null;
    }

    setState(prev => ({ ...prev, syncStatus: 'syncing' }));
    
    try {
      const tokens = getGoogleTokensFromStorage();
      if (!tokens) {
        throw new Error('No Google tokens available');
      }
      
      const result = await downloadFromGoogleDriveAction(tokens);
      
      if (result.success) {
        setState(prev => ({ 
          ...prev, 
          syncStatus: 'synced',
          lastSyncTime: new Date().toISOString(),
          error: null
        }));
        return result.data;
      } else {
        throw new Error(result.error || 'Download failed');
      }
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
  }, [state.isConnected, toast, getGoogleTokensFromStorage]);

  // Sync calendar event
  const syncCalendarEvent = useCallback(async (event: any, action: 'create' | 'update' | 'delete'): Promise<boolean> => {
    if (!state.isConnected) {
      return false;
    }

    try {
      const tokens = getGoogleTokensFromStorage();
      if (!tokens) {
        throw new Error('No Google tokens available');
      }

      let result;
      // Determine event type based on event properties
      const eventType = event.type || (event.dueDate ? 'reminder' : 'appointment');
      
      switch (action) {
        case 'create':
          result = await createCalendarEventAction(event, eventType, tokens);
          break;
        case 'update':
          result = await updateCalendarEventAction(event.id, event, eventType, tokens);
          break;
        case 'delete':
          result = await deleteCalendarEventAction(event.id, tokens);
          break;
        default:
          throw new Error('Invalid action');
      }
      
      return result.success;
    } catch (error) {
      console.error('Calendar sync failed:', error);
      return false;
    }
  }, [state.isConnected, getGoogleTokensFromStorage]);

  // Sync data with Google Drive (bidirectional sync)
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
      console.error('Google sync data error:', error);
      return { success: false };
    }
  }, [state.isConnected, uploadData, downloadData]);

  // Refresh tokens
  const refreshTokens = useCallback(async (): Promise<boolean> => {
    try {
      const tokens = getGoogleTokensFromStorage();
      if (!tokens?.refresh_token) return false;

      // This would typically call a refresh endpoint
      // For now, we'll just check if current tokens are valid
      return areTokensValid(tokens);
    } catch (error) {
      return false;
    }
  }, [getGoogleTokensFromStorage, areTokensValid]);

  // Initialize connection check on mount (only once)
  useEffect(() => {
    checkConnection();
  }, []); // Empty dependency array to run only once on mount

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
    checkConnection,
    refreshTokens
  };
}