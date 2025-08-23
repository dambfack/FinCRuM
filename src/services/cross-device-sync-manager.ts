import { enhancedGoogleDriveService } from './enhanced-google-drive';
import { enhancedOneDriveService } from './enhanced-onedrive';
import { userAccountSyncService } from './user-account-sync';
import { getDeviceManager } from './device-management';
import { CloudProvider, CloudAuthInfo, User, LocalData, UserAccountSyncConfig } from '@/lib/types';

/**
 * Cross-Device Sync Manager
 * Orchestrates user account synchronization across devices using cloud providers
 */
export class CrossDeviceSyncManager {
  private cloudProvider: CloudProvider | null = null;
  private cloudAuthInfo: CloudAuthInfo | null = null;
  private syncEnabled = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize cross-device synchronization
   */
  async initialize(provider: CloudProvider, authInfo: CloudAuthInfo): Promise<{ success: boolean; error?: string }> {
    try {
      this.cloudProvider = provider;
      this.cloudAuthInfo = authInfo;

      // Initialize device registration
      const deviceManager = getDeviceManager();
      const deviceId = deviceManager.getCurrentDeviceId();
      
      console.log(`Initializing cross-device sync with ${provider} for device ${deviceId}`);

      // Enable user account sync based on provider
      let result;
      if (provider === 'googledrive') {
        result = await enhancedGoogleDriveService.enableUserAccountSync(authInfo);
      } else if (provider === 'onedrive') {
        result = await enhancedOneDriveService.enableUserAccountSync(authInfo);
      } else {
        return { success: false, error: 'Unsupported cloud provider' };
      }

      if (!result.success) {
        return result;
      }

      this.syncEnabled = true;
      console.log('Cross-device sync initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('Error initializing cross-device sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Start automatic synchronization
   */
  async startAutoSync(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.syncEnabled || !this.cloudProvider || !this.cloudAuthInfo) {
        return { success: false, error: 'Sync not initialized' };
      }

      // Perform initial sync
      const initialSync = await this.performSync();
      if (!initialSync.success) {
        console.warn('Initial sync failed:', initialSync.error);
      }

      // Start periodic sync
      this.syncInterval = setInterval(async () => {
        const syncResult = await this.performSync();
        if (!syncResult.success) {
          console.error('Periodic sync failed:', syncResult.error);
        }
      }, this.SYNC_INTERVAL_MS);

      console.log('Auto-sync started with interval:', this.SYNC_INTERVAL_MS, 'ms');
      return { success: true };
    } catch (error) {
      console.error('Error starting auto-sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Auto-sync stopped');
    }
  }

  /**
   * Perform manual synchronization
   */
  async performSync(): Promise<{ success: boolean; conflicts?: any[]; error?: string }> {
    try {
      if (!this.syncEnabled || !this.cloudProvider || !this.cloudAuthInfo) {
        return { success: false, error: 'Sync not initialized' };
      }

      console.log('Performing cross-device sync...');

      let result;
      if (this.cloudProvider === 'googledrive') {
        result = await enhancedGoogleDriveService.syncUserAccountsAcrossDevices(this.cloudAuthInfo);
      } else if (this.cloudProvider === 'onedrive') {
        result = await enhancedOneDriveService.syncUserAccountsAcrossDevices(this.cloudAuthInfo);
      } else {
        return { success: false, error: 'Unsupported cloud provider' };
      }

      if (result.success) {
        console.log('Cross-device sync completed successfully');
        if (result.conflicts && result.conflicts.length > 0) {
          console.log(`Sync completed with ${result.conflicts.length} conflicts`);
        }
      } else {
        console.error('Cross-device sync failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('Error performing sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get synchronization status
   */
  async getSyncStatus(): Promise<{
    enabled: boolean;
    provider?: CloudProvider;
    lastSync?: string;
    deviceCount?: number;
    pendingConflicts?: number;
  }> {
    try {
      if (!this.syncEnabled || !this.cloudProvider) {
        return { enabled: false };
      }

      let status;
      let conflicts;
      
      if (this.cloudProvider === 'googledrive') {
        status = await enhancedGoogleDriveService.getUserAccountSyncStatus();
        conflicts = await enhancedGoogleDriveService.getPendingUserAccountConflicts();
      } else if (this.cloudProvider === 'onedrive') {
        status = await enhancedOneDriveService.getUserAccountSyncStatus();
        conflicts = await enhancedOneDriveService.getPendingUserAccountConflicts();
      } else {
        return { enabled: false };
      }

      return {
        enabled: this.syncEnabled,
        provider: this.cloudProvider,
        lastSync: status.lastSync,
        deviceCount: status.deviceCount,
        pendingConflicts: conflicts.length
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return { enabled: false };
    }
  }

  /**
   * Get pending conflicts
   */
  async getPendingConflicts(): Promise<any[]> {
    try {
      if (!this.syncEnabled || !this.cloudProvider) {
        return [];
      }

      if (this.cloudProvider === 'googledrive') {
        return await enhancedGoogleDriveService.getPendingUserAccountConflicts();
      } else if (this.cloudProvider === 'onedrive') {
        return await enhancedOneDriveService.getPendingUserAccountConflicts();
      }

      return [];
    } catch (error) {
      console.error('Error getting pending conflicts:', error);
      return [];
    }
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string, 
    resolution: 'local' | 'cloud' | 'merge'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.syncEnabled || !this.cloudProvider) {
        return { success: false, error: 'Sync not initialized' };
      }

      let result;
      if (this.cloudProvider === 'googledrive') {
        // Map resolution values for Google Drive
        const googleResolution = resolution === 'local' ? 'use_local' : 
                                resolution === 'cloud' ? 'use_cloud' : 
                                'merge_custom';
        result = await enhancedGoogleDriveService.resolveUserAccountConflict(conflictId, googleResolution);
      } else if (this.cloudProvider === 'onedrive') {
        result = await enhancedOneDriveService.resolveUserAccountConflict(conflictId, resolution);
      } else {
        return { success: false, error: 'Unsupported cloud provider' };
      }

      if (result.success) {
        console.log(`Conflict ${conflictId} resolved with strategy: ${resolution}`);
      }

      return result;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Disable cross-device synchronization
   */
  async disable(): Promise<{ success: boolean; error?: string }> {
    try {
      this.stopAutoSync();

      if (this.cloudProvider) {
        let result;
        if (this.cloudProvider === 'googledrive') {
          result = await enhancedGoogleDriveService.disableUserAccountSync();
        } else if (this.cloudProvider === 'onedrive') {
          result = await enhancedOneDriveService.disableUserAccountSync();
        } else {
          result = { success: true };
        }

        if (!result.success) {
          return result;
        }
      }

      this.syncEnabled = false;
      this.cloudProvider = null;
      this.cloudAuthInfo = null;

      console.log('Cross-device sync disabled');
      return { success: true };
    } catch (error) {
      console.error('Error disabling cross-device sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if sync is enabled
   */
  isEnabled(): boolean {
    return this.syncEnabled;
  }

  /**
   * Get current cloud provider
   */
  getCloudProvider(): CloudProvider | null {
    return this.cloudProvider;
  }

  /**
   * Force sync all local users to cloud
   */
  async forceSyncAllUsers(users: User[]): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.syncEnabled || !this.cloudAuthInfo) {
        return { success: false, error: 'Sync not initialized' };
      }

      console.log(`Force syncing ${users.length} users to cloud...`);
      
      // Sync users using the existing sync method
      const conflicts = await userAccountSyncService.syncUserAccounts(this.cloudAuthInfo);
      
      console.log('Force sync completed successfully');
      if (conflicts.length > 0) {
        console.log(`Force sync completed with ${conflicts.length} conflicts`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error in force sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const crossDeviceSyncManager = new CrossDeviceSyncManager();