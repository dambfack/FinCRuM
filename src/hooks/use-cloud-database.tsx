// src/hooks/use-cloud-database.tsx

import { useState, useEffect, useCallback } from 'react';
import { getCloudDatabase } from '@/services/shared-cloud-database';
import type { CloudProvider, DataItemType, DataConflictWithResolution, ConflictResolution } from '@/lib/types';
import { conflictResolutionLog } from '@/services/conflict-resolution-log';
import { getData, saveData } from '@/lib/utils';

export interface CloudDatabaseState {
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  error: string | null;
  isConnected: boolean;
  provider: CloudProvider | null;
  conflicts: DataConflictWithResolution[];
  hasUnresolvedConflicts: boolean;
}

export interface CloudDatabaseActions {
  syncNow: (manualResolutions?: Map<string, ConflictResolution>) => Promise<void>;
  addOrUpdateItem: <T extends { id: string; updatedAt?: Date | string }>(
    dataType: DataItemType,
    item: T,
    manualResolutions?: Map<string, ConflictResolution>
  ) => Promise<void>;
  deleteItem: (dataType: DataItemType, itemId: string, manualResolutions?: Map<string, ConflictResolution>) => Promise<void>;
  enableAutoSync: (enabled: boolean) => void;
  setProvider: (provider: CloudProvider | null) => void;
  resolveConflicts: (resolutions: Map<string, ConflictResolution>) => Promise<boolean>;
  getConflictResolutionLogs: () => Promise<any[]>;
  clearConflicts: () => void;
}

export interface UseCloudDatabaseReturn {
  state: CloudDatabaseState;
  actions: CloudDatabaseActions;
}

/**
 * Hook for managing shared cloud database operations with mandatory cloud sync
 * Enables multiple PIN-authenticated users to sync with the same cloud storage accounts
 */
export function useCloudDatabase(): UseCloudDatabaseReturn {
  const [state, setState] = useState<CloudDatabaseState>({
    isLoading: false,
    isSyncing: false,
    lastSyncTime: null,
    error: null,
    isConnected: false,
    provider: null,
    conflicts: [],
    hasUnresolvedConflicts: false
  });

  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(
    getData<boolean>('autoSyncEnabled') ?? true
  );

  // Initialize state on mount
  useEffect(() => {
    const initializeState = () => {
      const cloudDatabase = getCloudDatabase();
      const provider = cloudDatabase.getPreferredProvider();
      const lastSyncTime = getData<string>(DataItemType.LastSyncTime);
      
      setState(prev => ({
        ...prev,
        provider,
        isConnected: provider !== null,
        lastSyncTime
      }));
    };

    initializeState();
  }, []);

  // Auto-sync on data changes
  useEffect(() => {
    if (!autoSyncEnabled || !state.provider || state.isSyncing) {
      return;
    }

    const handleDataChange = () => {
      // Debounce auto-sync to avoid excessive syncing
      const timeoutId = setTimeout(() => {
        syncNow();
      }, 2000); // 2 second delay

      return () => clearTimeout(timeoutId);
    };

    // Listen for data changes
    window.addEventListener('dataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('dataChanged', handleDataChange);
    };
  }, [autoSyncEnabled, state.provider, state.isSyncing]);

  // Periodic sync every 5 minutes
  useEffect(() => {
    if (!autoSyncEnabled || !state.provider) {
      return;
    }

    const intervalId = setInterval(() => {
      if (!state.isSyncing) {
        syncNow();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, [autoSyncEnabled, state.provider, state.isSyncing]);

  /**
   * Perform immediate sync with cloud
   */
  const syncNow = useCallback(async (manualResolutions?: Map<string, ConflictResolution>): Promise<void> => {
    if (!state.provider || state.isSyncing) {
      return;
    }

    setState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const cloudDatabase = CloudDatabaseService.getInstance();
      const result = await cloudDatabase.syncWithCloud(state.provider, manualResolutions);
      
      if (result.success) {
        const now = new Date().toISOString();
        setState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: now,
          error: null,
          conflicts: result.conflicts,
          hasUnresolvedConflicts: result.conflicts.length > 0
        }));
        
        // Trigger data change event to update UI
        window.dispatchEvent(new Event('dataChanged'));
      } else {
        setState(prev => ({
          ...prev,
          isSyncing: false,
          error: result.error || 'Sync failed',
          conflicts: result.conflicts,
          hasUnresolvedConflicts: result.conflicts.length > 0
        }));
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message || 'Sync failed'
      }));
    }
  }, [state.provider, state.isSyncing]);

  /**
   * Add or update an item in the cloud database
   */
  const addOrUpdateItem = useCallback(async <T extends { id: string; updatedAt?: Date | string }>(
    dataType: DataItemType,
    item: T,
    manualResolutions?: Map<string, ConflictResolution>
  ): Promise<void> => {
    if (!state.provider) {
      throw new Error('No cloud provider connected');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const cloudDatabase = CloudDatabaseService.getInstance();
      const result = await cloudDatabase.addOrUpdateItem(state.provider, dataType, item, manualResolutions);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          lastSyncTime: new Date().toISOString(),
          error: null,
          conflicts: result.conflicts,
          hasUnresolvedConflicts: result.conflicts.length > 0
        }));
        
        // Trigger data change event to update UI
        window.dispatchEvent(new Event('dataChanged'));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to save item',
          conflicts: result.conflicts,
          hasUnresolvedConflicts: result.conflicts.length > 0
        }));
        throw new Error(result.error || 'Failed to save item');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to save item'
      }));
      throw error;
    }
  }, [state.provider]);

  /**
   * Delete an item from the cloud database
   */
  const deleteItem = useCallback(async (
    dataType: DataItemType,
    itemId: string,
    manualResolutions?: Map<string, ConflictResolution>
  ): Promise<void> => {
    if (!state.provider) {
      throw new Error('No cloud provider connected');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const cloudDatabase = CloudDatabaseService.getInstance();
      const result = await cloudDatabase.deleteItem(state.provider, dataType, itemId, manualResolutions);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          lastSyncTime: new Date().toISOString(),
          error: null,
          conflicts: result.conflicts,
          hasUnresolvedConflicts: result.conflicts.length > 0
        }));
        
        // Trigger data change event to update UI
        window.dispatchEvent(new Event('dataChanged'));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to delete item',
          conflicts: result.conflicts,
          hasUnresolvedConflicts: result.conflicts.length > 0
        }));
        throw new Error(result.error || 'Failed to delete item');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to delete item'
      }));
      throw error;
    }
  }, [state.provider]);

  /**
   * Enable or disable auto-sync
   */
  const enableAutoSync = useCallback((enabled: boolean): void => {
    setAutoSyncEnabled(enabled);
    saveData('autoSyncEnabled', enabled);
  }, []);

  /**
   * Set the cloud provider
   */
  const setProvider = useCallback((provider: CloudProvider | null): void => {
    setState(prev => ({
      ...prev,
      provider,
      isConnected: provider !== null
    }));
  }, []);

  const resolveConflicts = useCallback(async (resolutions: Map<string, ConflictResolution>): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const cloudDatabase = CloudDatabaseService.getInstance();
      const result = await cloudDatabase.resolveConflicts(state.conflicts, resolutions);
      
      if (result.success) {
        const lastSyncTime = getData<string>(DataItemType.LastSyncTime);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          lastSyncTime,
          error: null,
          conflicts: [],
          hasUnresolvedConflicts: false
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: result.error || 'Failed to resolve conflicts'
        }));
      }

      return result.success;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
      return false;
    }
  }, [state.conflicts]);

  const getConflictResolutionLogs = useCallback(async () => {
    try {
      return await conflictResolutionLog.getLogs();
    } catch (error) {
      console.error('Failed to get conflict resolution logs:', error);
      return [];
    }
  }, []);

  const clearConflicts = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      conflicts: [],
      hasUnresolvedConflicts: false,
      error: null
    }));
  }, []);

  return {
    state,
    actions: {
      syncNow,
      addOrUpdateItem,
      deleteItem,
      enableAutoSync,
      setProvider,
      resolveConflicts,
      getConflictResolutionLogs,
      clearConflicts
    }
  };
}

/**
 * Hook for getting cloud database status
 */
export function useCloudDatabaseStatus() {
  const { state } = useCloudDatabase();
  
  return {
    isConnected: state.isConnected,
    provider: state.provider,
    lastSyncTime: state.lastSyncTime,
    isSyncing: state.isSyncing,
    error: state.error
  };
}