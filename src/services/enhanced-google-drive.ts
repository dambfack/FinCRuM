import { googleDriveService } from './google-drive';
import { getDeviceManager } from './device-management';
import { getRealTimeSync } from './real-time-sync';
import { LocalData, User, SyncConflictDetails, ConflictTrackingResult, DataItemType, UserAccountSyncData, CloudAuthInfo, GoogleTokens } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { userAccountSyncService } from './user-account-sync';

/**
 * Enhanced Google Drive service for multi-user shared access
 * with folder-based organization and permission management
 */
export class EnhancedGoogleDriveService {
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

  /**
   * Initialize folder structure for multi-user access
   */
  async initializeFolderStructure(tokens: GoogleTokens): Promise<{ success: boolean; error?: string }> {
    try {
      // Create or find shared folder
      const sharedFolderResult = await this.ensureSharedFolder(tokens);
      if (!sharedFolderResult.success) {
        return sharedFolderResult;
      }

      // Create backup and version folders
      await this.ensureBackupFolder(tokens);
      await this.ensureVersionFolder(tokens);

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
  private async ensureSharedFolder(tokens: GoogleTokens): Promise<{ success: boolean; error?: string; folderId?: string }> {
    try {
      // Check if shared folder already exists
      const existingFolders = await googleDriveService.searchFiles(
        `name='${this.SHARED_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder'`,
        tokens
      );

      if (existingFolders.success && existingFolders.files && existingFolders.files.length > 0) {
        this.sharedFolderId = existingFolders.files[0].id!;
        return { success: true, folderId: this.sharedFolderId };
      }

      // Create shared folder
      const createResult = await googleDriveService.createFolder(this.SHARED_FOLDER_NAME, undefined, tokens);
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
  private async ensureBackupFolder(tokens: GoogleTokens): Promise<void> {
    try {
      if (!this.sharedFolderId) return;

      const existingFolders = await googleDriveService.searchFiles(
        `name='${this.BACKUP_FOLDER_NAME}' and '${this.sharedFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
        tokens
      );

      if (existingFolders.success && existingFolders.files && existingFolders.files.length > 0) {
        this.backupFolderId = existingFolders.files[0].id!;
        return;
      }

      const createResult = await googleDriveService.createFolder(this.BACKUP_FOLDER_NAME, this.sharedFolderId, tokens);
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
  private async ensureVersionFolder(tokens: GoogleTokens): Promise<void> {
    try {
      if (!this.sharedFolderId) return;

      const existingFolders = await googleDriveService.searchFiles(
        `name='${this.VERSION_FOLDER_NAME}' and '${this.sharedFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
        tokens
      );

      if (existingFolders.success && existingFolders.files && existingFolders.files.length > 0) {
        this.versionFolderId = existingFolders.files[0].id!;
        return;
      }

      const createResult = await googleDriveService.createFolder(this.VERSION_FOLDER_NAME, this.sharedFolderId, tokens);
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
  async ensureUserFolder(userId: string, userName: string, tokens: GoogleTokens): Promise<{ success: boolean; folderId?: string; error?: string }> {
    try {
      if (!this.sharedFolderId) {
        const initResult = await this.initializeFolderStructure(tokens);
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
      const existingFolders = await googleDriveService.searchFiles(
        `name='${folderName}' and '${this.sharedFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
        tokens
      );

      if (existingFolders.success && existingFolders.files && existingFolders.files.length > 0) {
        const folderId = existingFolders.files[0].id!;
        this.userFolderIds.set(userId, folderId);
        return { success: true, folderId };
      }

      // Create user folder
      const createResult = await googleDriveService.createFolder(folderName, this.sharedFolderId, tokens);
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
  async uploadUserData(userId: string, userName: string, data: LocalData, tokens: GoogleTokens): Promise<{ success: boolean; error?: string }> {
    try {
      const userFolderResult = await this.ensureUserFolder(userId, userName, tokens);
      if (!userFolderResult.success || !userFolderResult.folderId) {
        return { success: false, error: 'Failed to access user folder' };
      }

      const fileName = `fincrm_data_${new Date().toISOString().split('T')[0]}.json`;
      const content = JSON.stringify(data, null, 2);

      const uploadResult = await googleDriveService.uploadFile(
        fileName,
        content,
        'application/json',
        userFolderResult.folderId,
        tokens
      );

      if (uploadResult.success) {
        // Create version backup
        await this.createVersionBackup(userId, userName, data, tokens);
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
  async downloadUserData(userId: string, userName: string, tokens: GoogleTokens): Promise<{ success: boolean; data?: LocalData; error?: string }> {
    try {
      const userFolderResult = await this.ensureUserFolder(userId, userName, tokens);
      if (!userFolderResult.success || !userFolderResult.folderId) {
        return { success: false, error: 'Failed to access user folder' };
      }

      // Find the most recent data file
      const filesResult = await googleDriveService.searchFiles(
        `'${userFolderResult.folderId}' in parents and name contains 'fincrm_data_'`,
        tokens
      );

      if (!filesResult.success || !filesResult.files || filesResult.files.length === 0) {
        return { success: false, error: 'No data files found' };
      }

      // Sort by creation time and get the most recent
      const sortedFiles = filesResult.files.sort((a, b) => 
        new Date(b.createdTime || '').getTime() - new Date(a.createdTime || '').getTime()
      );

      const downloadResult = await googleDriveService.downloadFile(sortedFiles[0].id!, tokens);
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
  private async createVersionBackup(userId: string, userName: string, data: LocalData, tokens: GoogleTokens): Promise<void> {
    try {
      if (!this.versionFolderId) return;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${userName}_${userId.substring(0, 8)}_${timestamp}.json`;
      const content = JSON.stringify(data, null, 2);

      await googleDriveService.uploadFile(
        fileName,
        content,
        'application/json',
        this.versionFolderId,
        tokens
      );

      // Clean up old versions (keep only last 10)
      await this.cleanupOldVersions(userId, userName, tokens);
    } catch (error) {
      console.error('Error creating version backup:', error);
    }
  }

  /**
   * Clean up old version backups
   */
  private async cleanupOldVersions(userId: string, userName: string, tokens: GoogleTokens): Promise<void> {
    try {
      if (!this.versionFolderId) return;

      const userPrefix = `${userName}_${userId.substring(0, 8)}_`;
      const filesResult = await googleDriveService.searchFiles(
        `'${this.versionFolderId}' in parents and name contains '${userPrefix}'`,
        tokens
      );

      if (!filesResult.success || !filesResult.files || filesResult.files.length <= 10) {
        return;
      }

      // Sort by creation time and delete oldest files
      const sortedFiles = filesResult.files.sort((a, b) => 
        new Date(a.createdTime || '').getTime() - new Date(b.createdTime || '').getTime()
      );

      const filesToDelete = sortedFiles.slice(0, sortedFiles.length - 10);
      for (const file of filesToDelete) {
        if (file.id) {
          await googleDriveService.deleteFile(file.id, tokens);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old versions:', error);
    }
  }

  /**
   * Create full backup
   */
  async createFullBackup(allUsersData: Map<string, { user: User; data: LocalData }>, tokens: GoogleTokens): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.backupFolderId) {
        await this.ensureBackupFolder(tokens);
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

      const uploadResult = await googleDriveService.uploadFile(
        fileName,
        content,
        'application/json',
        this.backupFolderId,
        tokens
      );

      if (uploadResult.success) {
        // Clean up old backups (keep only last 5 full backups)
        await this.cleanupOldBackups(tokens);
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
  private async cleanupOldBackups(tokens: GoogleTokens): Promise<void> {
    try {
      if (!this.backupFolderId) return;

      const filesResult = await googleDriveService.searchFiles(
        `'${this.backupFolderId}' in parents and name contains 'full_backup_'`,
        tokens
      );

      if (!filesResult.success || !filesResult.files || filesResult.files.length <= 5) {
        return;
      }

      // Sort by creation time and delete oldest files
      const sortedFiles = filesResult.files.sort((a, b) => 
        new Date(a.createdTime || '').getTime() - new Date(b.createdTime || '').getTime()
      );

      const filesToDelete = sortedFiles.slice(0, sortedFiles.length - 5);
      for (const file of filesToDelete) {
        if (file.id) {
          await googleDriveService.deleteFile(file.id, tokens);
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
      // 2. Query Google Drive permissions for the shared folder
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
  async listUserFolders(tokens: GoogleTokens): Promise<{ success: boolean; folders?: Array<{ id: string; name: string; userId: string }>; error?: string }> {
    try {
      if (!this.sharedFolderId) {
        const initResult = await this.initializeFolderStructure(tokens);
        if (!initResult.success) {
          return { success: false, error: 'Failed to initialize folder structure' };
        }
      }

      const foldersResult = await googleDriveService.searchFiles(
        `'${this.sharedFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name contains '${this.USER_FOLDER_PREFIX}'`,
        tokens
      );

      if (!foldersResult.success || !foldersResult.files) {
        return { success: false, error: 'Failed to list user folders' };
      }

      const folders = foldersResult.files.map(file => {
        const name = file.name || '';
        const userIdMatch = name.match(/_([a-f0-9]{8})$/);
        const userId = userIdMatch ? userIdMatch[1] : '';
        
        return {
          id: file.id!,
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
    tokens: GoogleTokens
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
        lastSyncTime: new Date(Math.max(
          new Date(localData.lastSyncTime || 0).getTime(),
          new Date(cloudData.lastSyncTime || 0).getTime()
        )).toISOString()
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

  /**
   * Upload user account sync data to Google Drive
   */
  async uploadUserAccountSyncData(cloudAuth: CloudAuthInfo, syncData: UserAccountSyncData): Promise<{ success: boolean; error?: string }> {
    try {
      // Convert CloudAuthInfo to GoogleTokens format
      const tokens: GoogleTokens = {
        access_token: cloudAuth.accessToken,
        refresh_token: cloudAuth.refreshToken
      };
      if (!tokens.access_token) {
        return { success: false, error: 'No access token provided in CloudAuthInfo' };
      }
      
      if (!this.sharedFolderId) {
        const initResult = await this.initializeFolderStructure(tokens);
        if (!initResult.success) {
          return initResult;
        }
      }

      const jsonData = JSON.stringify(syncData, null, 2);
      
      // Check if file already exists
      const existingFiles = await googleDriveService.searchFiles(
        `name='${this.USER_ACCOUNTS_FILE_NAME}' and '${this.sharedFolderId}' in parents`,
        tokens
      );

      let uploadResult;
      if (existingFiles.success && existingFiles.files && existingFiles.files.length > 0) {
        // Update existing file
        const fileId = existingFiles.files[0].id!;
        uploadResult = await googleDriveService.updateFile(fileId, jsonData, this.USER_ACCOUNTS_FILE_NAME, tokens);
      } else {
        // Create new file
        uploadResult = await googleDriveService.uploadFile(
          this.USER_ACCOUNTS_FILE_NAME,
          jsonData,
          'application/json',
          this.sharedFolderId,
          tokens
        );
      }

      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      console.log('User account sync data uploaded successfully');
      return { success: true };
    } catch (error) {
      console.error('Error uploading user account sync data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Download user account sync data from Google Drive
   */
  async downloadUserAccountSyncData(cloudAuth: CloudAuthInfo): Promise<{ success: boolean; data?: UserAccountSyncData; error?: string }> {
    try {
      // Convert CloudAuthInfo to GoogleTokens format
      const tokens: GoogleTokens = {
        access_token: cloudAuth.accessToken,
        refresh_token: cloudAuth.refreshToken
      };
      if (!tokens.access_token) {
        return { success: false, error: 'No access token provided in CloudAuthInfo' };
      }
      
      if (!this.sharedFolderId) {
        const initResult = await this.initializeFolderStructure(tokens);
        if (!initResult.success) {
          return { success: false, error: initResult.error };
        }
      }

      // Search for user accounts file
      const searchResult = await googleDriveService.searchFiles(
        `name='${this.USER_ACCOUNTS_FILE_NAME}' and '${this.sharedFolderId}' in parents`,
        tokens
      );

      if (!searchResult.success || !searchResult.files || searchResult.files.length === 0) {
        // No user account sync data exists yet
        return { success: true, data: undefined };
      }

      const fileId = searchResult.files[0].id!;
      const downloadResult = await googleDriveService.downloadFile(fileId, tokens);

      if (!downloadResult.success || !downloadResult.content) {
        return { success: false, error: downloadResult.error || 'Failed to download user account sync data' };
      }

      try {
        const syncData: UserAccountSyncData = JSON.parse(downloadResult.content);
        return { success: true, data: syncData };
      } catch (parseError) {
        console.error('Error parsing user account sync data:', parseError);
        return { success: false, error: 'Invalid user account sync data format' };
      }
    } catch (error) {
      console.error('Error downloading user account sync data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sync user accounts across devices using the UserAccountSyncService
   */
  async syncUserAccountsAcrossDevices(cloudAuth: CloudAuthInfo): Promise<{ success: boolean; conflicts?: number; error?: string }> {
    try {
      // Initialize user account sync service
      await userAccountSyncService.initialize(cloudAuth);
      
      // Check if sync is enabled
      const syncStatus = userAccountSyncService.getSyncStatus();
      if (!syncStatus.enabled) {
        return { success: false, error: 'User account synchronization is not enabled' };
      }

      // Override the cloud sync methods in UserAccountSyncService
      const originalGetCloudSyncData = (userAccountSyncService as any).getCloudSyncData;
      const originalSaveCloudSyncData = (userAccountSyncService as any).saveCloudSyncData;

      // Replace with Google Drive implementations
      (userAccountSyncService as any).getCloudSyncData = async (auth: CloudAuthInfo) => {
        const result = await this.downloadUserAccountSyncData(auth);
        return result.success ? result.data : null;
      };

      (userAccountSyncService as any).saveCloudSyncData = async (auth: CloudAuthInfo, syncData: UserAccountSyncData) => {
        const result = await this.uploadUserAccountSyncData(auth, syncData);
        if (!result.success) {
          throw new Error(result.error || 'Failed to save user account sync data');
        }
      };

      // Perform the sync
      const conflicts = await userAccountSyncService.syncUserAccounts(cloudAuth);

      // Restore original methods
      (userAccountSyncService as any).getCloudSyncData = originalGetCloudSyncData;
      (userAccountSyncService as any).saveCloudSyncData = originalSaveCloudSyncData;

      return {
        success: true,
        conflicts: conflicts.length
      };
    } catch (error) {
      console.error('Error syncing user accounts across devices:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Enable cross-device user account synchronization
   */
  async enableUserAccountSync(cloudAuth: CloudAuthInfo): Promise<{ success: boolean; error?: string }> {
    try {
      await userAccountSyncService.initialize(cloudAuth);
      await userAccountSyncService.enableSync(cloudAuth);
      
      // Perform initial sync with Google Drive integration
      const syncResult = await this.syncUserAccountsAcrossDevices(cloudAuth);
      
      return {
        success: syncResult.success,
        error: syncResult.error
      };
    } catch (error) {
      console.error('Error enabling user account sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Disable cross-device user account synchronization
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
   * Get user account sync status
   */
  getUserAccountSyncStatus(): { enabled: boolean; lastSync?: string; conflicts: number } {
    return userAccountSyncService.getSyncStatus();
  }

  /**
   * Get pending user account conflicts
   */
  getPendingUserAccountConflicts() {
    return userAccountSyncService.getPendingConflicts();
  }

  /**
   * Resolve a user account conflict
   */
  async resolveUserAccountConflict(
    conflictId: string,
    resolution: 'use_local' | 'use_cloud' | 'merge_custom',
    customData?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await userAccountSyncService.resolveConflict(conflictId, resolution, customData);
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
export const enhancedGoogleDriveService = new EnhancedGoogleDriveService();