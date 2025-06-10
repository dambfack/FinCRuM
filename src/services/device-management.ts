import { User } from '@/lib/types';
import { getCloudDatabase } from './shared-cloud-database';
import { UserManagementService } from './user-management';
import { getData, saveData } from '@/lib/utils';
import { DataItemType } from '@/lib/types';

interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'web';
  platform: string;
  userAgent: string;
  registeredAt: string;
  lastActiveAt: string;
  isActive: boolean;
  userId: string;
  ipAddress?: string;
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
}

interface DeviceAuthRequest {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'web';
  platform: string;
  userAgent: string;
  userId: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
}

interface SyncStatus {
  deviceId: string;
  lastSyncAt: string;
  syncInProgress: boolean;
  lastSyncResult: 'success' | 'error' | 'conflict';
  conflictCount: number;
  errorMessage?: string;
}

export class DeviceManagementService {
  private static instance: DeviceManagementService;
  private userManagement: UserManagementService;
  private currentDeviceId: string;

  private constructor() {
    this.userManagement = UserManagementService.getInstance();
    this.currentDeviceId = '';
  }

  public static getInstance(): DeviceManagementService {
    if (!DeviceManagementService.instance) {
      DeviceManagementService.instance = new DeviceManagementService();
    }
    return DeviceManagementService.instance;
  }

  /**
   * Generate a unique device ID based on browser fingerprint
   */
  private generateDeviceId(): string {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      // Server-side fallback - generate a simple ID
      return `device_server_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `device_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
  }

  /**
   * Get current device ID
   */
  public getCurrentDeviceId(): string {
    if (!this.currentDeviceId) {
      this.currentDeviceId = this.generateDeviceId();
    }
    return this.currentDeviceId;
  }

  /**
   * Get device information
   */
  private getDeviceInfo(userId: string): DeviceInfo {
    const platform = this.detectPlatform();
    const deviceType = this.detectDeviceType();
    
    return {
      id: this.currentDeviceId,
      name: this.generateDeviceName(platform, deviceType),
      type: deviceType,
      platform,
      userAgent: navigator.userAgent,
      registeredAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      isActive: true,
      userId,
      location: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
  }

  /**
   * Detect platform
   */
  private detectPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('windows')) return 'Windows';
    if (userAgent.includes('mac')) return 'macOS';
    if (userAgent.includes('linux')) return 'Linux';
    if (userAgent.includes('android')) return 'Android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS';
    
    return 'Unknown';
  }

  /**
   * Detect device type
   */
  private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' | 'web' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('mobile') && !userAgent.includes('tablet')) {
      return 'mobile';
    }
    if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
      return 'tablet';
    }
    if (userAgent.includes('electron')) {
      return 'desktop';
    }
    
    return 'web';
  }

  /**
   * Generate device name
   */
  private generateDeviceName(platform: string, deviceType: string): string {
    const browserName = this.getBrowserName();
    return `${platform} ${deviceType} (${browserName})`;
  }

  /**
   * Get browser name
   */
  private getBrowserName(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome') && !userAgent.includes('edge')) return 'Chrome';
    if (userAgent.includes('firefox')) return 'Firefox';
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'Safari';
    if (userAgent.includes('edge')) return 'Edge';
    if (userAgent.includes('opera')) return 'Opera';
    
    return 'Unknown Browser';
  }

  /**
   * Register current device for a user
   */
  public async registerDevice(userId: string): Promise<{
    success: boolean;
    deviceId?: string;
    requiresApproval?: boolean;
    error?: string;
  }> {
    try {
      const user = await this.userManagement.getUser(userId);
      if (!user.success || !user.user) {
        return { success: false, error: 'User not found' };
      }

      const deviceInfo = this.getDeviceInfo(userId);
      
      // Check if device is already registered
      const existingDevices = user.user.deviceIds || [];
      if (existingDevices.includes(this.currentDeviceId)) {
        // Update last active time
        await this.updateDeviceActivity(this.currentDeviceId);
        return { success: true, deviceId: this.currentDeviceId, requiresApproval: false };
      }

      // For admin and partner roles, auto-approve device registration
      if (user.user.role === 'admin' || user.user.role === 'partner') {
        const updatedDeviceIds = [...existingDevices, this.currentDeviceId];
        const updateResult = await this.userManagement.updateUser(userId, {
          deviceIds: updatedDeviceIds,
          lastLoginAt: new Date().toISOString()
        });

        if (updateResult.success) {
          // Store device info locally
          this.storeDeviceInfo(deviceInfo);
          return { success: true, deviceId: this.currentDeviceId, requiresApproval: false };
        }
        
        return { success: false, error: updateResult.error };
      }

      // For employee role, require approval
      const authRequest: DeviceAuthRequest = {
        deviceId: this.currentDeviceId,
        deviceName: deviceInfo.name,
        deviceType: deviceInfo.type,
        platform: deviceInfo.platform,
        userAgent: deviceInfo.userAgent,
        userId,
        requestedAt: new Date().toISOString(),
        status: 'pending'
      };

      // Store pending request
      const pendingRequests = getData<DeviceAuthRequest[]>('deviceAuthRequests') || [];
      pendingRequests.push(authRequest);
      saveData('deviceAuthRequests' as DataItemType, pendingRequests);

      // Sync with cloud
      const provider = getCloudDatabase().getPreferredProvider();
      if (provider) {
        await getCloudDatabase().syncWithCloud(provider);
      }

      return { 
        success: true, 
        deviceId: this.currentDeviceId, 
        requiresApproval: true 
      };
    } catch (error: any) {
      console.error('Error registering device:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store device info locally
   */
  private storeDeviceInfo(deviceInfo: DeviceInfo): void {
    const devices = getData<DeviceInfo[]>('registeredDevices') || [];
    const existingIndex = devices.findIndex(d => d.id === deviceInfo.id);
    
    if (existingIndex >= 0) {
      devices[existingIndex] = deviceInfo;
    } else {
      devices.push(deviceInfo);
    }
    
    saveData('registeredDevices' as DataItemType, devices);
  }

  /**
   * Update device activity timestamp
   */
  public async updateDeviceActivity(deviceId: string): Promise<void> {
    const devices = getData<DeviceInfo[]>('registeredDevices') || [];
    const deviceIndex = devices.findIndex(d => d.id === deviceId);
    
    if (deviceIndex >= 0) {
      devices[deviceIndex].lastActiveAt = new Date().toISOString();
      saveData('registeredDevices' as DataItemType, devices);
    }
  }

  /**
   * Get pending device authorization requests
   */
  public getPendingAuthRequests(): DeviceAuthRequest[] {
    return getData<DeviceAuthRequest[]>('deviceAuthRequests') || [];
  }

  /**
   * Approve device authorization request
   */
  public async approveDeviceRequest(
    requestId: string, 
    approverId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requests = getData<DeviceAuthRequest[]>('deviceAuthRequests') || [];
      const requestIndex = requests.findIndex(r => r.deviceId === requestId);
      
      if (requestIndex === -1) {
        return { success: false, error: 'Request not found' };
      }

      const request = requests[requestIndex];
      
      // Update user's device list
      const user = await this.userManagement.getUser(request.userId);
      if (!user.success || !user.user) {
        return { success: false, error: 'User not found' };
      }

      const updatedDeviceIds = [...(user.user.deviceIds || []), request.deviceId];
      const updateResult = await this.userManagement.updateUser(request.userId, {
        deviceIds: updatedDeviceIds
      });

      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }

      // Update request status
      requests[requestIndex] = {
        ...request,
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date().toISOString()
      };
      
      saveData('deviceAuthRequests' as DataItemType, requests);

      // Sync with cloud
      const provider = getCloudDatabase().getPreferredProvider();
      if (provider) {
        await getCloudDatabase().syncWithCloud(provider);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error approving device request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject device authorization request
   */
  public async rejectDeviceRequest(
    requestId: string, 
    approverId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requests = getData<DeviceAuthRequest[]>('deviceAuthRequests') || [];
      const requestIndex = requests.findIndex(r => r.deviceId === requestId);
      
      if (requestIndex === -1) {
        return { success: false, error: 'Request not found' };
      }

      // Update request status
      requests[requestIndex] = {
        ...requests[requestIndex],
        status: 'rejected',
        approvedBy: approverId,
        approvedAt: new Date().toISOString()
      };
      
      saveData('deviceAuthRequests' as DataItemType, requests);

      // Sync with cloud
      const provider = getCloudDatabase().getPreferredProvider();
      if (provider) {
        await getCloudDatabase().syncWithCloud(provider);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error rejecting device request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get registered devices for a user
   */
  public async getUserDevices(userId: string): Promise<{
    success: boolean;
    devices?: DeviceInfo[];
    error?: string;
  }> {
    try {
      const user = await this.userManagement.getUser(userId);
      if (!user.success || !user.user) {
        return { success: false, error: 'User not found' };
      }

      const allDevices = getData<DeviceInfo[]>('registeredDevices') || [];
      const userDevices = allDevices.filter(device => 
        user.user!.deviceIds?.includes(device.id)
      );

      return { success: true, devices: userDevices };
    } catch (error: any) {
      console.error('Error getting user devices:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Revoke device access
   */
  public async revokeDeviceAccess(
    userId: string, 
    deviceId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.userManagement.getUser(userId);
      if (!user.success || !user.user) {
        return { success: false, error: 'User not found' };
      }

      const updatedDeviceIds = (user.user.deviceIds || []).filter(id => id !== deviceId);
      const updateResult = await this.userManagement.updateUser(userId, {
        deviceIds: updatedDeviceIds
      });

      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }

      // Remove device info locally
      const devices = getData<DeviceInfo[]>('registeredDevices') || [];
      const filteredDevices = devices.filter(d => d.id !== deviceId);
      saveData('registeredDevices' as DataItemType, filteredDevices);

      // Sync with cloud
      const provider = getCloudDatabase().getPreferredProvider();
      if (provider) {
        await getCloudDatabase().syncWithCloud(provider);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error revoking device access:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if current device is authorized for user
   */
  public async isDeviceAuthorized(userId: string): Promise<boolean> {
    try {
      const user = await this.userManagement.getUser(userId);
      if (!user.success || !user.user) {
        return false;
      }

      return (user.user.deviceIds || []).includes(this.currentDeviceId);
    } catch (error) {
      console.error('Error checking device authorization:', error);
      return false;
    }
  }

  /**
   * Update sync status for device
   */
  public updateSyncStatus(status: Partial<SyncStatus>): void {
    const syncStatuses = getData<SyncStatus[]>('deviceSyncStatuses') || [];
    const existingIndex = syncStatuses.findIndex(s => s.deviceId === this.currentDeviceId);
    
    const updatedStatus: SyncStatus = {
      deviceId: this.currentDeviceId,
      lastSyncAt: new Date().toISOString(),
      syncInProgress: false,
      lastSyncResult: 'success',
      conflictCount: 0,
      ...status
    };

    if (existingIndex >= 0) {
      syncStatuses[existingIndex] = updatedStatus;
    } else {
      syncStatuses.push(updatedStatus);
    }
    
    saveData('deviceSyncStatuses' as DataItemType, syncStatuses);
  }

  /**
   * Get sync status for current device
   */
  public getSyncStatus(): SyncStatus | null {
    const syncStatuses = getData<SyncStatus[]>('deviceSyncStatuses') || [];
    return syncStatuses.find(s => s.deviceId === this.currentDeviceId) || null;
  }

  /**
   * Get all sync statuses (for admin/partner users)
   */
  public getAllSyncStatuses(): SyncStatus[] {
    return getData<SyncStatus[]>('deviceSyncStatuses') || [];
  }
}

// Export singleton instance getter function to avoid SSR issues
export const getDeviceManager = () => DeviceManagementService.getInstance();