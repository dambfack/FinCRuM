import { getCloudDatabase } from './shared-cloud-database';
import { getDeviceManager } from './device-management';
import { getData, saveData } from '@/lib/utils';
import { DataItemType, DataConflictWithResolution, ConflictResolution } from '@/lib/types';

interface ChangeNotification {
  id: string;
  type: 'create' | 'update' | 'delete';
  dataType: DataItemType;
  itemId: string;
  userId: string;
  deviceId: string;
  timestamp: string;
  data?: any;
  processed: boolean;
}

interface OptimisticUpdate {
  id: string;
  type: 'create' | 'update' | 'delete';
  dataType: DataItemType;
  itemId: string;
  originalData?: any;
  newData?: any;
  timestamp: string;
  synced: boolean;
  rollbackData?: any;
}

interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: string | null;
  syncInProgress: boolean;
  queueLength: number;
  conflictCount: number;
  optimisticUpdateCount: number;
}

interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  dataType: DataItemType;
  itemId: string;
  data?: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

export class RealTimeSyncService {
  private static instance: RealTimeSyncService;
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;
  private syncQueue: SyncQueueItem[] = [];
  private optimisticUpdates: Map<string, OptimisticUpdate> = new Map();
  private changeListeners: Map<string, (notification: ChangeNotification) => void> = new Map();
  private conflictListeners: Map<string, (conflicts: DataConflictWithResolution[]) => void> = new Map();
  private syncStatusListeners: Map<string, (status: SyncStatus) => void> = new Map();
  private lastSyncTime: string | null = null;
  private syncInProgress: boolean = false;

  private constructor() {
    // Initialize browser-specific features only when in browser environment
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      this.initializeEventListeners();
    }
    this.loadPersistedState();
    this.startPeriodicSync();
  }

  public static getInstance(): RealTimeSyncService {
    if (!RealTimeSyncService.instance) {
      RealTimeSyncService.instance = new RealTimeSyncService();
    }
    return RealTimeSyncService.instance;
  }

  /**
   * Initialize event listeners for online/offline status
   */
  private initializeEventListeners(): void {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifySyncStatusListeners();
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifySyncStatusListeners();
    });

    // Listen for visibility changes to sync when app becomes active
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.performSync();
      }
    });
  }

  /**
   * Load persisted state from local storage
   */
  private loadPersistedState(): void {
    this.syncQueue = getData<SyncQueueItem[]>('syncQueue') || [];
    this.lastSyncTime = getData<string>('lastSyncTime');
    
    const optimisticUpdatesArray = getData<OptimisticUpdate[]>('optimisticUpdates') || [];
    this.optimisticUpdates = new Map(optimisticUpdatesArray.map(update => [update.id, update]));
  }

  /**
   * Persist state to local storage
   */
  private persistState(): void {
    saveData('syncQueue' as DataItemType, this.syncQueue);
    saveData('lastSyncTime' as DataItemType, this.lastSyncTime);
    saveData('optimisticUpdates' as DataItemType, Array.from(this.optimisticUpdates.values()));
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.performSync();
      }
    }, 30000);
  }

  /**
   * Stop periodic sync
   */
  public stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Add change listener
   */
  public addChangeListener(id: string, listener: (notification: ChangeNotification) => void): void {
    this.changeListeners.set(id, listener);
  }

  /**
   * Remove change listener
   */
  public removeChangeListener(id: string): void {
    this.changeListeners.delete(id);
  }

  /**
   * Add conflict listener
   */
  public addConflictListener(id: string, listener: (conflicts: DataConflictWithResolution[]) => void): void {
    this.conflictListeners.set(id, listener);
  }

  /**
   * Remove conflict listener
   */
  public removeConflictListener(id: string): void {
    this.conflictListeners.delete(id);
  }

  /**
   * Add sync status listener
   */
  public addSyncStatusListener(id: string, listener: (status: SyncStatus) => void): void {
    this.syncStatusListeners.set(id, listener);
  }

  /**
   * Remove sync status listener
   */
  public removeSyncStatusListener(id: string): void {
    this.syncStatusListeners.delete(id);
  }

  /**
   * Notify change listeners
   */
  private notifyChangeListeners(notification: ChangeNotification): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in change listener:', error);
      }
    });
  }

  /**
   * Notify conflict listeners
   */
  private notifyConflictListeners(conflicts: DataConflictWithResolution[]): void {
    this.conflictListeners.forEach(listener => {
      try {
        listener(conflicts);
      } catch (error) {
        console.error('Error in conflict listener:', error);
      }
    });
  }

  /**
   * Notify sync status listeners
   */
  private notifySyncStatusListeners(): void {
    const status: SyncStatus = {
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress,
      queueLength: this.syncQueue.length,
      conflictCount: this.getUnresolvedConflictCount(),
      optimisticUpdateCount: this.optimisticUpdates.size
    };

    this.syncStatusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in sync status listener:', error);
      }
    });
  }

  /**
   * Get unresolved conflict count
   */
  private getUnresolvedConflictCount(): number {
    const conflicts = getData<DataConflictWithResolution[]>('unresolvedConflicts') || [];
    return conflicts.filter(c => !c.resolution).length;
  }

  /**
   * Perform optimistic update
   */
  public performOptimisticUpdate<T extends { id: string }>(
    operation: 'create' | 'update' | 'delete',
    dataType: DataItemType,
    item: T,
    originalData?: T
  ): string {
    const updateId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const optimisticUpdate: OptimisticUpdate = {
      id: updateId,
      type: operation,
      dataType,
      itemId: item.id,
      originalData,
      newData: item,
      timestamp: new Date().toISOString(),
      synced: false
    };

    // Apply optimistic update to local storage
    const currentData = getData<T[]>(dataType) || [];
    let updatedData: T[];

    switch (operation) {
      case 'create':
        updatedData = [...currentData, item];
        break;
      case 'update':
        updatedData = currentData.map(existing => 
          existing.id === item.id ? item : existing
        );
        break;
      case 'delete':
        updatedData = currentData.filter(existing => existing.id !== item.id);
        optimisticUpdate.rollbackData = originalData;
        break;
      default:
        updatedData = currentData;
    }

    saveData(dataType, updatedData);
    this.optimisticUpdates.set(updateId, optimisticUpdate);

    // Add to sync queue
    this.addToSyncQueue(operation, dataType, item.id, operation !== 'delete' ? item : undefined);

    // Create change notification
    const notification: ChangeNotification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: operation,
      dataType,
      itemId: item.id,
      userId: 'current_user', // Should be replaced with actual user ID
      deviceId: getDeviceManager().getCurrentDeviceId(),
      timestamp: new Date().toISOString(),
      data: item,
      processed: false
    };

    this.notifyChangeListeners(notification);
    this.persistState();
    this.notifySyncStatusListeners();

    // Try to sync immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }

    return updateId;
  }

  /**
   * Add item to sync queue
   */
  private addToSyncQueue(
    operation: 'create' | 'update' | 'delete',
    dataType: DataItemType,
    itemId: string,
    data?: any
  ): void {
    const queueItem: SyncQueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      dataType,
      itemId,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3
    };

    this.syncQueue.push(queueItem);
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    this.notifySyncStatusListeners();

    try {
      const provider = getCloudDatabase().getPreferredProvider();
      if (!provider) {
        console.warn('No cloud provider available for sync');
        return;
      }

      // Process queue items in batches
      const batchSize = 5;
      const batch = this.syncQueue.splice(0, batchSize);

      for (const item of batch) {
        try {
          let result;
          
          switch (item.operation) {
            case 'create':
            case 'update':
              result = await getCloudDatabase().addOrUpdateItem(
                provider,
                item.dataType,
                item.data
              );
              break;
            case 'delete':
              result = await getCloudDatabase().deleteItem(
                provider,
                item.dataType,
                item.itemId
              );
              break;
          }

          if (result?.success) {
            // Mark optimistic update as synced
            const optimisticUpdate = Array.from(this.optimisticUpdates.values())
              .find(update => update.itemId === item.itemId && update.type === item.operation);
            
            if (optimisticUpdate) {
              optimisticUpdate.synced = true;
              this.optimisticUpdates.set(optimisticUpdate.id, optimisticUpdate);
            }

            // Handle conflicts if any
            if (result.conflicts && result.conflicts.length > 0) {
              this.handleConflicts(result.conflicts);
            }
          } else {
            // Retry failed items
            item.retryCount++;
            if (item.retryCount < item.maxRetries) {
              this.syncQueue.push(item);
            } else {
              console.error('Max retries reached for sync item:', item);
              // Rollback optimistic update
              this.rollbackOptimisticUpdate(item.itemId, item.operation);
            }
          }
        } catch (error) {
          console.error('Error processing sync queue item:', error);
          item.retryCount++;
          if (item.retryCount < item.maxRetries) {
            this.syncQueue.push(item);
          } else {
            this.rollbackOptimisticUpdate(item.itemId, item.operation);
          }
        }
      }

      this.lastSyncTime = new Date().toISOString();
      getDeviceManager().updateSyncStatus({
        lastSyncAt: this.lastSyncTime,
        syncInProgress: false,
        lastSyncResult: 'success',
        conflictCount: this.getUnresolvedConflictCount()
      });

    } catch (error) {
      console.error('Error processing sync queue:', error);
      getDeviceManager().updateSyncStatus({
        lastSyncAt: new Date().toISOString(),
        syncInProgress: false,
        lastSyncResult: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.syncInProgress = false;
      this.persistState();
      this.notifySyncStatusListeners();
    }
  }

  /**
   * Rollback optimistic update
   */
  private rollbackOptimisticUpdate(itemId: string, operation: 'create' | 'update' | 'delete'): void {
    const optimisticUpdate = Array.from(this.optimisticUpdates.values())
      .find(update => update.itemId === itemId && update.type === operation);

    if (!optimisticUpdate) {
      return;
    }

    const currentData = getData<any[]>(optimisticUpdate.dataType) || [];
    let rolledBackData: any[];

    switch (operation) {
      case 'create':
        // Remove the optimistically created item
        rolledBackData = currentData.filter(item => item.id !== itemId);
        break;
      case 'update':
        // Restore original data
        if (optimisticUpdate.originalData) {
          rolledBackData = currentData.map(item => 
            item.id === itemId ? optimisticUpdate.originalData : item
          );
        } else {
          rolledBackData = currentData;
        }
        break;
      case 'delete':
        // Restore deleted item
        if (optimisticUpdate.rollbackData) {
          rolledBackData = [...currentData, optimisticUpdate.rollbackData];
        } else {
          rolledBackData = currentData;
        }
        break;
      default:
        rolledBackData = currentData;
    }

    saveData(optimisticUpdate.dataType, rolledBackData);
    this.optimisticUpdates.delete(optimisticUpdate.id);

    // Notify about rollback
    const notification: ChangeNotification = {
      id: `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: operation === 'create' ? 'delete' : operation === 'delete' ? 'create' : 'update',
      dataType: optimisticUpdate.dataType,
      itemId,
      userId: 'current_user',
      deviceId: getDeviceManager().getCurrentDeviceId(),
      timestamp: new Date().toISOString(),
      data: operation === 'delete' ? optimisticUpdate.rollbackData : optimisticUpdate.originalData,
      processed: false
    };

    this.notifyChangeListeners(notification);
  }

  /**
   * Handle conflicts
   */
  private handleConflicts(conflicts: DataConflictWithResolution[]): void {
    // Store unresolved conflicts
    const existingConflicts = getData<DataConflictWithResolution[]>('unresolvedConflicts') || [];
    const newConflicts = conflicts.filter(conflict => !conflict.resolution);
    
    if (newConflicts.length > 0) {
      const updatedConflicts = [...existingConflicts, ...newConflicts];
      saveData('unresolvedConflicts' as DataItemType, updatedConflicts);
      
      // Notify conflict listeners
      this.notifyConflictListeners(newConflicts);
      
      getDeviceManager().updateSyncStatus({
        lastSyncResult: 'conflict',
        conflictCount: updatedConflicts.length
      });
    }
  }

  /**
   * Resolve conflicts
   */
  public async resolveConflicts(
    resolutions: Map<string, ConflictResolution>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await getCloudDatabase().resolveConflicts(
        getData<DataConflictWithResolution[]>('unresolvedConflicts') || [],
        resolutions
      );

      if (result.success) {
        // Clear resolved conflicts
        saveData('unresolvedConflicts' as DataItemType, []);
        this.notifySyncStatusListeners();
      }

      return result;
    } catch (error: any) {
      console.error('Error resolving conflicts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform full sync
   */
  public async performSync(): Promise<{ success: boolean; error?: string }> {
    if (!this.isOnline) {
      return { success: false, error: 'Device is offline' };
    }

    if (this.syncInProgress) {
      return { success: false, error: 'Sync already in progress' };
    }

    try {
      const provider = getCloudDatabase().getPreferredProvider();
      if (!provider) {
        return { success: false, error: 'No cloud provider available' };
      }

      this.syncInProgress = true;
      this.notifySyncStatusListeners();

      const result = await getCloudDatabase().syncWithCloud(provider);
      
      if (result.success) {
        this.lastSyncTime = new Date().toISOString();
        
        // Clear synced optimistic updates
        const syncedUpdates = Array.from(this.optimisticUpdates.values())
          .filter(update => update.synced);
        
        syncedUpdates.forEach(update => {
          this.optimisticUpdates.delete(update.id);
        });

        getDeviceManager().updateSyncStatus({
          lastSyncAt: this.lastSyncTime,
          syncInProgress: false,
          lastSyncResult: 'success',
          conflictCount: result.conflicts?.length || 0
        });

        if (result.conflicts && result.conflicts.length > 0) {
          this.handleConflicts(result.conflicts);
        }
      } else {
        getDeviceManager().updateSyncStatus({
          lastSyncAt: new Date().toISOString(),
          syncInProgress: false,
          lastSyncResult: 'error',
          errorMessage: result.error
        });
      }

      return result;
    } catch (error: any) {
      console.error('Error performing sync:', error);
      getDeviceManager().updateSyncStatus({
        lastSyncAt: new Date().toISOString(),
        syncInProgress: false,
        lastSyncResult: 'error',
        errorMessage: error.message
      });
      return { success: false, error: error.message };
    } finally {
      this.syncInProgress = false;
      this.persistState();
      this.notifySyncStatusListeners();
    }
  }

  /**
   * Get current sync status
   */
  public getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress,
      queueLength: this.syncQueue.length,
      conflictCount: this.getUnresolvedConflictCount(),
      optimisticUpdateCount: this.optimisticUpdates.size
    };
  }

  /**
   * Get pending optimistic updates
   */
  public getPendingOptimisticUpdates(): OptimisticUpdate[] {
    return Array.from(this.optimisticUpdates.values()).filter(update => !update.synced);
  }

  /**
   * Clear all optimistic updates (use with caution)
   */
  public clearOptimisticUpdates(): void {
    this.optimisticUpdates.clear();
    this.persistState();
    this.notifySyncStatusListeners();
  }

  /**
   * Force sync queue processing
   */
  public forceSyncQueueProcessing(): void {
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }
}

// Export singleton instance getter function to avoid SSR issues
export const getRealTimeSync = () => RealTimeSyncService.getInstance();