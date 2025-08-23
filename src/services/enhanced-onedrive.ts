import { oneDriveService } from './onedrive-service';
import { authenticateWithOneDrive, OneDriveAuthInfo } from './onedrive';
import { getDeviceManager } from './device-management';
import { getRealTimeSync } from './real-time-sync';
import { LocalData, User, SyncConflictDetails, ConflictTrackingResult, DataItemType, UserAccountSyncData, CloudAuthInfo } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { userAccountSyncService } from './user-account-sync';

/**
 * Enhanced OneDrive service for multi-user shared access
 * with folder-based organization and permission management
 */
export class EnhancedOneDriveService {
  private readonly SHARED_FOLDER_NAME = 'FinsculptCRM_doNotDelete';
  private readonly USER_FOLDER_PREFIX = 'User_';
  private readonly BACKUP_FOLDER_NAME = 'Backups';
  private readonly VERSION_FOLDER_NAME = 'Versions';
  private readonly USER_ACCOUNTS_FILE_NAME = 'user_accounts_sync.encrypted.json';
  private readonly DEVICE_REGISTRY_FILE_NAME = 'device_registry.encrypted.json';
  
  private sharedFolderId: string | null = null;
  private userFolderIds: Map<string, string> = new Map();
  private backupFolderId: string | null = null;
  private versionFolderId: string | null = null;
  private isAuthenticated: boolean = false;

  /**
   * Initialize OneDrive authentication
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.isAuthenticated) {
      try {
        const authInfo = await authenticateWithOneDrive();
        oneDriveService.setAuthInfo(authInfo);
        this.isAuthenticated = true;
      } catch (error) {
        console.warn('OneDrive authentication not available:', error);
        throw new Error('OneDrive authentication required');
      }
    }
  }

  /**
   * Initialize folder structure for multi-user access
   */
  async initializeFolderStructure(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensureAuthenticated();
      
      // Create or find shared folder
      const sharedFolderResult = await this.ensureSharedFolder();
      if (!sharedFolderResult.success) {
        return sharedFolderResult;
      }

      // Create backup and version folders
      await this.ensureBackupFolder();
      await this.ensureVersionFolder();

      return { success: true };
    } catch (error) {
      console.error('Error initializing folder structure:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Ensure shared folder exists
   */
  private async ensureSharedFolder(): Promise<{ success: boolean; error?: string; folderId?: string }> {
    try {
      // Check if shared folder already exists
      const existingFolders = await oneDriveService.searchFiles(this.SHARED_FOLDER_NAME);

      if (existingFolders.success && existingFolders.folders && existingFolders.folders.length > 0) {
        const sharedFolder = existingFolders.folders.find(f => f.name === this.SHARED_FOLDER_NAME);
        if (sharedFolder) {
          this.sharedFolderId = sharedFolder.id;
          return { success: true, folderId: this.sharedFolderId };
        }
      }

      // Create shared folder
      const createResult = await oneDriveService.createFolder(this.SHARED_FOLDER_NAME);
      if (createResult.success && createResult.folderId) {
        this.sharedFolderId = createResult.folderId;
        
        // Set folder permissions for sharing
        await this.setFolderPermissions(this.sharedFolderId);
        
        return { success: true, folderId: this.sharedFolderId };
      }

      return { success: false, error: 'Failed to create shared folder' };
    } catch (error) {
      console.error('Error ensuring shared folder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Ensure backup folder exists
   */
  private async ensureBackupFolder(): Promise<void> {
    try {
      if (!this.sharedFolderId) return;

      const existingFolders = await oneDriveService.searchFiles(this.BACKUP_FOLDER_NAME, this.sharedFolderId);

      if (existingFolders.success && existingFolders.folders && existingFolders.folders.length > 0) {
        const backupFolder = existingFolders.folders.find(f => f.name === this.BACKUP_FOLDER_NAME);
        if (backupFolder) {
          this.backupFolderId = backupFolder.id;
          return;
        }
      }

      const createResult = await oneDriveService.createFolder(this.BACKUP_FOLDER_NAME, this.sharedFolderId);
      if (createResult.success && createResult.folderId) {
        this.backupFolderId = createResult.folderId;
      }
    } catch (error) {
      console.error('Error ensuring backup folder:', error);
    }
  }

  /**
   * Ensure version folder exists
   */
  private async ensureVersionFolder(): Promise<void> {
    try {
      if (!this.sharedFolderId) return;

      const existingFolders = await oneDriveService.searchFiles(this.VERSION_FOLDER_NAME, this.sharedFolderId);

      if (existingFolders.success && existingFolders.folders && existingFolders.folders.length > 0) {
        const versionFolder = existingFolders.folders.find(f => f.name === this.VERSION_FOLDER_NAME);
        if (versionFolder) {
          this.versionFolderId = versionFolder.id;
          return;
        }
      }

      const createResult = await oneDriveService.createFolder(this.VERSION_FOLDER_NAME, this.sharedFolderId);
      if (createResult.success && createResult.folderId) {
        this.versionFolderId = createResult.folderId;
      }
    } catch (error) {
      console.error('Error ensuring version folder:', error);
    }
  }

  /**
   * Get or create user-specific folder
   */
  async ensureUserFolder(userId: string, userName: string): Promise<{ success: boolean; folderId?: string; error?: string }> {
    try {
      if (!this.sharedFolderId) {
        const initResult = await this.initializeFolderStructure();
        if (!initResult.success) {
          return initResult;
        }
      }

      // Check if user folder already exists
      if (this.userFolderIds.has(userId)) {
        return { success: true, folderId: this.userFolderIds.get(userId) };
      }

      const folderName = `${this.USER_FOLDER_PREFIX}${userName}_${userId.substring(0, 8)}`;
      
      // Search for existing user folder
      const existingFolders = await oneDriveService.searchFiles(folderName, this.sharedFolderId);

      if (existingFolders.success && existingFolders.folders && existingFolders.folders.length > 0) {
        const userFolder = existingFolders.folders.find(f => f.name === folderName);
        if (userFolder) {
          this.userFolderIds.set(userId, userFolder.id);
          return { success: true, folderId: userFolder.id };
        }
      }

      // Create user folder
      const createResult = await oneDriveService.createFolder(folderName, this.sharedFolderId);
      if (createResult.success && createResult.folderId) {
        this.userFolderIds.set(userId, createResult.folderId);
        return { success: true, folderId: createResult.folderId };
      }

      return { success: false, error: 'Failed to create user folder' };
    } catch (error) {
      console.error('Error ensuring user folder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set folder permissions for sharing
   */
  private async setFolderPermissions(folderId: string): Promise<void> {
    try {
      // This would typically involve setting up sharing permissions
      // For now, we'll just log the action
      console.log(`Setting permissions for folder: ${folderId}`);
      
      // In a real implementation, you would:
      // 1. Set folder to be shareable with specific users
      // 2. Configure read/write permissions based on user roles
      // 3. Set up notification preferences
    } catch (error) {
      console.error('Error setting folder permissions:', error);
    }
  }

  /**
   * Upload data to user-specific folder
   */
  async uploadUserData(userId: string, userName: string, data: LocalData, tokens?: any): Promise<{ success: boolean; error?: string }> {
    try {
      const userFolderResult = await this.ensureUserFolder(userId, userName);
      if (!userFolderResult.success || !userFolderResult.folderId) {
        return { success: false, error: 'Failed to access user folder' };
      }

      const fileName = `fincrm_data_${new Date().toISOString().split('T')[0]}.json`;
      const content = JSON.stringify(data, null, 2);

      const uploadResult = await oneDriveService.uploadFile(
        fileName,
        content,
        userFolderResult.folderId
      );

      if (uploadResult.success) {
        // Create version backup
        await this.createVersionBackup(userId, userName, data);
      }

      return uploadResult;
    } catch (error) {
      console.error('Error uploading user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Download data from user-specific folder
   */
  async downloadUserData(userId: string, userName: string, tokens?: any): Promise<{ success: boolean; data?: LocalData; error?: string }> {
    try {
      const userFolderResult = await this.ensureUserFolder(userId, userName);
      if (!userFolderResult.success || !userFolderResult.folderId) {
        return { success: false, error: 'Failed to access user folder' };
      }

      // Find the most recent data file
      const filesResult = await oneDriveService.searchFiles('fincrm_data_', userFolderResult.folderId);

      if (!filesResult.success || !filesResult.files || filesResult.files.length === 0) {
        return { success: false, error: 'No data files found' };
      }

      // Filter for JSON files and sort by creation time
      const dataFiles = filesResult.files.filter(f => 
        f.name && f.name.includes('fincrm_data_') && f.name.endsWith('.json')
      );

      if (dataFiles.length === 0) {
        return { success: false, error: 'No data files found' };
      }

      // Sort by modification time and get the most recent
      const sortedFiles = dataFiles.sort((a, b) => 
        new Date(b.lastModifiedDateTime || '').getTime() - new Date(a.lastModifiedDateTime || '').getTime()
      );

      const downloadResult = await oneDriveService.downloadFile(sortedFiles[0].id);
      if (!downloadResult.success || !downloadResult.content) {
        return { success: false, error: 'Failed to download data file' };
      }

      try {
        const data = JSON.parse(downloadResult.content) as LocalData;
        return { success: true, data };
      } catch (parseError) {
        return { success: false, error: 'Invalid data format' };
      }
    } catch (error) {
      console.error('Error downloading user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create version backup
   */
  private async createVersionBackup(userId: string, userName: string, data: LocalData): Promise<void> {
    try {
      if (!this.versionFolderId) return;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${userName}_${userId.substring(0, 8)}_${timestamp}.json`;
      const content = JSON.stringify(data, null, 2);

      await oneDriveService.uploadFile(
        fileName,
        content,
        this.versionFolderId
      );

      // Clean up old versions (keep only last 10)
      await this.cleanupOldVersions(userId, userName);
    } catch (error) {
      console.error('Error creating version backup:', error);
    }
  }

  /**
   * Clean up old version backups
   */
  private async cleanupOldVersions(userId: string, userName: string): Promise<void> {
    try {
      if (!this.versionFolderId) return;

      const userPrefix = `${userName}_${userId.substring(0, 8)}_`;
      const filesResult = await oneDriveService.searchFiles(userPrefix, this.versionFolderId);

      if (!filesResult.success || !filesResult.files || filesResult.files.length <= 10) {
        return;
      }

      // Filter for user's version files
      const userVersionFiles = filesResult.files.filter(f => 
        f.name && f.name.startsWith(userPrefix)
      );

      if (userVersionFiles.length <= 10) {
        return;
      }

      // Sort by modification time and delete oldest files
      const sortedFiles = userVersionFiles.sort((a, b) => 
        new Date(a.lastModifiedDateTime || '').getTime() - new Date(b.lastModifiedDateTime || '').getTime()
      );

      const filesToDelete = sortedFiles.slice(0, sortedFiles.length - 10);
      for (const file of filesToDelete) {
        if (file.id) {
          await oneDriveService.deleteFile(file.id);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old versions:', error);
    }
  }

  /**
   * Create full backup
   */
  async createFullBackup(allUsersData: Map<string, { user: User; data: LocalData }>, tokens?: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.backupFolderId) {
        await this.ensureBackupFolder();
      }

      if (!this.backupFolderId) {
        return { success: false, error: 'Backup folder not available' };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `full_backup_${timestamp}.json`;
      
      const backupData = {
        timestamp: new Date().toISOString(),
        users: Array.from(allUsersData.entries()).map(([userId, { user, data }]) => ({
          userId,
          user,
          data
        }))
      };

      const content = JSON.stringify(backupData, null, 2);

      const uploadResult = await oneDriveService.uploadFile(
        fileName,
        content,
        this.backupFolderId
      );

      if (uploadResult.success) {
        // Clean up old backups (keep only last 5 full backups)
        await this.cleanupOldBackups();
      }

      return uploadResult;
    } catch (error) {
      console.error('Error creating full backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clean up old full backups
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      if (!this.backupFolderId) return;

      const filesResult = await oneDriveService.searchFiles('full_backup_', this.backupFolderId);

      if (!filesResult.success || !filesResult.files || filesResult.files.length <= 5) {
        return;
      }

      // Filter for backup files
      const backupFiles = filesResult.files.filter(f => 
        f.name && f.name.startsWith('full_backup_')
      );

      if (backupFiles.length <= 5) {
        return;
      }

      // Sort by modification time and delete oldest files
      const sortedFiles = backupFiles.sort((a, b) => 
        new Date(a.lastModifiedDateTime || '').getTime() - new Date(b.lastModifiedDateTime || '').getTime()
      );

      const filesToDelete = sortedFiles.slice(0, sortedFiles.length - 5);
      for (const file of filesToDelete) {
        if (file.id) {
          await oneDriveService.deleteFile(file.id);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  /**
   * Get shared access permissions for a user
   */
  async getUserPermissions(userId: string): Promise<{ canRead: boolean; canWrite: boolean; canShare: boolean }> {
    try {
      // This would typically check the user's role and permissions
      // For now, we'll return default permissions based on user role
      
      // In a real implementation, you would:
      // 1. Check user's role from the database
      // 2. Query OneDrive permissions for the shared folder
      // 3. Return appropriate permissions
      
      return {
        canRead: true,
        canWrite: true,
        canShare: false // Only admins can share by default
      };
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return {
        canRead: false,
        canWrite: false,
        canShare: false
      };
    }
  }

  /**
   * List all user folders
   */
  async listUserFolders(tokens?: any): Promise<{ success: boolean; folders?: Array<{ id: string; name: string; userId: string }>; error?: string }> {
    try {
      if (!this.sharedFolderId) {
        const initResult = await this.initializeFolderStructure();
        if (!initResult.success) {
          return { success: false, error: 'Failed to initialize folder structure' };
        }
      }

      const foldersResult = await oneDriveService.searchFiles(this.USER_FOLDER_PREFIX, this.sharedFolderId);

      if (!foldersResult.success || !foldersResult.folders) {
        return { success: false, error: 'Failed to list user folders' };
      }

      // Filter for user folders
      const userFolders = foldersResult.folders.filter(f => 
        f.name && f.name.startsWith(this.USER_FOLDER_PREFIX)
      );

      const folders = userFolders.map(folder => {
        const name = folder.name || '';
        const userIdMatch = name.match(/_([a-f0-9]{8})$/);
        const userId = userIdMatch ? userIdMatch[1] : '';
        
        return {
          id: folder.id,
          name,
          userId
        };
      });

      return { success: true, folders };
    } catch (error) {
      console.error('Error listing user folders:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sync user data with conflict resolution
   */
  async syncUserDataWithConflictResolution(
    userId: string, 
    userName: string, 
    localData: LocalData,
    tokens?: any
  ): Promise<{ success: boolean; data?: LocalData; conflicts?: SyncConflictDetails[]; error?: string }> {
    try {
      // Download current cloud data
      const downloadResult = await this.downloadUserData(userId, userName, tokens);
      
      if (!downloadResult.success) {
        // No cloud data exists, upload local data
        const uploadResult = await this.uploadUserData(userId, userName, localData, tokens);
        return {
          success: uploadResult.success,
          data: localData,
          conflicts: [],
          error: uploadResult.error
        };
      }

      const cloudData = downloadResult.data!;
      const conflictTracker: SyncConflictDetails[] = [];
      
      // Merge arrays with detailed conflict tracking
      const mergedData: LocalData = {
        contacts: this.mergeArraysWithConflictTracking(
          localData.contacts || [], 
          cloudData.contacts || [], 
          'id', 
          DataItemType.Contacts, 
          userId, 
          conflictTracker
        ),
        tasks: this.mergeArraysWithConflictTracking(
          localData.tasks || [], 
          cloudData.tasks || [], 
          'id', 
          DataItemType.Tasks, 
          userId, 
          conflictTracker
        ),
        reminders: this.mergeArraysWithConflictTracking(
          localData.reminders || [], 
          cloudData.reminders || [], 
          'id', 
          DataItemType.Reminders, 
          userId, 
          conflictTracker
        ),
        appointments: this.mergeArraysWithConflictTracking(
          localData.appointments || [], 
          cloudData.appointments || [], 
          'id', 
          DataItemType.Appointments, 
          userId, 
          conflictTracker
        ),
        users: this.mergeArraysWithConflictTracking(
          localData.users || [], 
          cloudData.users || [], 
          'id', 
          DataItemType.Users, 
          userId, 
          conflictTracker
        ),
        lastSyncTime: Math.max(
          new Date(localData.lastSyncTime || 0).getTime(),
          new Date(cloudData.lastSyncTime || 0).getTime()
        ).toString()
      };

      // Upload merged data
      const uploadResult = await this.uploadUserData(userId, userName, mergedData, tokens);
      
      return {
        success: uploadResult.success,
        data: mergedData,
        conflicts: conflictTracker,
        error: uploadResult.error
      };
    } catch (error) {
      console.error('Error syncing user data with conflict resolution:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Merge arrays with detailed conflict tracking
   */
  private mergeArraysWithConflictTracking<T extends { id: string; lastModified?: string }>(
    local: T[], 
    cloud: T[], 
    idField: keyof T, 
    dataType: DataItemType, 
    userId: string, 
    conflictTracker: SyncConflictDetails[]
  ): T[] {
    const merged = new Map<string, T>();
    const deviceManager = getDeviceManager();
    const deviceId = deviceManager.getCurrentDeviceId();
    
    // Add cloud items first
    cloud.forEach(item => {
      merged.set(item[idField] as string, item);
    });
    
    // Add or update with local items and track conflicts
    local.forEach(localItem => {
      const id = localItem[idField] as string;
      const cloudItem = merged.get(id);
      
      if (!cloudItem) {
        // No conflict - local item doesn't exist in cloud
        merged.set(id, localItem);
      } else {
        // Potential conflict - compare timestamps and content
        const localTime = localItem.lastModified && localItem.lastModified.trim() !== '' ? new Date(localItem.lastModified).getTime() : 0;
        const cloudTime = cloudItem.lastModified && cloudItem.lastModified.trim() !== '' ? new Date(cloudItem.lastModified).getTime() : 0;
        
        // Check for content differences
        const hasContentDifference = JSON.stringify(localItem) !== JSON.stringify(cloudItem);
        
        if (hasContentDifference) {
          let conflictType: SyncConflictDetails['conflictType'];
          let resolutionMethod: SyncConflictDetails['resolutionMethod'];
          let resolutionReason: string;
          let resolvedItem: T;
          
          if (localTime > cloudTime) {
            conflictType = 'timestamp_mismatch';
            resolutionMethod = 'local_wins';
            resolutionReason = `Local version is newer (${new Date(localTime).toISOString()} > ${new Date(cloudTime).toISOString()})`;
            resolvedItem = localItem;
          } else if (cloudTime > localTime) {
            conflictType = 'timestamp_mismatch';
            resolutionMethod = 'cloud_wins';
            resolutionReason = `Cloud version is newer (${new Date(cloudTime).toISOString()} > ${new Date(localTime).toISOString()})`;
            resolvedItem = cloudItem;
          } else {
            conflictType = 'content_difference';
            resolutionMethod = 'auto_merge';
            resolutionReason = 'Same timestamp but different content - using local version as default';
            resolvedItem = localItem;
          }
          
          // Track the conflict
          const conflict: SyncConflictDetails = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            dataType,
            itemId: id,
            conflictType,
            localData: localItem,
            cloudData: cloudItem,
            resolvedData: resolvedItem,
            resolutionMethod,
            resolutionReason,
            userId,
            deviceId
          };
          
          conflictTracker.push(conflict);
          merged.set(id, resolvedItem);
        } else {
          // No actual conflict - items are identical
          merged.set(id, localItem);
        }
      }
    });
    
    return Array.from(merged.values());
  }

  /**
   * Legacy merge arrays method for backward compatibility
   */
  private mergeArrays<T extends { id: string; lastModified?: string }>(local: T[], cloud: T[], idField: keyof T): T[] {
    const conflictTracker: SyncConflictDetails[] = [];
    return this.mergeArraysWithConflictTracking(local, cloud, idField, DataItemType.Contacts, '', conflictTracker);
  }

  // ==================== USER ACCOUNT SYNCHRONIZATION ====================

  /**
   * Upload encrypted user account sync data to OneDrive
   */
  async uploadUserAccountSyncData(data: UserAccountSyncData): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.sharedFolderId) {
        const initResult = await this.initializeFolderStructure();
        if (!initResult.success) {
          return { success: false, error: initResult.error };
        }
      }

      const fileName = this.USER_ACCOUNTS_FILE_NAME;
      const content = JSON.stringify(data, null, 2);

      // Check if file already exists
      const existingFiles = await oneDriveService.listFiles(this.sharedFolderId!);
      const existingFile = existingFiles.find(file => file.name === fileName);

      if (existingFile) {
        // Update existing file
        const updateResult = await oneDriveService.updateFile(existingFile.id, content);
        return { success: updateResult.success, error: updateResult.error };
      } else {
        // Create new file
        const uploadResult = await oneDriveService.uploadFile(
          this.sharedFolderId!,
          fileName,
          content
        );
        return { success: uploadResult.success, error: uploadResult.error };
      }
    } catch (error) {
      console.error('Error uploading user account sync data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Download encrypted user account sync data from OneDrive
   */
  async downloadUserAccountSyncData(): Promise<{ success: boolean; data?: UserAccountSyncData; error?: string }> {
    try {
      if (!this.sharedFolderId) {
        const initResult = await this.initializeFolderStructure();
        if (!initResult.success) {
          return { success: false, error: initResult.error };
        }
      }

      const fileName = this.USER_ACCOUNTS_FILE_NAME;
      const files = await oneDriveService.listFiles(this.sharedFolderId!);
      const targetFile = files.find(file => file.name === fileName);

      if (!targetFile) {
        return {
          success: false,
          error: 'User account sync data not found'
        };
      }

      const downloadResult = await oneDriveService.downloadFile(targetFile.id);
      if (!downloadResult.success) {
        return {
          success: false,
          error: downloadResult.error
        };
      }

      const data = JSON.parse(downloadResult.content!) as UserAccountSyncData;
      return { success: true, data };
    } catch (error) {
      console.error('Error downloading user account sync data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Synchronize user accounts across devices using OneDrive
   */
  async syncUserAccountsAcrossDevices(cloudAuthInfo: CloudAuthInfo): Promise<{ success: boolean; conflicts?: any[]; error?: string }> {
    try {
      // Override the cloud sync methods in UserAccountSyncService to use OneDrive
      const originalGetCloudSyncData = (userAccountSyncService as any).getCloudSyncData.bind(userAccountSyncService);
      const originalSaveCloudSyncData = (userAccountSyncService as any).saveCloudSyncData.bind(userAccountSyncService);

      (userAccountSyncService as any).getCloudSyncData = async (auth: CloudAuthInfo) => {
        const result = await this.downloadUserAccountSyncData();
        return result.success ? result.data : null;
      };
      (userAccountSyncService as any).saveCloudSyncData = async (auth: CloudAuthInfo, syncData: any) => {
        await this.uploadUserAccountSyncData(syncData);
      };

      try {
        const result = await userAccountSyncService.syncUserAccounts(cloudAuthInfo);
        return { success: true, conflicts: result };
      } finally {
        // Restore original methods
        (userAccountSyncService as any).getCloudSyncData = originalGetCloudSyncData;
        (userAccountSyncService as any).saveCloudSyncData = originalSaveCloudSyncData;
      }
    } catch (error) {
      console.error('Error syncing user accounts across devices:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Enable user account synchronization
   */
  async enableUserAccountSync(cloudAuthInfo: CloudAuthInfo): Promise<{ success: boolean; error?: string }> {
    try {
      await userAccountSyncService.enableSync(cloudAuthInfo);
      return { success: true };
    } catch (error) {
      console.error('Error enabling user account sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Disable user account synchronization
   */
  async disableUserAccountSync(): Promise<{ success: boolean; error?: string }> {
    try {
      await userAccountSyncService.disableSync();
      return { success: true };
    } catch (error) {
      console.error('Error disabling user account sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user account synchronization status
   */
  async getUserAccountSyncStatus(): Promise<{ enabled: boolean; lastSync?: string; deviceCount?: number }> {
    return userAccountSyncService.getSyncStatus();
  }

  /**
   * Get pending user account conflicts
   */
  async getPendingUserAccountConflicts(): Promise<any[]> {
    return userAccountSyncService.getPendingConflicts();
  }

  /**
   * Resolve a user account conflict
   */
  async resolveUserAccountConflict(conflictId: string, resolution: 'local' | 'cloud' | 'merge'): Promise<{ success: boolean; error?: string }> {
    try {
      const mappedResolution = resolution === 'local' ? 'use_local' : resolution === 'cloud' ? 'use_cloud' : 'merge_custom';
      await userAccountSyncService.resolveConflict(conflictId, mappedResolution);
      return { success: true };
    } catch (error) {
      console.error('Error resolving user account conflict:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const enhancedOneDriveService = new EnhancedOneDriveService();