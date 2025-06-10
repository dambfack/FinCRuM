import { enhancedGoogleDriveService } from './enhanced-google-drive';
import { enhancedOneDriveService } from './enhanced-onedrive';
import { LocalData, User } from '@/lib/types';

/**
 * Comprehensive backup and versioning service
 * Handles automated backups, version control, and data recovery
 */
export class BackupVersioningService {
  private readonly BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly VERSION_RETENTION_DAYS = 30;
  private readonly MAX_VERSIONS_PER_USER = 50;
  
  private backupTimer: NodeJS.Timeout | null = null;
  private isBackupInProgress = false;

  /**
   * Initialize backup service
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // Initialize folder structures for both services
      const googleResult = await enhancedGoogleDriveService.initializeFolderStructure();
      const onedriveResult = await enhancedOneDriveService.initializeFolderStructure();

      if (!googleResult.success && !onedriveResult.success) {
        return {
          success: false,
          error: 'Failed to initialize backup folders on both cloud services'
        };
      }

      // Start automatic backup schedule
      this.startAutomaticBackup();

      return { success: true };
    } catch (error) {
      console.error('Error initializing backup service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Start automatic backup schedule
   */
  private startAutomaticBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    this.backupTimer = setInterval(async () => {
      await this.performScheduledBackup();
    }, this.BACKUP_INTERVAL);

    console.log('Automatic backup scheduled every 24 hours');
  }

  /**
   * Stop automatic backup schedule
   */
  stopAutomaticBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
      console.log('Automatic backup stopped');
    }
  }

  /**
   * Perform scheduled backup
   */
  private async performScheduledBackup(): Promise<void> {
    if (this.isBackupInProgress) {
      console.log('Backup already in progress, skipping scheduled backup');
      return;
    }

    try {
      console.log('Starting scheduled backup...');
      await this.createFullSystemBackup();
      console.log('Scheduled backup completed successfully');
    } catch (error) {
      console.error('Error during scheduled backup:', error);
    }
  }

  /**
   * Create full system backup
   */
  async createFullSystemBackup(): Promise<{ success: boolean; error?: string; backupInfo?: any }> {
    if (this.isBackupInProgress) {
      return { success: false, error: 'Backup already in progress' };
    }

    this.isBackupInProgress = true;

    try {
      // Get all users data from local storage
      const allUsersData = await this.getAllUsersData();
      
      if (allUsersData.size === 0) {
        this.isBackupInProgress = false;
        return { success: false, error: 'No user data found to backup' };
      }

      const backupResults = {
        googleDrive: { success: false, error: '' },
        oneDrive: { success: false, error: '' }
      };

      // Create backup on Google Drive
      try {
        const googleResult = await enhancedGoogleDriveService.createFullBackup(allUsersData);
        backupResults.googleDrive = googleResult;
      } catch (error) {
        backupResults.googleDrive.error = error instanceof Error ? error.message : 'Unknown error';
      }

      // Create backup on OneDrive
      try {
        const onedriveResult = await enhancedOneDriveService.createFullBackup(allUsersData);
        backupResults.oneDrive = onedriveResult;
      } catch (error) {
        backupResults.oneDrive.error = error instanceof Error ? error.message : 'Unknown error';
      }

      const success = backupResults.googleDrive.success || backupResults.oneDrive.success;
      
      this.isBackupInProgress = false;

      return {
        success,
        error: success ? undefined : 'Failed to create backup on both cloud services',
        backupInfo: {
          timestamp: new Date().toISOString(),
          userCount: allUsersData.size,
          results: backupResults
        }
      };
    } catch (error) {
      this.isBackupInProgress = false;
      console.error('Error creating full system backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create user-specific backup
   */
  async createUserBackup(
    userId: string, 
    userName: string, 
    data: LocalData
  ): Promise<{ success: boolean; error?: string; backupInfo?: any }> {
    try {
      const backupResults = {
        googleDrive: { success: false, error: '' },
        oneDrive: { success: false, error: '' }
      };

      // Create backup on Google Drive
      try {
        const googleResult = await enhancedGoogleDriveService.uploadUserData(userId, userName, data);
        backupResults.googleDrive = googleResult;
      } catch (error) {
        backupResults.googleDrive.error = error instanceof Error ? error.message : 'Unknown error';
      }

      // Create backup on OneDrive
      try {
        const onedriveResult = await enhancedOneDriveService.uploadUserData(userId, userName, data);
        backupResults.oneDrive = onedriveResult;
      } catch (error) {
        backupResults.oneDrive.error = error instanceof Error ? error.message : 'Unknown error';
      }

      const success = backupResults.googleDrive.success || backupResults.oneDrive.success;

      return {
        success,
        error: success ? undefined : 'Failed to create user backup on both cloud services',
        backupInfo: {
          userId,
          userName,
          timestamp: new Date().toISOString(),
          results: backupResults
        }
      };
    } catch (error) {
      console.error('Error creating user backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Restore user data from backup
   */
  async restoreUserData(
    userId: string, 
    userName: string, 
    preferredService: 'google' | 'onedrive' | 'auto' = 'auto'
  ): Promise<{ success: boolean; data?: LocalData; error?: string; source?: string }> {
    try {
      let restoreResult: { success: boolean; data?: LocalData; error?: string } = { success: false };
      let source = '';

      if (preferredService === 'google' || preferredService === 'auto') {
        try {
          restoreResult = await enhancedGoogleDriveService.downloadUserData(userId, userName);
          if (restoreResult.success) {
            source = 'Google Drive';
          }
        } catch (error) {
          console.error('Error restoring from Google Drive:', error);
        }
      }

      if (!restoreResult.success && (preferredService === 'onedrive' || preferredService === 'auto')) {
        try {
          restoreResult = await enhancedOneDriveService.downloadUserData(userId, userName);
          if (restoreResult.success) {
            source = 'OneDrive';
          }
        } catch (error) {
          console.error('Error restoring from OneDrive:', error);
        }
      }

      if (restoreResult.success && restoreResult.data) {
        return {
          success: true,
          data: restoreResult.data,
          source
        };
      }

      return {
        success: false,
        error: 'Failed to restore user data from any cloud service'
      };
    } catch (error) {
      console.error('Error restoring user data:', error);
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
    preferredService: 'google' | 'onedrive' | 'both' = 'both'
  ): Promise<{ success: boolean; data?: LocalData; conflicts?: any[]; error?: string }> {
    try {
      let syncResult: { success: boolean; data?: LocalData; conflicts?: any[]; error?: string } = { success: false };

      if (preferredService === 'google' || preferredService === 'both') {
        // Google Drive doesn't have built-in conflict resolution yet
        // For now, we'll use the OneDrive implementation
      }

      if (preferredService === 'onedrive' || preferredService === 'both') {
        syncResult = await enhancedOneDriveService.syncUserDataWithConflictResolution(
          userId,
          userName,
          localData
        );
      }

      return syncResult;
    } catch (error) {
      console.error('Error syncing user data with conflict resolution:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get backup history for a user
   */
  async getUserBackupHistory(
    userId: string,
    userName: string
  ): Promise<{ success: boolean; history?: any[]; error?: string }> {
    try {
      const history: any[] = [];

      // Get Google Drive backup history
      try {
        const googleFolders = await enhancedGoogleDriveService.listUserFolders();
        if (googleFolders.success && googleFolders.folders) {
          const userFolder = googleFolders.folders.find(f => f.userId === userId.substring(0, 8));
          if (userFolder) {
            history.push({
              service: 'Google Drive',
              folderId: userFolder.id,
              folderName: userFolder.name
            });
          }
        }
      } catch (error) {
        console.error('Error getting Google Drive backup history:', error);
      }

      // Get OneDrive backup history
      try {
        const onedriveFolders = await enhancedOneDriveService.listUserFolders();
        if (onedriveFolders.success && onedriveFolders.folders) {
          const userFolder = onedriveFolders.folders.find(f => f.userId === userId.substring(0, 8));
          if (userFolder) {
            history.push({
              service: 'OneDrive',
              folderId: userFolder.id,
              folderName: userFolder.name
            });
          }
        }
      } catch (error) {
        console.error('Error getting OneDrive backup history:', error);
      }

      return {
        success: true,
        history
      };
    } catch (error) {
      console.error('Error getting user backup history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clean up old backups and versions
   */
  async cleanupOldBackups(): Promise<{ success: boolean; error?: string; cleanupInfo?: any }> {
    try {
      const cleanupResults = {
        googleDrive: { success: false, error: '' },
        oneDrive: { success: false, error: '' }
      };

      // Note: Cleanup is handled automatically by the enhanced services
      // This method could be extended to provide more granular cleanup control

      console.log('Cleanup is handled automatically by enhanced cloud services');

      return {
        success: true,
        cleanupInfo: {
          timestamp: new Date().toISOString(),
          message: 'Cleanup is handled automatically by enhanced cloud services'
        }
      };
    } catch (error) {
      console.error('Error during cleanup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all users data from local storage
   */
  private async getAllUsersData(): Promise<Map<string, { user: User; data: LocalData }>> {
    const allUsersData = new Map<string, { user: User; data: LocalData }>();

    try {
      // Get users from local storage
      const usersJson = localStorage.getItem('fincrm_users');
      if (!usersJson) {
        return allUsersData;
      }

      const users: User[] = JSON.parse(usersJson);
      
      for (const user of users) {
        // Get user's data from local storage
        const userDataKey = `fincrm_data_${user.id}`;
        const userDataJson = localStorage.getItem(userDataKey);
        
        if (userDataJson) {
          try {
            const userData: LocalData = JSON.parse(userDataJson);
            allUsersData.set(user.id, { user, data: userData });
          } catch (parseError) {
            console.error(`Error parsing data for user ${user.id}:`, parseError);
          }
        }
      }
    } catch (error) {
      console.error('Error getting all users data:', error);
    }

    return allUsersData;
  }

  /**
   * Get backup service status
   */
  getStatus(): {
    isInitialized: boolean;
    isBackupInProgress: boolean;
    automaticBackupEnabled: boolean;
    nextBackupTime?: string;
  } {
    const nextBackupTime = this.backupTimer 
      ? new Date(Date.now() + this.BACKUP_INTERVAL).toISOString()
      : undefined;

    return {
      isInitialized: this.backupTimer !== null,
      isBackupInProgress: this.isBackupInProgress,
      automaticBackupEnabled: this.backupTimer !== null,
      nextBackupTime
    };
  }

  /**
   * Force immediate backup
   */
  async forceBackup(): Promise<{ success: boolean; error?: string; backupInfo?: any }> {
    console.log('Force backup requested');
    return await this.createFullSystemBackup();
  }

  /**
   * Validate backup integrity
   */
  async validateBackupIntegrity(
    userId: string,
    userName: string
  ): Promise<{ success: boolean; isValid?: boolean; issues?: string[]; error?: string }> {
    try {
      const issues: string[] = [];

      // Check Google Drive backup
      const googleResult = await enhancedGoogleDriveService.downloadUserData(userId, userName);
      if (!googleResult.success) {
        issues.push('Google Drive backup not accessible or corrupted');
      } else if (googleResult.data) {
        // Validate data structure
        if (!this.validateDataStructure(googleResult.data)) {
          issues.push('Google Drive backup has invalid data structure');
        }
      }

      // Check OneDrive backup
      const onedriveResult = await enhancedOneDriveService.downloadUserData(userId, userName);
      if (!onedriveResult.success) {
        issues.push('OneDrive backup not accessible or corrupted');
      } else if (onedriveResult.data) {
        // Validate data structure
        if (!this.validateDataStructure(onedriveResult.data)) {
          issues.push('OneDrive backup has invalid data structure');
        }
      }

      const isValid = issues.length === 0;

      return {
        success: true,
        isValid,
        issues: issues.length > 0 ? issues : undefined
      };
    } catch (error) {
      console.error('Error validating backup integrity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate data structure
   */
  private validateDataStructure(data: LocalData): boolean {
    try {
      // Check if required properties exist
      const requiredProperties = ['contacts', 'tasks', 'reminders', 'appointments'];
      
      for (const prop of requiredProperties) {
        if (!(prop in data)) {
          return false;
        }
        
        // Check if property is an array
        if (!Array.isArray(data[prop as keyof LocalData])) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating data structure:', error);
      return false;
    }
  }
}

// Export singleton instance
export const backupVersioningService = new BackupVersioningService();