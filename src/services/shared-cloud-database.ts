// src/services/cloud-database.ts

import { uploadToGoogleDrive, downloadFromGoogleDrive } from './google-drive';
import { uploadToOneDrive, downloadFromOneDrive } from './onedrive';
import { getGoogleTokens, getMicrosoftTokens } from './auth';
import type { 
  Contact, Task, Reminder, Appointment, User, Notification,
  ExcelData, GoogleTokens, MicrosoftTokens, CloudProvider,
  LocalData, DataConflict, DataConflictWithResolution, ConflictResolution
} from '@/lib/types';
import { DataItemType } from '@/lib/types';
import { getData, saveData } from '@/lib/utils';
import { conflictResolutionLog } from './conflict-resolution-log';
import { getAuthInfo } from './auth';
import { getDeviceManager } from './device-management';
import { getRealTimeSync } from './real-time-sync';
import { getRateLimiterService } from './rate-limiter';
import { syncBufferService } from './sync-buffer';
import { v4 as uuidv4 } from 'uuid';

// Shared database filename for all users
const SHARED_DATABASE_FILENAME = 'fincrm-shared-database.json';

/**
 * Represents the shared database structure stored in cloud
 */
export interface SharedDatabase {
  contacts: Contact[];
  tasks: Task[];
  reminders: Reminder[];
  appointments: Appointment[];
  users: User[];
  notifications: Notification[];
  customerData?: ExcelData;
  lastModified: string; // ISO timestamp
  version: number; // For conflict resolution
}

/**
 * Shared cloud database service for multi-user synchronization
 * Enables multiple PIN-authenticated users to sync with the same Google Drive and OneDrive accounts
 * Mandatory cloud sync ensures data consistency across all authenticated local users
 */
export class CloudDatabaseService {
  private static instance: CloudDatabaseService;
  private currentUserId: string | null = null;

  private constructor() {
    // Initialize current user ID from localStorage (only in browser)
    this.currentUserId = typeof window !== 'undefined' ? localStorage.getItem(DataItemType.CurrentUserId) : null;
  }

  public static getInstance(): CloudDatabaseService {
    if (!CloudDatabaseService.instance) {
      CloudDatabaseService.instance = new CloudDatabaseService();
    }
    return CloudDatabaseService.instance;
  }

  /**
   * Set the current user ID
   */
  public setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }

  /**
   * Initialize cloud sync with configuration
   */
  public async initializeCloudSync(config: {
    provider: CloudProvider;
    rateLimitEnabled?: boolean;
    maxRequestsPerMinute?: number;
    maxRequestsPerHour?: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Initializing cloud sync with provider:', config.provider);
      
      // Store cloud sync configuration
      saveData(DataItemType.CloudProvider, config.provider);
      
      // Initialize rate limiter if enabled
      if (config.rateLimitEnabled) {
        const rateLimiter = getRateLimiterService();
        if (config.maxRequestsPerMinute) {
          rateLimiter.setRateLimit('minute', config.maxRequestsPerMinute);
        }
        if (config.maxRequestsPerHour) {
          rateLimiter.setRateLimit('hour', config.maxRequestsPerHour);
        }
      }
      
      // Verify cloud provider authentication
      if (config.provider === 'googledrive') {
        const tokens = getGoogleTokens();
        if (!tokens?.access_token) {
          return { success: false, error: 'Google Drive authentication required' };
        }
      } else if (config.provider === 'onedrive') {
        const tokens = getMicrosoftTokens();
        if (!tokens?.access_token) {
          return { success: false, error: 'OneDrive authentication required' };
        }
      }
      
      console.log('Cloud sync initialized successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error initializing cloud sync:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload shared database to cloud storage
   */
  public async uploadSharedDatabase(
    provider: CloudProvider,
    database: SharedDatabase
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (provider === 'googledrive') {
        const tokens = getGoogleTokens();
        if (!tokens?.access_token) {
          return { success: false, error: 'Google Drive not authenticated' };
        }

        const result = await uploadToGoogleDrive(database as any, tokens);
        return { success: result.success };
      } else if (provider === 'onedrive') {
        const tokens = getMicrosoftTokens();
        if (!tokens?.access_token) {
          return { success: false, error: 'OneDrive not authenticated' };
        }

        await uploadToOneDrive(database as any, {
          accessToken: tokens.access_token,
          provider: 'onedrive'
        });
        return { success: true };
      }

      return { success: false, error: 'Unsupported provider' };
    } catch (error: any) {
      console.error('Error uploading shared database:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Download shared database from cloud storage
   */
  public async downloadSharedDatabase(
    provider: CloudProvider
  ): Promise<{ success: boolean; database?: SharedDatabase; error?: string }> {
    try {
      if (provider === 'googledrive') {
        const tokens = getGoogleTokens();
        if (!tokens?.access_token) {
          return { success: false, error: 'Google Drive not authenticated' };
        }

        const result = await downloadFromGoogleDrive(tokens);
        if (result.data) {
          return { success: true, database: result.data as any };
        }
        return { success: true, database: undefined }; // No file exists yet
      } else if (provider === 'onedrive') {
        const tokens = getMicrosoftTokens();
        if (!tokens?.access_token) {
          return { success: false, error: 'OneDrive not authenticated' };
        }

        const data = await downloadFromOneDrive({
          accessToken: tokens.access_token,
          provider: 'onedrive'
        });
        if (data) {
          return { success: true, database: data as any };
        }
        return { success: true, database: undefined }; // No file exists yet
      }

      return { success: false, error: 'Unsupported provider' };
    } catch (error: any) {
      console.error('Error downloading shared database:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Merge local data with cloud database
   */
  public async mergeLocalDataWithCloud(
    localData: LocalData,
    cloudDatabase?: SharedDatabase,
    manualResolutions?: Map<string, ConflictResolution>
  ): Promise<{ 
    mergedDatabase: SharedDatabase; 
    conflicts: DataConflictWithResolution[] 
  }> {
    const now = new Date().toISOString();
    
    if (!cloudDatabase) {
      // Create new shared database from local data
      return {
        mergedDatabase: {
          contacts: localData.contacts || [],
          tasks: localData.tasks || [],
          reminders: localData.reminders || [],
          appointments: localData.appointments || [],
          users: localData.users || [],
          notifications: localData.notifications || [],
          customerData: localData.customerData,
          lastModified: now,
          version: 1
        },
        conflicts: []
      };
    }

    // Merge data by combining arrays and detecting conflicts
    const allConflicts: DataConflictWithResolution[] = [];
    
    const contactsResult = await this.mergeArraysById(
      cloudDatabase.contacts, 
      localData.contacts || [], 
      DataItemType.Contacts,
      manualResolutions
    );
    allConflicts.push(...contactsResult.conflicts);
    
    const tasksResult = await this.mergeArraysById(
      cloudDatabase.tasks, 
      localData.tasks || [], 
      DataItemType.Tasks,
      manualResolutions
    );
    allConflicts.push(...tasksResult.conflicts);
    
    const remindersResult = await this.mergeArraysById(
      cloudDatabase.reminders, 
      localData.reminders || [], 
      DataItemType.Reminders,
      manualResolutions
    );
    allConflicts.push(...remindersResult.conflicts);
    
    const appointmentsResult = await this.mergeArraysById(
      cloudDatabase.appointments, 
      localData.appointments || [], 
      DataItemType.Appointments,
      manualResolutions
    );
    allConflicts.push(...appointmentsResult.conflicts);
    
    const usersResult = await this.mergeArraysById(
      cloudDatabase.users, 
      localData.users || [], 
      DataItemType.Users,
      manualResolutions
    );
    allConflicts.push(...usersResult.conflicts);
    
    const notificationsResult = await this.mergeArraysById(
      cloudDatabase.notifications, 
      localData.notifications || [], 
      DataItemType.Notifications,
      manualResolutions
    );
    allConflicts.push(...notificationsResult.conflicts);

    const mergedDatabase: SharedDatabase = {
      contacts: contactsResult.mergedData,
      tasks: tasksResult.mergedData,
      reminders: remindersResult.mergedData,
      appointments: appointmentsResult.mergedData,
      users: usersResult.mergedData,
      notifications: notificationsResult.mergedData,
      customerData: localData.customerData || cloudDatabase.customerData,
      lastModified: now,
      version: cloudDatabase.version + 1
    };

    return { mergedDatabase, conflicts: allConflicts };
  }

  /**
   * Merge two arrays by ID with conflict detection and resolution
   */
  private async mergeArraysById<T extends { id: string; updatedAt?: Date | string }>(
    cloudArray: T[],
    localArray: T[],
    dataType: DataItemType,
    manualResolution?: Map<string, ConflictResolution>
  ): Promise<{ 
    mergedData: T[]; 
    conflicts: DataConflictWithResolution[] 
  }> {
    const merged = new Map<string, T>();
    const conflicts: DataConflictWithResolution[] = [];
    const auth = await getAuthInfo();
    const currentUser = auth?.user;

    // Add cloud items first
    cloudArray.forEach(item => {
      merged.set(item.id, item);
    });

    // Add or update with local items (prefer newer based on updatedAt)
    for (const localItem of localArray) {
      const existingItem = merged.get(localItem.id);
      if (!existingItem) {
        merged.set(localItem.id, localItem);
      } else {
        // Check if there's a manual resolution for this item
        const resolution = manualResolution?.get(localItem.id);

        if (resolution) {
          // Apply manual resolution with user precedence
          switch (resolution.action) {
            case 'keep_local':
              merged.set(localItem.id, localItem);
              // Log the manual resolution
              if (currentUser) {
                await conflictResolutionLog.addEntry({
                  userId: currentUser.id,
                  userName: currentUser.name || currentUser.email || 'Unknown User',
                  dataType,
                  itemId: localItem.id,
                  action: 'user_choice',
                  conflictDetails: {
                    localVersion: localItem,
                    cloudVersion: existingItem,
                    resolvedVersion: localItem,
                    resolutionReason: resolution.reason || 'User chose local version'
                  },
                  description: `User chose to keep local version of ${dataType} item ${localItem.id}`
                });
              }
              break;
              
            case 'keep_cloud':
              // Keep existing cloud version (already in map)
              if (currentUser) {
                await conflictResolutionLog.addEntry({
                  userId: currentUser.id,
                  userName: currentUser.name || currentUser.email || 'Unknown User',
                  dataType,
                  itemId: localItem.id,
                  action: 'user_choice',
                  conflictDetails: {
                    localVersion: localItem,
                    cloudVersion: existingItem,
                    resolvedVersion: existingItem,
                    resolutionReason: resolution.reason || 'User chose cloud version'
                  },
                  description: `User chose to keep cloud version of ${dataType} item ${localItem.id}`
                });
              }
              break;
              
            case 'merge_manual':
              // Use manually merged data
              if (resolution.mergedData) {
                merged.set(localItem.id, {
                  ...resolution.mergedData,
                  updatedAt: new Date().toISOString() // Update timestamp
                } as T);
                // Log the manual resolution
                if (currentUser) {
                  await conflictResolutionLog.addEntry({
                    userId: currentUser.id,
                    userName: currentUser.name || currentUser.email || 'Unknown User',
                    dataType,
                    itemId: localItem.id,
                    action: 'manual_override',
                    conflictDetails: {
                      localVersion: localItem,
                      cloudVersion: existingItem,
                      resolvedVersion: resolution.mergedData,
                      resolutionReason: resolution.reason || 'User manually merged versions'
                    },
                    description: `User manually merged versions of ${dataType} item ${localItem.id}`
                  });
                }
              }
              break;
              
            case 'skip':
              // Skip this conflict for now
              conflicts.push({
                itemId: localItem.id,
                localVersion: localItem,
                cloudVersion: existingItem,
                dataType,
                resolution: resolution
              });
              break;
          }
        } else {
          // Compare updatedAt timestamps to determine which is newer
          const existingTime = existingItem.updatedAt && existingItem.updatedAt.trim() !== '' ? new Date(existingItem.updatedAt).getTime() : 0;
          const localTime = localItem.updatedAt && localItem.updatedAt.trim() !== '' ? new Date(localItem.updatedAt).getTime() : 0;
          
          if (localTime > existingTime) {
            merged.set(localItem.id, localItem);
          } else if (localTime < existingTime) {
            // Keep existing cloud version (already in map)
          } else {
            // Same timestamp, check if content is different
            const localStr = JSON.stringify(localItem);
            const cloudStr = JSON.stringify(existingItem);
            
            if (localStr !== cloudStr) {
              // Content differs despite same timestamp, add to conflicts
              conflicts.push({
                itemId: localItem.id,
                localVersion: localItem,
                cloudVersion: existingItem,
                dataType
              });
            }
            // If identical, keep cloud version (already in map)
          }
        }
      }
    }

    return { 
      mergedData: Array.from(merged.values()),
      conflicts 
    };
  }

  /**
   * Sync local data with cloud database
   */
  public async syncWithCloud(
    provider: CloudProvider,
    manualResolutions?: Map<string, ConflictResolution>,
    deviceId?: string
  ): Promise<{ 
    success: boolean; 
    error?: string;
    conflicts: DataConflictWithResolution[]
  }> {
    try {
      console.log('Starting cloud sync...');
      
      // Use rate limiter for cloud sync operations
      return await getRateLimiterService().executeRequest(async () => {
        // Register device if not already registered
        if (deviceId) {
          const deviceResult = await getDeviceManager().registerCurrentDevice();
          if (!deviceResult.success) {
            console.warn('Device registration failed:', deviceResult.error);
          }
        }
        
        // Get current local data
        const localData: LocalData = {
          contacts: getData<Contact[]>(DataItemType.Contacts),
          tasks: getData<Task[]>(DataItemType.Tasks),
          reminders: getData<Reminder[]>(DataItemType.Reminders),
          appointments: getData<Appointment[]>(DataItemType.Appointments),
          users: getData<User[]>(DataItemType.Users),
          notifications: getData<Notification[]>(DataItemType.Notifications),
          customerData: getData<ExcelData>(DataItemType.CustomerData)
        };

        // Download current cloud database
        const downloadResult = await this.downloadSharedDatabase(provider);
        if (!downloadResult.success) {
          return { success: false, error: downloadResult.error, conflicts: [] };
        }

        // Merge local and cloud data
        const mergeResult = await this.mergeLocalDataWithCloud(localData, downloadResult.database, manualResolutions);

        // Upload merged database back to cloud
        const uploadResult = await this.uploadSharedDatabase(provider, mergeResult.mergedDatabase);
        if (!uploadResult.success) {
          return { success: false, error: uploadResult.error, conflicts: mergeResult.conflicts };
        }

        // Update local storage with merged data
        this.updateLocalStorageFromDatabase(mergeResult.mergedDatabase);

        // Update last sync time
        saveData(DataItemType.LastSyncTime, new Date().toISOString());
        
        // Notify real-time sync service of successful sync
        if (realTimeSync) {
          getRealTimeSync().onSyncComplete(true);
        }
        
        console.log('Cloud sync completed successfully');
        return { success: true, conflicts: mergeResult.conflicts };
      }, 'high'); // High priority for sync operations
    } catch (error: any) {
      console.error('Error syncing with cloud:', error);
      
      // Notify real-time sync service of failed sync
      if (realTimeSync) {
        getRealTimeSync().onSyncComplete(false, error.message);
      }
      
      return { success: false, error: error.message, conflicts: [] };
    }
  }

  /**
   * Update local storage with data from shared database
   */
  private updateLocalStorageFromDatabase(database: SharedDatabase): void {
    saveData(DataItemType.Contacts, database.contacts);
    saveData(DataItemType.Tasks, database.tasks);
    saveData(DataItemType.Reminders, database.reminders);
    saveData(DataItemType.Appointments, database.appointments);
    saveData(DataItemType.Users, database.users);
    saveData(DataItemType.Notifications, database.notifications);
    
    if (database.customerData) {
      saveData(DataItemType.CustomerData, database.customerData);
    }
  }

  /**
   * Add or update an item in the shared database
   */
  public async addOrUpdateItem<T extends { id: string; updatedAt?: Date | string }>(
    provider: CloudProvider,
    dataType: DataItemType,
    item: T,
    manualResolutions?: Map<string, ConflictResolution>
  ): Promise<{ 
    success: boolean; 
    error?: string;
    conflicts: DataConflictWithResolution[]
  }> {
    try {
      // Set updatedAt timestamp
      const updatedItem = {
        ...item,
        updatedAt: new Date().toISOString()
      };

      // Update local storage first
      const currentData = getData<T[]>(dataType) || [];
      const existingIndex = currentData.findIndex(existing => existing.id === item.id);
      
      if (existingIndex >= 0) {
        currentData[existingIndex] = updatedItem;
      } else {
        currentData.push(updatedItem);
      }
      
      saveData(dataType, currentData);

      // Sync with cloud
      return await this.syncWithCloud(provider, manualResolutions);
    } catch (error: any) {
      console.error('Error adding/updating item:', error);
      return { success: false, error: error.message, conflicts: [] };
    }
  }

  /**
   * Delete an item from the shared database
   */
  public async deleteItem(
    provider: CloudProvider,
    dataType: DataItemType,
    itemId: string,
    manualResolutions?: Map<string, ConflictResolution>
  ): Promise<{ 
    success: boolean; 
    error?: string;
    conflicts: DataConflictWithResolution[]
  }> {
    try {
      // Update local storage first
      const currentData = getData<any[]>(dataType) || [];
      const filteredData = currentData.filter(item => item.id !== itemId);
      saveData(dataType, filteredData);

      // Sync with cloud
      return await this.syncWithCloud(provider, manualResolutions);
    } catch (error: any) {
      console.error('Error deleting item:', error);
      return { success: false, error: error.message, conflicts: [] };
    }
  }

  /**
   * Get the preferred cloud provider for the current user
   */
  public getPreferredProvider(): CloudProvider | null {
    const googleTokens = getGoogleTokens();
    const microsoftTokens = getMicrosoftTokens();

    if (googleTokens?.access_token) {
      return 'googledrive';
    } else if (microsoftTokens?.access_token) {
      return 'onedrive';
    }

    return null;
  }

  /**
   * Resolve conflicts manually
   */
  public async resolveConflicts(
    conflicts: DataConflictWithResolution[],
    resolutions: Map<string, ConflictResolution>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const provider = this.getPreferredProvider();
      if (!provider) {
        return { success: false, error: 'No cloud provider available for conflict resolution' };
      }

      // Apply resolutions and sync
      const result = await this.syncWithCloud(provider, resolutions);
      
      // Check if all conflicts were resolved
      if (result.conflicts.length > 0) {
        console.warn('Some conflicts remain unresolved:', result.conflicts.length);
      }
      
      // Notify real-time sync service of conflict resolutions
      if (realTimeSync) {
        getRealTimeSync().onConflictsResolved(conflicts);
      }
      
      return { success: result.success, error: result.error };
    } catch (error: any) {
      console.error('Failed to resolve conflicts:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Perform optimistic update for real-time sync integration
   */
  public async performOptimisticUpdate(
    itemType: DataItemType, 
    itemId: string, 
    data: any, 
    operation: 'create' | 'update' | 'delete'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Apply change locally first (optimistic update)
      const currentData = getData<any[]>(itemType) || [];
      
      switch (operation) {
        case 'create':
        case 'update':
          const existingIndex = currentData.findIndex(item => item.id === itemId);
          if (existingIndex >= 0) {
            currentData[existingIndex] = { ...data, updatedAt: new Date().toISOString() };
          } else {
            currentData.push({ ...data, updatedAt: new Date().toISOString() });
          }
          saveData(itemType, currentData);
          break;
        case 'delete':
          const filteredData = currentData.filter(item => item.id !== itemId);
          saveData(itemType, filteredData);
          break;
      }
      
      // Queue for cloud sync with rate limiting
      if (realTimeSync) {
        await getRateLimiterService().executeRequest(async () => {
          await getRealTimeSync().queueChange({
            id: uuidv4(),
            itemType: itemType,
            itemId,
            operation,
            data,
            timestamp: new Date().toISOString(),
            deviceId: await getDeviceManager().getCurrentDeviceId(),
            userId: this.getCurrentUserId()
          });
        }, 'medium');
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error performing optimistic update:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get current user ID
   */
  private getCurrentUserId(): string {
    const currentUser = getData<any>('currentUser');
    return currentUser?.id || 'unknown';
  }
  
  /**
   * Get device-specific sync metadata
   */
  public async getDeviceSyncMetadata(deviceId: string): Promise<{ lastSyncTime: string | null; syncVersion: number }> {
    try {
      const metadata = getData<any>(`deviceSync_${deviceId}`);
      if (metadata) {
        return metadata;
      }
      return { lastSyncTime: null, syncVersion: 0 };
    } catch (error: any) {
      console.error('Error getting device sync metadata:', error);
      return { lastSyncTime: null, syncVersion: 0 };
    }
  }
  
  /**
   * Update device-specific sync metadata
   */
  public async updateDeviceSyncMetadata(deviceId: string, lastSyncTime: string, syncVersion: number): Promise<void> {
    try {
      const metadata = { lastSyncTime, syncVersion };
      saveData(`deviceSync_${deviceId}`, metadata);
    } catch (error: any) {
      console.error('Error updating device sync metadata:', error);
    }
  }
  
  /**
   * Get changes since last sync for a specific device
   */
  public async getChangesSinceLastSync(deviceId: string, lastSyncTime: string): Promise<any[]> {
    try {
      // This would typically query a change log or compare timestamps
      // For now, we'll return an empty array as this would need to be implemented
      // based on how change tracking is implemented in the cloud storage
      return [];
    } catch (error: any) {
      console.error('Error getting changes since last sync:', error);
      return [];
    }
  }

  /**
   * Sync local data to cloud storage
   */
  public async syncToCloud(provider: 'googledrive' | 'onedrive'): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[CloudDatabase] Starting sync to ${provider}`);
      
      // Get all local data
      const allData = {
        users: getData<any[]>(DataItemType.Users) || [],
        contacts: getData<any[]>(DataItemType.Contacts) || [],
        tasks: getData<any[]>(DataItemType.Tasks) || [],
        reminders: getData<any[]>(DataItemType.Reminders) || [],
        appointments: getData<any[]>(DataItemType.Appointments) || [],
        userPreferences: getData<any>(DataItemType.UserThemePreferences) || {},
        currentUserId: getData<string>(DataItemType.CurrentUserId) || null,
        lastSyncTime: new Date().toISOString(),
        deviceId: this.getCurrentUserId()
      };

      // Upload to cloud
      const result = await this.uploadSharedDatabase(provider, allData as any);
      
      if (result.success) {
        console.log(`[CloudDatabase] Successfully synced to ${provider}`);
        // Update last sync time
        saveData(`lastSyncTime_${provider}`, new Date().toISOString());
      } else {
        console.error(`[CloudDatabase] Failed to sync to ${provider}:`, result.error);
      }
      
      return result;
    } catch (error: any) {
      console.error(`[CloudDatabase] Error syncing to ${provider}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync data from cloud storage to local storage
   */
  public async syncFromCloud(provider: CloudProvider): Promise<{ success: boolean; error?: string }> {
    try {
      // Download shared database from cloud
      const downloadResult = await this.downloadSharedDatabase(provider);
      if (!downloadResult.success) {
        return { success: false, error: downloadResult.error };
      }

      // If no cloud database exists, nothing to sync
      if (!downloadResult.database) {
        return { success: true };
      }

      // Get current local data
      const localData: LocalData = {
        contacts: getData<Contact[]>(DataItemType.Contacts) || [],
        tasks: getData<Task[]>(DataItemType.Tasks) || [],
        reminders: getData<Reminder[]>(DataItemType.Reminders) || [],
        appointments: getData<Appointment[]>(DataItemType.Appointments) || [],
        users: getData<User[]>(DataItemType.Users) || [],
        notifications: getData<Notification[]>(DataItemType.Notifications) || [],
        customerData: getData<ExcelData>(DataItemType.CustomerData)
      };

      // Merge cloud data with local data
      const mergeResult = await this.mergeLocalDataWithCloud(localData, downloadResult.database);

      // Save merged data to local storage
      saveData(DataItemType.Contacts, mergeResult.mergedDatabase.contacts);
      saveData(DataItemType.Tasks, mergeResult.mergedDatabase.tasks);
      saveData(DataItemType.Reminders, mergeResult.mergedDatabase.reminders);
      saveData(DataItemType.Appointments, mergeResult.mergedDatabase.appointments);
      saveData(DataItemType.Users, mergeResult.mergedDatabase.users);
      saveData(DataItemType.Notifications, mergeResult.mergedDatabase.notifications);
      if (mergeResult.mergedDatabase.customerData) {
        saveData(DataItemType.CustomerData, mergeResult.mergedDatabase.customerData);
      }

      // Log any conflicts that were resolved
      if (mergeResult.conflicts.length > 0) {
        console.log(`Resolved ${mergeResult.conflicts.length} conflicts during sync from ${provider}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error(`Error syncing from cloud (${provider}):`, error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance getter function to avoid SSR issues
export const getCloudDatabase = () => CloudDatabaseService.getInstance();