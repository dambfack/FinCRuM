// src/services/cloud-database.ts

import { uploadToGoogleDrive, downloadFromGoogleDrive } from './google-drive';
import { uploadToOneDrive, downloadFromOneDrive } from './onedrive';
import { getGoogleTokens, getMicrosoftTokens } from './auth';
import type { 
  Contact, Task, Reminder, Appointment, User, Notification,
  ExcelData, GoogleTokens, MicrosoftTokens, CloudProvider,
  LocalData, DataItemType, DataConflict, DataConflictWithResolution, ConflictResolution
} from '@/lib/types';
import { getData, saveData } from '@/lib/utils';
import { conflictResolutionLog } from './conflict-resolution-log';
import { getAuth } from './auth';

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
 * Cloud database service for managing shared data across users
 * Supports manual conflict resolution with user precedence
 */
export class CloudDatabaseService {
  private static instance: CloudDatabaseService;
  private currentUserId: string | null = null;

  private constructor() {
    // Initialize current user ID from localStorage
    this.currentUserId = localStorage.getItem(DataItemType.CurrentUserId);
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
    const auth = getAuth();
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
          const existingTime = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
          const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
          
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
    manualResolutions?: Map<string, ConflictResolution>
  ): Promise<{ 
    success: boolean; 
    error?: string;
    conflicts: DataConflictWithResolution[]
  }> {
    try {
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

      return { success: true, conflicts: mergeResult.conflicts };
    } catch (error: any) {
      console.error('Error syncing with cloud:', error);
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
      
      return { success: result.success, error: result.error };
    } catch (error: any) {
      console.error('Failed to resolve conflicts:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const cloudDatabase = CloudDatabaseService.getInstance();