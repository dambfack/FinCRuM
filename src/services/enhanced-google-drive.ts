import { googleDriveService } from './google-drive';
import { getDeviceManager } from './device-management';
import { getRealTimeSync } from './real-time-sync';
import { LocalData, User } from '@/lib/types';

/**
 * Enhanced Google Drive service for multi-user shared access
 * with folder-based organization and permission management
 */
export class EnhancedGoogleDriveService {
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
      const existingFolders = await googleDriveService.searchFiles(
        `name='${this.SHARED_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder'`
      );

      if (existingFolders.success && existingFolders.files && existingFolders.files.length > 0) {
        this.sharedFolderId = existingFolders.files[0].id!;
        return { success: true, folderId: this.sharedFolderId };
      }

      // Create shared folder
      const createResult = await googleDriveService.createFolder(this.SHARED_FOLDER_NAME);
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

      const existingFolders = await googleDriveService.searchFiles(
        `name='${this.BACKUP_FOLDER_NAME}' and '${this.sharedFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`
      );

      if (existingFolders.success && existingFolders.files && existingFolders.files.length > 0) {
        this.backupFolderId = existingFolders.files[0].id!;
        return;
      }

      const createResult = await googleDriveService.createFolder(this.BACKUP_FOLDER_NAME, this.sharedFolderId);
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

      const existingFolders = await googleDriveService.searchFiles(
        `name='${this.VERSION_FOLDER_NAME}' and '${this.sharedFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`
      );

      if (existingFolders.success && existingFolders.files && existingFolders.files.length > 0) {
        this.versionFolderId = existingFolders.files[0].id!;
        return;
      }

      const createResult = await googleDriveService.createFolder(this.VERSION_FOLDER_NAME, this.sharedFolderId);
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
      const existingFolders = await googleDriveService.searchFiles(
        `name='${folderName}' and '${this.sharedFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`
      );

      if (existingFolders.success && existingFolders.files && existingFolders.files.length > 0) {
        const folderId = existingFolders.files[0].id!;
        this.userFolderIds.set(userId, folderId);
        return { success: true, folderId };
      }

      // Create user folder
      const createResult = await googleDriveService.createFolder(folderName, this.sharedFolderId);
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

      const uploadResult = await googleDriveService.uploadFile(
        fileName,
        content,
        'application/json',
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
      const filesResult = await googleDriveService.searchFiles(
        `'${userFolderResult.folderId}' in parents and name contains 'fincrm_data_'`
      );

      if (!filesResult.success || !filesResult.files || filesResult.files.length === 0) {
        return { success: false, error: 'No data files found' };
      }

      // Sort by creation time and get the most recent
      const sortedFiles = filesResult.files.sort((a, b) => 
        new Date(b.createdTime || '').getTime() - new Date(a.createdTime || '').getTime()
      );

      const downloadResult = await googleDriveService.downloadFile(sortedFiles[0].id!);
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

      await googleDriveService.uploadFile(
        fileName,
        content,
        'application/json',
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
      const filesResult = await googleDriveService.searchFiles(
        `'${this.versionFolderId}' in parents and name contains '${userPrefix}'`
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
          await googleDriveService.deleteFile(file.id);
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

      const uploadResult = await googleDriveService.uploadFile(
        fileName,
        content,
        'application/json',
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

      const filesResult = await googleDriveService.searchFiles(
        `'${this.backupFolderId}' in parents and name contains 'full_backup_'`
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
          await googleDriveService.deleteFile(file.id);
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
  async listUserFolders(): Promise<{ success: boolean; folders?: Array<{ id: string; name: string; userId: string }>; error?: string }> {
    try {
      if (!this.sharedFolderId) {
        const initResult = await this.initializeFolderStructure();
        if (!initResult.success) {
          return { success: false, error: 'Failed to initialize folder structure' };
        }
      }

      const foldersResult = await googleDriveService.searchFiles(
        `'${this.sharedFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name contains '${this.USER_FOLDER_PREFIX}'`
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
}

// Export singleton instance
export const enhancedGoogleDriveService = new EnhancedGoogleDriveService();