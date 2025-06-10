import { User, UserPermissions } from '@/lib/types';
import { getCloudDatabase } from './shared-cloud-database';
import { getData, saveData } from '@/lib/utils';
import { DataItemType } from '@/lib/types';
import crypto from 'crypto';

/**
 * User Management Service for cloud-first multi-user authentication
 * Handles role-based access control and cloud-stored PIN management
 */
export class UserManagementService {
  private static instance: UserManagementService;

  private constructor() {}

  public static getInstance(): UserManagementService {
    if (!UserManagementService.instance) {
      UserManagementService.instance = new UserManagementService();
    }
    return UserManagementService.instance;
  }

  /**
   * Get default permissions based on user role
   */
  public getDefaultPermissions(role: 'admin' | 'partner' | 'employee'): UserPermissions {
    switch (role) {
      case 'admin':
        return {
          canCreateUsers: true,
          canDeleteUsers: true,
          canModifyUsers: true,
          canViewAllContacts: true,
          canModifyAllContacts: true,
          canDeleteContacts: true,
          canApproveChanges: true,
          canAccessReports: true,
          canManageSettings: true,
          canSyncToCloud: true,
        };
      case 'partner':
        return {
          canCreateUsers: true,
          canDeleteUsers: false,
          canModifyUsers: true,
          canViewAllContacts: true,
          canModifyAllContacts: true,
          canDeleteContacts: true,
          canApproveChanges: true,
          canAccessReports: true,
          canManageSettings: false,
          canSyncToCloud: true,
        };
      case 'employee':
        return {
          canCreateUsers: false,
          canDeleteUsers: false,
          canModifyUsers: false,
          canViewAllContacts: false,
          canModifyAllContacts: false,
          canDeleteContacts: false,
          canApproveChanges: false,
          canAccessReports: false,
          canManageSettings: false,
          canSyncToCloud: false,
        };
    }
  }

  /**
   * Hash PIN for secure cloud storage
   */
  public hashPin(pin: string, userId: string): string {
    const salt = userId.substring(0, 8); // Use part of userId as salt
    return crypto.createHash('sha256').update(pin + salt).digest('hex');
  }

  /**
   * Verify PIN against cloud-stored hash
   */
  public verifyPin(pin: string, userId: string, cloudPinHash: string): boolean {
    console.log('[UserManagement] verifyPin called with pin:', pin, 'userId:', userId, 'cloudPinHash:', cloudPinHash);
    const hashedPin = this.hashPin(pin, userId);
    console.log('[UserManagement] Generated hashedPin:', hashedPin);
    const isValid = hashedPin === cloudPinHash;
    console.log('[UserManagement] PIN verification result:', isValid);
    return isValid;
  }

  /**
   * Generate unique device ID for current device
   */
  public generateDeviceId(): string {
    const existingDeviceId = localStorage.getItem('deviceId');
    if (existingDeviceId) {
      return existingDeviceId;
    }

    // Generate UUID v4 compatible with browser environment
    const deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    localStorage.setItem('deviceId', deviceId);
    return deviceId;
  }

  /**
   * Create a new user account (admin/partner only)
   */
  public async createUser(
    userData: Omit<User, 'id' | 'permissions' | 'createdAt' | 'cloudPinHash' | 'deviceIds'>,
    pin: string,
    createdByUserId: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Verify creator has permission
      const creator = await this.getUserById(createdByUserId);
      if (!creator?.permissions?.canCreateUsers) {
        return { success: false, error: 'Insufficient permissions to create users' };
      }

      // Generate new user ID
      const userId = crypto.randomUUID();
      
      // Hash PIN for cloud storage
      const cloudPinHash = this.hashPin(pin, userId);
      
      // Create user object
      const newUser: User = {
        ...userData,
        id: userId,
        permissions: this.getDefaultPermissions(userData.role),
        createdAt: new Date().toISOString(),
        cloudPinHash,
        deviceIds: [],
        isActive: true,
        createdByUserId,
      };

      // Save to local storage
      const users = getData<User[]>(DataItemType.Users) || [];
      users.push(newUser);
      saveData(DataItemType.Users, users);

      // Sync to cloud
      await getCloudDatabase().syncToCloud('googledrive');
      await getCloudDatabase().syncToCloud('onedrive');

      return { success: true, user: newUser };
    } catch (error: any) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Authenticate user with PIN and register device
   */
  public async authenticateUser(
    userId: string,
    pin: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('[UserManagement] authenticateUser called with userId:', userId, 'pin:', pin);
      const user = await this.getUserById(userId);
      console.log('[UserManagement] Found user:', user);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Auto-activate default admin user if it's inactive
      if (!user.isActive && (user.role === 'admin' || user.role === 'partner') && user.email === 'admin@example.com') {
        console.log('[UserManagement] Auto-activating default admin user with role:', user.role);
        user.isActive = true;
        const users = getData<User[]>(DataItemType.Users) || [];
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          users[userIndex] = user;
          saveData<User[]>(DataItemType.Users, users);
          console.log('[UserManagement] Default admin user activated and saved');
        }
      }

      if (!user.isActive) {
        console.log('[UserManagement] User is not active');
        return { success: false, error: 'Account is inactive' };
      }

      // Verify PIN
      console.log('[UserManagement] Verifying PIN. cloudPinHash:', user.cloudPinHash);
      if (user.cloudPinHash && !this.verifyPin(pin, userId, user.cloudPinHash)) {
        console.log('[UserManagement] PIN verification failed');
        return { success: false, error: 'Invalid PIN' };
      }
      console.log('[UserManagement] PIN verification successful');

      // Register device if not already registered
      const deviceId = this.generateDeviceId();
      if (!user.deviceIds?.includes(deviceId)) {
        user.deviceIds = [...(user.deviceIds || []), deviceId];
        await this.updateUser(user);
      }

      // Update last login
      user.lastLoginAt = new Date().toISOString();
      await this.updateUser(user);

      console.log('[UserManagement] Authentication successful');
      return { success: true, user };
    } catch (error: any) {
      console.error('Error authenticating user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user by ID
   */
  public async getUserById(userId: string): Promise<User | null> {
    const users = getData<User[]>(DataItemType.Users) || [];
    return users.find(user => user.id === userId) || null;
  }

  /**
   * Update user data
   */
  public async updateUser(user: User): Promise<{ success: boolean; error?: string }> {
    try {
      const users = getData<User[]>(DataItemType.Users) || [];
      const userIndex = users.findIndex(u => u.id === user.id);
      
      if (userIndex === -1) {
        return { success: false, error: 'User not found' };
      }

      users[userIndex] = user;
      saveData(DataItemType.Users, users);

      // Sync to cloud
      await getCloudDatabase().syncToCloud('googledrive');
      await getCloudDatabase().syncToCloud('onedrive');

      return { success: true };
    } catch (error: any) {
      console.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all users (admin/partner only)
   */
  public async getAllUsers(requestingUserId: string): Promise<{ success: boolean; users?: User[]; error?: string }> {
    try {
      const requestingUser = await this.getUserById(requestingUserId);
      if (!requestingUser?.permissions?.canViewAllContacts) {
        return { success: false, error: 'Insufficient permissions' };
      }

      const users = getData<User[]>(DataItemType.Users) || [];
      return { success: true, users };
    } catch (error: any) {
      console.error('Error getting all users:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Change user PIN
   */
  public async changeUserPin(
    userId: string,
    oldPin: string,
    newPin: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify old PIN if it exists
      if (user.cloudPinHash && !this.verifyPin(oldPin, userId, user.cloudPinHash)) {
        return { success: false, error: 'Invalid current PIN' };
      }

      // Set new PIN
      user.cloudPinHash = this.hashPin(newPin, userId);
      await this.updateUser(user);

      return { success: true };
    } catch (error: any) {
      console.error('Error changing user PIN:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const userManagement = UserManagementService.getInstance();