import { oneDriveService } from './onedrive';
import { getDeviceManager } from './device-management';
import { getRealTimeSync } from './real-time-sync';
import { LocalData, User } from '@/lib/types';

/**
 * Enhanced OneDrive service for multi-user shared access
 * with folder-based organization and permission management
 */
export class EnhancedOneDriveService {
  private readonly SHARED_FOLDER_NAME = 'FinCRuM_Shared';
  private readonly USER_FOLDER_PREFIX = 'User_';
  private readonly BACKUP_FOLDER_NAME = 'Backups';
  private readonly VERSION_FOLDER_NAME = 'Versions';
  
  private sharedFolderId: string | null = null;
  private userFolderIds: Map<string, string> = new Map();
  private backupFolderId: string | null = null;
  private versionFolderId: string | null = null;

  /**
   * Initialize folder structure for multi-user access
   */
  async initializeFolderStructure(): Promise<{ success: boolean; error?: string }> {
    try {
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

      if (existingFolders.success && existingFolders.files && existingFolders.files.length > 0) {
        const sharedFolder = existingFolders.files.find(f => f.folder && f.name === this.SHARED_FOLDER_NAME);
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

      if (existingFolders.success && existingFolders.files && existingFolders.files.length > 0) {
        const backupFolder = existingFolders.files.find(f => f.folder && f.name === this.BACKUP_FOLDER_NAME);
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

      if (existingFolders.success && existingFolders.files && existingFolders.files.length > 0) {
        const versionFolder = existingFolders.files.find(f => f.folder && f.name === this.VERSION_FOLDER_NAME);
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

      if (existingFolders.success && existingFolders.files && existingFolders.files.length > 0) {
        const userFolder = existingFolders.files.find(f => f.folder && f.name === folderName);
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
  async uploadUserData(userId: string, userName: string, data: LocalData): Promise<{ success: boolean; error?: string }> {
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
  async downloadUserData(userId: string, userName: string): Promise<{ success: boolean; data?: LocalData; error?: string }> {
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
        !f.folder && f.name && f.name.includes('fincrm_data_') && f.name.endsWith('.json')
      );

      if (dataFiles.length === 0) {
        return { success: false, error: 'No data files found' };
      }

      // Sort by creation time and get the most recent
      const sortedFiles = dataFiles.sort((a, b) => 
        new Date(b.createdDateTime || '').getTime() - new Date(a.createdDateTime || '').getTime()
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
        !f.folder && f.name && f.name.startsWith(userPrefix)
      );

      if (userVersionFiles.length <= 10) {
        return;
      }

      // Sort by creation time and delete oldest files
      const sortedFiles = userVersionFiles.sort((a, b) => 
        new Date(a.createdDateTime || '').getTime() - new Date(b.createdDateTime || '').getTime()
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
  async createFullBackup(allUsersData: Map<string, { user: User; data: LocalData }>): Promise<{ success: boolean; error?: string }> {
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
        !f.folder && f.name && f.name.startsWith('full_backup_')
      );

      if (backupFiles.length <= 5) {
        return;
      }

      // Sort by creation time and delete oldest files
      const sortedFiles = backupFiles.sort((a, b) => 
        new Date(a.createdDateTime || '').getTime() - new Date(b.createdDateTime || '').getTime()
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
  async listUserFolders(): Promise<{ success: boolean; folders?: Array<{ id: string; name: string; userId: string }>; error?: string }> {
    try {
      if (!this.sharedFolderId) {
        const initResult = await this.initializeFolderStructure();
        if (!initResult.success) {
          return { success: false, error: 'Failed to initialize folder structure' };
        }
      }

      const foldersResult = await oneDriveService.searchFiles(this.USER_FOLDER_PREFIX, this.sharedFolderId);

      if (!foldersResult.success || !foldersResult.files) {
        return { success: false, error: 'Failed to list user folders' };
      }

      // Filter for user folders
      const userFolders = foldersResult.files.filter(f => 
        f.folder && f.name && f.name.startsWith(this.USER_FOLDER_PREFIX)
      );

      const folders = userFolders.map(file => {
        const name = file.name || '';
        const userIdMatch = name.match(/_([a-f0-9]{8})$/);
        const userId = userIdMatch ? userIdMatch[1] : '';
        
        return {
          id: file.id,
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
    localData: LocalData
  ): Promise<{ success: boolean; data?: LocalData; conflicts?: any[]; error?: string }> {
    try {
      // Download current cloud data
      const downloadResult = await this.downloadUserData(userId, userName);
      
      if (!downloadResult.success) {
        // No cloud data exists, upload local data
        const uploadResult = await this.uploadUserData(userId, userName, localData);
        return {
          success: uploadResult.success,
          data: localData,
          conflicts: [],
          error: uploadResult.error
        };
      }

      const cloudData = downloadResult.data!;
      
      // Simple conflict resolution: merge arrays and use latest timestamps
      const mergedData: LocalData = {
        contacts: this.mergeArrays(localData.contacts || [], cloudData.contacts || [], 'id'),
        tasks: this.mergeArrays(localData.tasks || [], cloudData.tasks || [], 'id'),
        reminders: this.mergeArrays(localData.reminders || [], cloudData.reminders || [], 'id'),
        appointments: this.mergeArrays(localData.appointments || [], cloudData.appointments || [], 'id'),
        lastModified: Math.max(
          new Date(localData.lastModified || 0).getTime(),
          new Date(cloudData.lastModified || 0).getTime()
        ).toString()
      };

      // Upload merged data
      const uploadResult = await this.uploadUserData(userId, userName, mergedData);
      
      return {
        success: uploadResult.success,
        data: mergedData,
        conflicts: [], // TODO: Implement detailed conflict tracking
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
   * Merge arrays with conflict resolution
   */
  private mergeArrays<T extends { id: string; lastModified?: string }>(local: T[], cloud: T[], idField: keyof T): T[] {
    const merged = new Map<string, T>();
    
    // Add cloud items first
    cloud.forEach(item => {
      merged.set(item[idField] as string, item);
    });
    
    // Add or update with local items (local takes precedence if newer)
    local.forEach(localItem => {
      const id = localItem[idField] as string;
      const cloudItem = merged.get(id);
      
      if (!cloudItem) {
        merged.set(id, localItem);
      } else {
        // Compare timestamps if available
        const localTime = localItem.lastModified && localItem.lastModified.trim() !== '' ? new Date(localItem.lastModified).getTime() : 0;
        const cloudTime = cloudItem.lastModified && cloudItem.lastModified.trim() !== '' ? new Date(cloudItem.lastModified).getTime() : 0;
        
        if (localTime >= cloudTime) {
          merged.set(id, localItem);
        }
      }
    });
    
    return Array.from(merged.values());
  }
}

// Export singleton instance
export const enhancedOneDriveService = new EnhancedOneDriveService();