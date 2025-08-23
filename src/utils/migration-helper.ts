import { User, LocalData, CloudProvider, CloudAuthInfo } from '@/lib/types';
// Dynamic import to prevent server-side modules from being bundled on client
// import { crossDeviceSyncManager } from '@/services/cross-device-sync-manager';
import { userAccountSyncService } from '@/services/user-account-sync';
import { getDeviceManager } from '@/services/device-management';

/**
 * Migration Helper for Cross-Device User Account Synchronization
 * Helps existing FinCRuM installations migrate to the new sync system
 */
export class MigrationHelper {
  /**
   * Check if migration is needed
   */
  static async checkMigrationNeeded(): Promise<{
    needed: boolean;
    reason?: string;
    userCount?: number;
  }> {
    try {
      // Check if there are existing local users
      const localData = localStorage.getItem('fincrumData');
      if (!localData) {
        return { needed: false, reason: 'No existing data found' };
      }

      const data = JSON.parse(localData) as LocalData;
      const users = data.users || [];
      
      if (users.length === 0) {
        return { needed: false, reason: 'No users found' };
      }

      // Check if user account sync is already configured
      const syncConfig = data.userAccountSyncConfig;
      if (syncConfig && syncConfig.enabled) {
        return { needed: false, reason: 'Sync already configured' };
      }

      return {
        needed: true,
        reason: 'Local users found without sync configuration',
        userCount: users.length
      };
    } catch (error) {
      console.error('Error checking migration status:', error);
      return {
        needed: false,
        reason: 'Error checking migration status'
      };
    }
  }

  /**
   * Perform migration to cross-device sync
   */
  static async performMigration(
    cloudProvider: CloudProvider,
    cloudAuthInfo: CloudAuthInfo,
    options: {
      backupExisting?: boolean;
      enableAutoSync?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    error?: string;
    migratedUsers?: number;
    backupLocation?: string;
  }> {
    try {
      console.log('Starting migration to cross-device sync...');

      // Step 1: Backup existing data if requested
      let backupLocation: string | undefined;
      if (options.backupExisting) {
        const backupResult = await this.createMigrationBackup();
        if (backupResult.success) {
          backupLocation = backupResult.location;
          console.log('Backup created at:', backupLocation);
        } else {
          console.warn('Backup failed:', backupResult.error);
        }
      }

      // Step 2: Get existing users
      const localData = localStorage.getItem('fincrumData');
      if (!localData) {
        return { success: false, error: 'No existing data found' };
      }

      const data = JSON.parse(localData) as LocalData;
      const users = data.users || [];

      if (users.length === 0) {
        return { success: false, error: 'No users to migrate' };
      }

      console.log(`Migrating ${users.length} users...`);

      // Step 3: Initialize cross-device sync
      const { crossDeviceSyncManager } = await import('@/services/cross-device-sync-manager');
      const initResult = await crossDeviceSyncManager.initialize(cloudProvider, cloudAuthInfo);
      if (!initResult.success) {
        return {
          success: false,
          error: `Failed to initialize sync: ${initResult.error}`
        };
      }

      // Step 4: Migrate users to encrypted format and upload
      const migrationResult = await crossDeviceSyncManager.forceSyncAllUsers(users);
      if (!migrationResult.success) {
        return {
          success: false,
          error: `Failed to migrate users: ${migrationResult.error}`
        };
      }

      // Step 5: Update local data with sync configuration
      const updatedData: LocalData = {
        ...data,
        userAccountSyncConfig: {
          enabled: true,
          autoResolveConflicts: false,
          syncFrequency: options.enableAutoSync ? 'hourly' : 'manual',
          encryptionEnabled: true,
          deviceTrustRequired: true,
          maxDevices: 10,
          passwordExpiryDays: 90
        },
        deviceRegistration: {
          deviceId: getDeviceManager().getCurrentDeviceId(),
          deviceName: `${typeof navigator !== 'undefined' ? navigator.platform : 'Unknown'} - ${new Date().toLocaleDateString()}`,
          deviceFingerprint: {
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
              screenResolution: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '1920x1080',
              timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
              language: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
            platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown'
          },
          registrationToken: '',
          registeredAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          isActive: true,
          cloudProvider,
          encryptionKeyVersion: 1
        }
      };

      localStorage.setItem('fincrumData', JSON.stringify(updatedData));

      // Step 6: Start auto-sync if requested
      if (options.enableAutoSync) {
        await userAccountSyncService.enableSync(cloudAuthInfo);
      }

      console.log('Migration completed successfully');
      return {
        success: true,
        migratedUsers: users.length,
        backupLocation
      };
    } catch (error) {
      console.error('Migration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a backup of existing data before migration
   */
  private static async createMigrationBackup(): Promise<{
    success: boolean;
    location?: string;
    error?: string;
  }> {
    try {
      const localData = localStorage.getItem('fincrumData');
      if (!localData) {
        return { success: false, error: 'No data to backup' };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `fincrumData_backup_${timestamp}`;
      
      // Store backup in localStorage with timestamp
      localStorage.setItem(backupKey, localData);
      
      // Also try to save to file if possible (browser environment)
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const blob = new Blob([localData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `fincrumData_backup_${timestamp}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (fileError) {
          console.warn('Could not create file backup:', fileError);
        }
      }

      return {
        success: true,
        location: backupKey
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Restore from backup
   */
  static async restoreFromBackup(backupKey: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        return { success: false, error: 'Backup not found' };
      }

      // Validate backup data
      const data = JSON.parse(backupData) as LocalData;
      if (!data.users) {
        return { success: false, error: 'Invalid backup data' };
      }

      // Restore data
      localStorage.setItem('fincrumData', backupData);
      
      // Disable sync if it was enabled
      const { crossDeviceSyncManager } = await import('@/services/cross-device-sync-manager');
      await crossDeviceSyncManager.disable();

      console.log('Data restored from backup:', backupKey);
      return { success: true };
    } catch (error) {
      console.error('Error restoring from backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * List available backups
   */
  static listBackups(): Array<{
    key: string;
    timestamp: string;
    size: number;
  }> {
    const backups: Array<{ key: string; timestamp: string; size: number }> = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('fincrumData_backup_')) {
        const data = localStorage.getItem(key);
        if (data) {
          const timestamp = key.replace('fincrumData_backup_', '').replace(/-/g, ':');
          backups.push({
            key,
            timestamp,
            size: data.length
          });
        }
      }
    }
    
    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * Clean up old backups (keep only the most recent 5)
   */
  static cleanupOldBackups(): void {
    const backups = this.listBackups();
    const toDelete = backups.slice(5); // Keep only 5 most recent
    
    toDelete.forEach(backup => {
      localStorage.removeItem(backup.key);
      console.log('Removed old backup:', backup.key);
    });
  }

  /**
   * Validate sync configuration
   */
  static async validateSyncConfiguration(): Promise<{
    valid: boolean;
    issues?: string[];
  }> {
    const issues: string[] = [];
    
    try {
      const { crossDeviceSyncManager } = await import('@/services/cross-device-sync-manager');
      
      // Check if sync is enabled
      if (!crossDeviceSyncManager.isEnabled()) {
        issues.push('Cross-device sync is not enabled');
      }

      // Check cloud provider configuration
      const provider = crossDeviceSyncManager.getCloudProvider();
      if (!provider) {
        issues.push('No cloud provider configured');
      }

      // Check device registration
      const deviceManager = getDeviceManager();
      const deviceId = deviceManager.getCurrentDeviceId();
      if (!deviceId) {
        issues.push('Device not properly registered');
      }

      // Check sync status
      const status = await crossDeviceSyncManager.getSyncStatus();
      if (!status.enabled) {
        issues.push('Sync status indicates disabled state');
      }

      // Check for pending conflicts
      const conflicts = await crossDeviceSyncManager.getPendingConflicts();
      if (conflicts.length > 0) {
        issues.push(`${conflicts.length} pending conflicts need resolution`);
      }

      return {
        valid: issues.length === 0,
        issues: issues.length > 0 ? issues : undefined
      };
    } catch (error) {
      console.error('Error validating sync configuration:', error);
      return {
        valid: false,
        issues: ['Error validating configuration: ' + (error instanceof Error ? error.message : 'Unknown error')]
      };
    }
  }
}

export default MigrationHelper;