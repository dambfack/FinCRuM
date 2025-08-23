/**
 * User Account Synchronization Service
 * Handles cross-device synchronization of local user accounts with encryption
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CloudAuthInfo,
  EncryptedUserAccount,
  UserAccountSyncData,
  UserAccountConflict,
  UserAccountSyncConfig,
  DeviceRegistration,
  User,
  UserPermissions,
  LocalData
} from '../lib/types';
import {
  generateDeviceFingerprint,
  encryptPassword,
  decryptPassword,
  generateDeviceRegistrationToken,
  validateDeviceRegistrationToken,
  DeviceFingerprint,
  EncryptedData
} from '../utils/encryption';
import { getData, saveData } from '../lib/utils';
import { DataItemType } from '../lib/types';

export class UserAccountSyncService {
  private deviceFingerprint: DeviceFingerprint;
  private isInitialized = false;

  constructor() {
    this.deviceFingerprint = generateDeviceFingerprint();
  }

  /**
   * Initialize the service and register device if needed
   */
  async initialize(cloudAuth: CloudAuthInfo): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if device is already registered
      const deviceRegistration = getData<DeviceRegistration>(DataItemType.DeviceRegistration);
      if (!deviceRegistration) {
        await this.registerDevice(cloudAuth);
      } else {
        // Validate existing registration
        const isValid = await validateDeviceRegistrationToken(
          deviceRegistration.registrationToken,
          cloudAuth,
          this.deviceFingerprint
        );
        
        if (!isValid) {
          console.warn('Device registration invalid, re-registering...');
          await this.registerDevice(cloudAuth);
        }
      }

      // Initialize sync config if not exists
      const syncConfig = getData<UserAccountSyncConfig>(DataItemType.UserAccountSyncConfig);
      if (!syncConfig) {
        const defaultConfig: UserAccountSyncConfig = {
          enabled: false, // Disabled by default for security
          autoResolveConflicts: true,
          syncFrequency: 'manual',
          encryptionEnabled: true,
          deviceTrustRequired: true,
          maxDevices: 5,
          passwordExpiryDays: 30
        };
        
        saveData(DataItemType.UserAccountSyncConfig, defaultConfig);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize UserAccountSyncService:', error);
      throw error;
    }
  }

  /**
   * Register current device for user account synchronization
   */
  private async registerDevice(cloudAuth: CloudAuthInfo): Promise<void> {
    const registrationToken = await generateDeviceRegistrationToken(
      cloudAuth,
      this.deviceFingerprint
    );

    const deviceRegistration: DeviceRegistration = {
      deviceId: this.deviceFingerprint.deviceId,
      deviceName: `${this.deviceFingerprint.platform} - ${new Date().toLocaleDateString()}`,
      deviceFingerprint: {
        userAgent: this.deviceFingerprint.userAgent,
        screenResolution: this.deviceFingerprint.screenResolution,
        timezone: this.deviceFingerprint.timezone,
        language: this.deviceFingerprint.language,
        platform: this.deviceFingerprint.platform
      },
      registrationToken,
      registeredAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      isActive: true,
      cloudProvider: cloudAuth.provider,
      encryptionKeyVersion: 1
    };

    saveData(DataItemType.DeviceRegistration, deviceRegistration);
  }

  /**
   * Enable user account synchronization
   */
  async enableSync(cloudAuth: CloudAuthInfo): Promise<void> {
    await this.initialize(cloudAuth);
    
    const config = getData<UserAccountSyncConfig>(DataItemType.UserAccountSyncConfig)!;
    config.enabled = true;
    
    saveData(DataItemType.UserAccountSyncConfig, config);
    
    // Perform initial sync
    await this.syncUserAccounts(cloudAuth);
  }

  /**
   * Disable user account synchronization
   */
  async disableSync(): Promise<void> {
    const config = getData<UserAccountSyncConfig>(DataItemType.UserAccountSyncConfig);
    if (config) {
      config.enabled = false;
      saveData(DataItemType.UserAccountSyncConfig, config);
    }
  }

  /**
   * Convert local User to EncryptedUserAccount
   */
  private async convertToEncryptedAccount(
    user: User,
    cloudAuth: CloudAuthInfo
  ): Promise<EncryptedUserAccount> {
    if (!user.pin) {
      throw new Error(`User ${user.name} does not have a PIN set for synchronization`);
    }

    const encryptedPassword = await encryptPassword(
      user.pin,
      cloudAuth,
      this.deviceFingerprint
    );

    return {
      id: user.id,
      username: user.email,
      encryptedPassword,
      role: user.role,
      permissions: user.permissions || this.getDefaultPermissions(user.role),
      profileData: {
        name: user.name,
        email: user.email,
        profilePictureUrl: user.profilePictureUrl,
        createdAt: user.createdAt || new Date().toISOString(),
        lastLoginAt: user.lastLoginAt,
        isActive: user.isActive !== false,
        createdByUserId: user.createdByUserId
      },
      deviceOrigin: this.deviceFingerprint.deviceId,
      lastModified: new Date().toISOString(),
      syncVersion: 1
    };
  }

  /**
   * Convert EncryptedUserAccount back to local User
   */
  private async convertFromEncryptedAccount(
    encryptedAccount: EncryptedUserAccount,
    cloudAuth: CloudAuthInfo
  ): Promise<User> {
    const decryptedPin = await decryptPassword(
      encryptedAccount.encryptedPassword,
      cloudAuth,
      this.deviceFingerprint
    );

    return {
      id: encryptedAccount.id,
      name: encryptedAccount.profileData.name,
      email: encryptedAccount.profileData.email,
      role: encryptedAccount.role,
      pin: decryptedPin,
      profilePictureUrl: encryptedAccount.profileData.profilePictureUrl,
      permissions: encryptedAccount.permissions,
      createdAt: encryptedAccount.profileData.createdAt,
      lastLoginAt: encryptedAccount.profileData.lastLoginAt,
      isActive: encryptedAccount.profileData.isActive,
      createdByUserId: encryptedAccount.profileData.createdByUserId,
      deviceIds: [this.deviceFingerprint.deviceId] // Add current device
    };
  }

  /**
   * Get default permissions for a role
   */
  private getDefaultPermissions(role: 'admin' | 'partner' | 'employee'): UserPermissions {
    switch (role) {
      case 'admin':
        return {
          canCreateUsers: true,
          canDeleteUsers: true,
          canModifyUsers: true,
          canManageUsers: true,
          canViewAllContacts: true,
          canModifyAllContacts: true,
          canDeleteContacts: true,
          canApproveChanges: true,
          canAccessReports: true,
          canManageSettings: true,
          canSyncToCloud: true
        };
      case 'partner':
        return {
          canCreateUsers: true,
          canDeleteUsers: false,
          canModifyUsers: true,
          canManageUsers: true,
          canViewAllContacts: true,
          canModifyAllContacts: true,
          canDeleteContacts: true,
          canApproveChanges: true,
          canAccessReports: true,
          canManageSettings: false,
          canSyncToCloud: true
        };
      case 'employee':
        return {
          canCreateUsers: false,
          canDeleteUsers: false,
          canModifyUsers: false,
          canManageUsers: false,
          canViewAllContacts: true,
          canModifyAllContacts: false,
          canDeleteContacts: false,
          canApproveChanges: false,
          canAccessReports: false,
          canManageSettings: false,
          canSyncToCloud: false
        };
    }
  }

  /**
   * Sync user accounts with cloud storage
   */
  async syncUserAccounts(cloudAuth: CloudAuthInfo): Promise<UserAccountConflict[]> {
    await this.initialize(cloudAuth);
    
    const config = getData<UserAccountSyncConfig>(DataItemType.UserAccountSyncConfig);
    
    if (!config?.enabled) {
      throw new Error('User account synchronization is not enabled');
    }

    try {
      // Get local users
      const localUsers = getData<User[]>(DataItemType.Users) || [];
      
      // Convert to encrypted accounts
      const localEncryptedAccounts: EncryptedUserAccount[] = [];
      for (const user of localUsers) {
        try {
          const encryptedAccount = await this.convertToEncryptedAccount(user, cloudAuth);
          localEncryptedAccounts.push(encryptedAccount);
        } catch (error) {
          console.warn(`Failed to encrypt account for user ${user.name}:`, error);
        }
      }

      // Get cloud sync data (this would be implemented in the cloud service)
      const cloudSyncData = await this.getCloudSyncData(cloudAuth);
      
      // Merge accounts and detect conflicts
      const { mergedAccounts, conflicts } = await this.mergeAccountsWithConflictDetection(
        localEncryptedAccounts,
        cloudSyncData?.encryptedAccounts || [],
        config.autoResolveConflicts
      );

      // Update local sync data
      const deviceRegistration = getData<DeviceRegistration>(DataItemType.DeviceRegistration)!;
      const updatedSyncData: UserAccountSyncData = {
        encryptedAccounts: mergedAccounts,
        deviceRegistrations: [
          ...(cloudSyncData?.deviceRegistrations || []),
          deviceRegistration
        ].filter((device, index, array) => 
          array.findIndex(d => d.deviceId === device.deviceId) === index
        ),
        masterDeviceId: cloudSyncData?.masterDeviceId || this.deviceFingerprint.deviceId,
        syncVersion: (cloudSyncData?.syncVersion || 0) + 1,
        lastSyncAt: new Date().toISOString(),
        conflictResolutionLog: [
          ...(cloudSyncData?.conflictResolutionLog || []),
          ...conflicts
        ]
      };

      // Convert back to local users
      const mergedUsers: User[] = [];
      for (const encryptedAccount of mergedAccounts) {
        try {
          const user = await this.convertFromEncryptedAccount(encryptedAccount, cloudAuth);
          mergedUsers.push(user);
        } catch (error) {
          console.warn(`Failed to decrypt account ${encryptedAccount.username}:`, error);
        }
      }

      // Update local data
      saveData(DataItemType.Users, mergedUsers);
      saveData(DataItemType.UserAccountSyncData, updatedSyncData);

      // Save to cloud (this would be implemented in the cloud service)
      await this.saveCloudSyncData(cloudAuth, updatedSyncData);

      return conflicts;
    } catch (error) {
      console.error('User account sync failed:', error);
      throw error;
    }
  }

  /**
   * Merge accounts and detect conflicts
   */
  private async mergeAccountsWithConflictDetection(
    localAccounts: EncryptedUserAccount[],
    cloudAccounts: EncryptedUserAccount[],
    autoResolve: boolean
  ): Promise<{ mergedAccounts: EncryptedUserAccount[]; conflicts: UserAccountConflict[] }> {
    const mergedAccounts: EncryptedUserAccount[] = [];
    const conflicts: UserAccountConflict[] = [];
    const processedIds = new Set<string>();

    // Process local accounts
    for (const localAccount of localAccounts) {
      const cloudAccount = cloudAccounts.find(ca => ca.id === localAccount.id);
      
      if (!cloudAccount) {
        // New local account
        mergedAccounts.push(localAccount);
        processedIds.add(localAccount.id);
      } else {
        // Account exists in both - check for conflicts
        const conflict = this.detectAccountConflict(localAccount, cloudAccount);
        
        if (conflict) {
          if (autoResolve) {
            const resolved = this.autoResolveConflict(localAccount, cloudAccount);
            mergedAccounts.push(resolved.resolvedAccount!);
            conflicts.push(resolved);
          } else {
            // Manual resolution required
            conflict.requiresUserInput = true;
            conflicts.push(conflict);
            // Use most recent version for now
            const mostRecent = new Date(localAccount.lastModified) > new Date(cloudAccount.lastModified)
              ? localAccount : cloudAccount;
            mergedAccounts.push(mostRecent);
          }
        } else {
          // No conflict, use most recent
          const mostRecent = new Date(localAccount.lastModified) > new Date(cloudAccount.lastModified)
            ? localAccount : cloudAccount;
          mergedAccounts.push(mostRecent);
        }
        
        processedIds.add(localAccount.id);
      }
    }

    // Add cloud-only accounts
    for (const cloudAccount of cloudAccounts) {
      if (!processedIds.has(cloudAccount.id)) {
        mergedAccounts.push(cloudAccount);
      }
    }

    return { mergedAccounts, conflicts };
  }

  /**
   * Detect conflicts between local and cloud accounts
   */
  private detectAccountConflict(
    localAccount: EncryptedUserAccount,
    cloudAccount: EncryptedUserAccount
  ): UserAccountConflict | null {
    const conflicts: string[] = [];
    let conflictType: UserAccountConflict['conflictType'] = 'profile_difference';

    // Check password differences
    if (JSON.stringify(localAccount.encryptedPassword) !== JSON.stringify(cloudAccount.encryptedPassword)) {
      conflicts.push('password mismatch');
      conflictType = 'password_mismatch';
    }

    // Check permission differences
    if (JSON.stringify(localAccount.permissions) !== JSON.stringify(cloudAccount.permissions)) {
      conflicts.push('permission differences');
      conflictType = 'permission_difference';
    }

    // Check profile differences
    if (JSON.stringify(localAccount.profileData) !== JSON.stringify(cloudAccount.profileData)) {
      conflicts.push('profile data differences');
    }

    // Check device origin conflicts
    if (localAccount.deviceOrigin !== cloudAccount.deviceOrigin) {
      conflicts.push('different device origins');
      conflictType = 'device_conflict';
    }

    if (conflicts.length === 0) {
      return null;
    }

    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      username: localAccount.username,
      conflictType,
      localAccount,
      cloudAccount,
      resolutionMethod: 'pending',
      resolutionReason: `Detected conflicts: ${conflicts.join(', ')}`,
      deviceId: this.deviceFingerprint.deviceId,
      requiresUserInput: false
    };
  }

  /**
   * Auto-resolve account conflicts
   */
  private autoResolveConflict(
    localAccount: EncryptedUserAccount,
    cloudAccount: EncryptedUserAccount
  ): UserAccountConflict {
    // Use timestamp-based resolution - most recent wins
    const localTime = new Date(localAccount.lastModified).getTime();
    const cloudTime = new Date(cloudAccount.lastModified).getTime();
    
    const useLocal = localTime > cloudTime;
    const resolvedAccount = useLocal ? localAccount : cloudAccount;
    
    // Merge permissions (union of both)
    resolvedAccount.permissions = {
      ...cloudAccount.permissions,
      ...localAccount.permissions,
      // For boolean permissions, use OR logic (more permissive)
      canCreateUsers: localAccount.permissions.canCreateUsers || cloudAccount.permissions.canCreateUsers,
      canDeleteUsers: localAccount.permissions.canDeleteUsers || cloudAccount.permissions.canDeleteUsers,
      canModifyUsers: localAccount.permissions.canModifyUsers || cloudAccount.permissions.canModifyUsers,
      canViewAllContacts: localAccount.permissions.canViewAllContacts || cloudAccount.permissions.canViewAllContacts,
      canModifyAllContacts: localAccount.permissions.canModifyAllContacts || cloudAccount.permissions.canModifyAllContacts,
      canDeleteContacts: localAccount.permissions.canDeleteContacts || cloudAccount.permissions.canDeleteContacts,
      canApproveChanges: localAccount.permissions.canApproveChanges || cloudAccount.permissions.canApproveChanges,
      canAccessReports: localAccount.permissions.canAccessReports || cloudAccount.permissions.canAccessReports,
      canManageSettings: localAccount.permissions.canManageSettings || cloudAccount.permissions.canManageSettings,
      canSyncToCloud: localAccount.permissions.canSyncToCloud || cloudAccount.permissions.canSyncToCloud
    };

    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      username: localAccount.username,
      conflictType: 'profile_difference',
      localAccount,
      cloudAccount,
      resolvedAccount,
      resolutionMethod: useLocal ? 'local_wins' : 'cloud_wins',
      resolutionReason: `Auto-resolved using timestamp (${useLocal ? 'local' : 'cloud'} version is more recent) with merged permissions`,
      deviceId: this.deviceFingerprint.deviceId,
      requiresUserInput: false
    };
  }

  /**
   * Get sync data from cloud storage (placeholder - to be implemented by cloud services)
   */
  private async getCloudSyncData(cloudAuth: CloudAuthInfo): Promise<UserAccountSyncData | null> {
    // This would be implemented by the specific cloud service (Google Drive, OneDrive)
    // For now, return null to indicate no cloud data
    return null;
  }

  /**
   * Save sync data to cloud storage (placeholder - to be implemented by cloud services)
   */
  private async saveCloudSyncData(cloudAuth: CloudAuthInfo, syncData: UserAccountSyncData): Promise<void> {
    // This would be implemented by the specific cloud service (Google Drive, OneDrive)
    console.log('Saving user account sync data to cloud:', syncData);
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): { enabled: boolean; lastSync?: string; conflicts: number } {
    const config = getData<UserAccountSyncConfig>(DataItemType.UserAccountSyncConfig);
    const syncData = getData<UserAccountSyncData>(DataItemType.UserAccountSyncData);
    
    return {
      enabled: config?.enabled || false,
      lastSync: syncData?.lastSyncAt,
      conflicts: syncData?.conflictResolutionLog.filter(c => c.requiresUserInput).length || 0
    };
  }

  /**
   * Get pending conflicts that require user input
   */
  getPendingConflicts(): UserAccountConflict[] {
    const syncData = getData<UserAccountSyncData>(DataItemType.UserAccountSyncData);
    
    return syncData?.conflictResolutionLog.filter(c => c.requiresUserInput) || [];
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflict(
    conflictId: string,
    resolution: 'use_local' | 'use_cloud' | 'merge_custom',
    customData?: Partial<EncryptedUserAccount>
  ): Promise<void> {
    const syncData = getData<UserAccountSyncData>(DataItemType.UserAccountSyncData);
    
    if (!syncData) {
      throw new Error('No sync data available');
    }

    const conflictIndex = syncData.conflictResolutionLog.findIndex(c => c.id === conflictId);
    if (conflictIndex === -1) {
      throw new Error('Conflict not found');
    }

    const conflict = syncData.conflictResolutionLog[conflictIndex];
    
    let resolvedAccount: EncryptedUserAccount;
    let resolutionMethod: UserAccountConflict['resolutionMethod'];
    let resolutionReason: string;

    switch (resolution) {
      case 'use_local':
        resolvedAccount = conflict.localAccount;
        resolutionMethod = 'local_wins';
        resolutionReason = 'User chose to keep local version';
        break;
      case 'use_cloud':
        resolvedAccount = conflict.cloudAccount;
        resolutionMethod = 'cloud_wins';
        resolutionReason = 'User chose to keep cloud version';
        break;
      case 'merge_custom':
        if (!customData) {
          throw new Error('Custom data required for merge resolution');
        }
        resolvedAccount = { ...conflict.localAccount, ...customData };
        resolutionMethod = 'manual_merge';
        resolutionReason = 'User provided custom merge resolution';
        break;
    }

    // Update conflict
    conflict.resolvedAccount = resolvedAccount;
    conflict.resolutionMethod = resolutionMethod;
    conflict.resolutionReason = resolutionReason;
    conflict.requiresUserInput = false;

    // Update account in encrypted accounts list
    const accountIndex = syncData.encryptedAccounts.findIndex(a => a.id === resolvedAccount.id);
    if (accountIndex !== -1) {
      syncData.encryptedAccounts[accountIndex] = resolvedAccount;
    }

    saveData(DataItemType.UserAccountSyncData, syncData);
  }
}

// Export singleton instance
export const userAccountSyncService = new UserAccountSyncService();