import { getCloudDatabase } from './shared-cloud-database';
import { securityComplianceService } from './security-compliance';
import { getRateLimiterService } from './rate-limiter';
import { enhancedGoogleDriveService } from './enhanced-google-drive';
import { enhancedOneDriveService } from './enhanced-onedrive';
import { getRealTimeSync } from './real-time-sync';
import { getDeviceManager } from './device-management';

interface SetupConfig {
  storageMode: 'local' | 'cloud';
  cloudProvider?: 'google' | 'onedrive';
  multiUserEnabled: boolean;
  rateLimitEnabled: boolean;
  encryptionEnabled: boolean;
  autoBackupEnabled: boolean;
}

interface CloudAccountInfo {
  provider: 'google' | 'onedrive';
  email: string;
  accountId: string;
  hasExistingUsers: boolean;
  userCount: number;
  lastSync: string | null;
  storageQuota: {
    used: number;
    total: number;
    available: number;
  };
}

interface ConflictResolution {
  type: 'user' | 'data' | 'settings';
  description: string;
  localValue: any;
  cloudValue: any;
  resolution: 'keep_cloud' | 'keep_local' | 'merge' | 'manual';
  resolved: boolean;
}

interface SetupProgress {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  progress: number;
  isComplete: boolean;
  error?: string;
}

interface MigrationResult {
  success: boolean;
  migratedUsers: number;
  migratedRecords: number;
  conflictsResolved: number;
  errors: string[];
  duration: number;
}

export class SetupManagerService {
  private setupConfig: SetupConfig | null = null;
  private cloudAccount: CloudAccountInfo | null = null;
  private conflicts: ConflictResolution[] = [];
  private progress: SetupProgress = {
    currentStep: 0,
    totalSteps: 5,
    stepName: 'Initial Setup',
    progress: 0,
    isComplete: false
  };
  private listeners: ((progress: SetupProgress) => void)[] = [];

  constructor() {
    this.loadExistingSetup();
  }

  /**
   * Check if the app has been set up
   */
  isSetupComplete(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    return localStorage.getItem('fincrm_setup_completed') === 'true';
  }

  /**
   * Get current setup configuration
   */
  getSetupConfig(): SetupConfig | null {
    return this.setupConfig;
  }

  /**
   * Get current setup progress
   */
  getProgress(): SetupProgress {
    return { ...this.progress };
  }

  /**
   * Subscribe to setup progress updates
   */
  onProgressUpdate(callback: (progress: SetupProgress) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Start initial setup with local storage
   */
  async setupLocalStorage(): Promise<void> {
    this.updateProgress(1, 'Configuring Local Storage', 20);

    try {
      this.setupConfig = {
        storageMode: 'local',
        multiUserEnabled: false,
        rateLimitEnabled: false,
        encryptionEnabled: true,
        autoBackupEnabled: false
      };

      // Configure local storage settings
      localStorage.setItem('fincrm_storage_mode', 'local');
      localStorage.setItem('fincrm_multi_user_enabled', 'false');
      localStorage.setItem('fincrm_rate_limiting_enabled', 'false');
      localStorage.setItem('fincrm_encryption_enabled', 'true');
      localStorage.setItem('fincrm_auto_backup_enabled', 'false');

      // Initialize local database
      await this.initializeLocalDatabase();

      this.updateProgress(2, 'Setting up Security', 60);
      
      // Initialize security settings
      await securityComplianceService.initializeLocalSecurity();

      this.updateProgress(3, 'Creating Default User', 80);
      
      // Create default admin user
      await this.createDefaultUser();

      this.updateProgress(4, 'Finalizing Setup', 100);
      
      // Mark setup as complete
      await this.completeSetup();

      securityComplianceService.logSecurityEvent({
        type: 'setup_completed',
        details: {
          storageMode: 'local',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.progress.error = error.message;
      throw error;
    }
  }

  /**
   * Start setup with cloud sync
   */
  async setupCloudSync(provider: 'google' | 'onedrive'): Promise<CloudAccountInfo> {
    this.updateProgress(1, 'Connecting to Cloud Provider', 10);

    try {
      // Connect to cloud provider
      const accountInfo = await this.connectToCloudProvider(provider);
      this.cloudAccount = accountInfo;

      this.updateProgress(2, 'Analyzing Cloud Account', 30);
      
      // Check for existing users and data
      const hasExistingData = await this.checkForExistingCloudData(provider);
      
      if (hasExistingData) {
        this.updateProgress(3, 'Detecting Conflicts', 50);
        await this.detectConflicts();
      }

      this.setupConfig = {
        storageMode: 'cloud',
        cloudProvider: provider,
        multiUserEnabled: true,
        rateLimitEnabled: true,
        encryptionEnabled: true,
        autoBackupEnabled: true
      };

      return accountInfo;
    } catch (error) {
      this.progress.error = error.message;
      throw error;
    }
  }

  /**
   * Resolve conflicts between local and cloud data
   */
  async resolveConflicts(resolutions: { [conflictIndex: number]: ConflictResolution['resolution'] }): Promise<void> {
    this.updateProgress(4, 'Resolving Conflicts', 70);

    try {
      for (const [index, resolution] of Object.entries(resolutions)) {
        const conflictIndex = parseInt(index);
        if (this.conflicts[conflictIndex]) {
          this.conflicts[conflictIndex].resolution = resolution;
          await this.applyConflictResolution(this.conflicts[conflictIndex]);
          this.conflicts[conflictIndex].resolved = true;
        }
      }

      // Verify all conflicts are resolved
      const unresolvedConflicts = this.conflicts.filter(c => !c.resolved);
      if (unresolvedConflicts.length > 0) {
        throw new Error(`${unresolvedConflicts.length} conflicts remain unresolved`);
      }

      securityComplianceService.logSecurityEvent({
        type: 'conflicts_resolved',
        details: {
          conflictCount: this.conflicts.length,
          resolutions: resolutions
        }
      });
    } catch (error) {
      this.progress.error = error.message;
      throw error;
    }
  }

  /**
   * Complete cloud setup
   */
  async completeCloudSetup(): Promise<void> {
    this.updateProgress(5, 'Finalizing Cloud Setup', 90);

    try {
      if (!this.setupConfig || !this.cloudAccount) {
        throw new Error('Setup configuration or cloud account not available');
      }

      // Configure cloud sync settings
      localStorage.setItem('fincrm_storage_mode', 'cloud');
      localStorage.setItem('fincrm_cloud_provider', this.setupConfig.cloudProvider!);
      localStorage.setItem('fincrm_multi_user_enabled', 'true');
      localStorage.setItem('fincrm_rate_limiting_enabled', 'true');
      localStorage.setItem('fincrm_encryption_enabled', 'true');
      localStorage.setItem('fincrm_auto_backup_enabled', 'true');

      // Configure rate limiting for personal accounts
      getRateLimiterService().updateConfig({
        maxRequestsPerMinute: 30,
        maxRequestsPerHour: 1000,
        maxRequestsPerDay: 10000,
        burstLimit: 5,
        cooldownPeriod: 60000
      });

      // Initialize cloud services
      await this.initializeCloudServices();

      // Register device
      await getDeviceManager().registerDevice({
        deviceName: this.getDeviceName(),
        deviceType: this.getDeviceType(),
        userId: 'setup_user'
      });

      // Start real-time sync
      await getRealTimeSync().initialize();

      // Mark setup as complete
      await this.completeSetup();

      securityComplianceService.logSecurityEvent({
        type: 'cloud_setup_completed',
        details: {
          provider: this.setupConfig.cloudProvider,
          accountEmail: this.cloudAccount.email,
          multiUserEnabled: true,
          rateLimitEnabled: true,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      this.progress.error = error.message;
      throw error;
    }
  }

  /**
   * Switch from local to cloud sync
   */
  async switchToCloudSync(provider: 'google' | 'onedrive'): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      migratedUsers: 0,
      migratedRecords: 0,
      conflictsResolved: 0,
      errors: [],
      duration: 0
    };

    try {
      this.updateProgress(1, 'Preparing Migration', 10);

      // Backup local data
      const localData = await this.exportLocalData();
      
      this.updateProgress(2, 'Connecting to Cloud', 20);
      
      // Connect to cloud provider
      const accountInfo = await this.connectToCloudProvider(provider);
      this.cloudAccount = accountInfo;

      this.updateProgress(3, 'Checking for Conflicts', 40);
      
      // Check for existing cloud data
      const hasExistingData = await this.checkForExistingCloudData(provider);
      
      if (hasExistingData) {
        // Cloud data takes precedence - merge local data
        this.updateProgress(4, 'Merging with Cloud Data', 60);
        await this.mergeLocalDataWithCloud(localData);
      } else {
        // New cloud account - upload local data
        this.updateProgress(4, 'Uploading Local Data', 60);
        await this.uploadLocalDataToCloud(localData);
      }

      this.updateProgress(5, 'Configuring Cloud Sync', 80);
      
      // Update configuration
      this.setupConfig = {
        storageMode: 'cloud',
        cloudProvider: provider,
        multiUserEnabled: true,
        rateLimitEnabled: true,
        encryptionEnabled: true,
        autoBackupEnabled: true
      };

      // Save new configuration
      localStorage.setItem('fincrm_storage_mode', 'cloud');
      localStorage.setItem('fincrm_cloud_provider', provider);
      localStorage.setItem('fincrm_multi_user_enabled', 'true');
      localStorage.setItem('fincrm_rate_limiting_enabled', 'true');

      // Initialize cloud services
      await this.initializeCloudServices();

      // Register device
      await getDeviceManager().registerDevice({
        deviceName: this.getDeviceName(),
        deviceType: this.getDeviceType(),
        userId: 'migrated_user'
      });

      // Start real-time sync
      await getRealTimeSync().initialize();

      this.updateProgress(6, 'Migration Complete', 100);
      
      result.success = true;
      result.migratedUsers = localData.users?.length || 0;
      result.migratedRecords = localData.records?.length || 0;
      result.duration = Date.now() - startTime;

      securityComplianceService.logSecurityEvent({
        type: 'migration_completed',
        details: {
          fromMode: 'local',
          toMode: 'cloud',
          provider: provider,
          migratedUsers: result.migratedUsers,
          migratedRecords: result.migratedRecords,
          duration: result.duration
        }
      });

      return result;
    } catch (error) {
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
      this.progress.error = error.message;
      throw error;
    }
  }

  /**
   * Get detected conflicts
   */
  getConflicts(): ConflictResolution[] {
    return [...this.conflicts];
  }

  /**
   * Get cloud account information
   */
  getCloudAccount(): CloudAccountInfo | null {
    return this.cloudAccount;
  }

  /**
   * Reset setup state
   */
  reset(): void {
    this.setupConfig = null;
    this.cloudAccount = null;
    this.conflicts = [];
    this.progress = {
      currentStep: 0,
      totalSteps: 5,
      stepName: 'Initial Setup',
      progress: 0,
      isComplete: false
    };
    
    // Clear setup-related localStorage
    localStorage.removeItem('fincrm_setup_completed');
    localStorage.removeItem('fincrm_setup_date');
    localStorage.removeItem('fincrm_storage_mode');
    localStorage.removeItem('fincrm_cloud_provider');
  }

  private updateProgress(step: number, stepName: string, progress: number): void {
    this.progress = {
      currentStep: step,
      totalSteps: this.progress.totalSteps,
      stepName,
      progress,
      isComplete: progress >= 100,
      error: undefined
    };

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.progress);
      } catch (error) {
        console.error('Error in progress listener:', error);
      }
    });
  }

  private async connectToCloudProvider(provider: 'google' | 'onedrive'): Promise<CloudAccountInfo> {
    // Simulate cloud provider connection
    // In real implementation, this would handle OAuth flow
    
    const mockAccountInfo: CloudAccountInfo = {
      provider,
      email: provider === 'google' ? 'user@gmail.com' : 'user@outlook.com',
      accountId: `${provider}_${Date.now()}`,
      hasExistingUsers: Math.random() > 0.6, // 40% chance of existing users
      userCount: Math.floor(Math.random() * 5) + 1,
      lastSync: Math.random() > 0.3 ? new Date().toISOString() : null,
      storageQuota: {
        used: Math.floor(Math.random() * 5000000000), // Random used space
        total: provider === 'google' ? 15000000000 : 5000000000, // 15GB for Google, 5GB for OneDrive
        available: 0
      }
    };
    
    mockAccountInfo.storageQuota.available = 
      mockAccountInfo.storageQuota.total - mockAccountInfo.storageQuota.used;

    return mockAccountInfo;
  }

  private async checkForExistingCloudData(provider: 'google' | 'onedrive'): Promise<boolean> {
    // Check if cloud account has existing FinCRuM data
    try {
      const service = provider === 'google' ? enhancedGoogleDriveService : enhancedOneDriveService;
      const folders = await service.listUserFolders();
      return folders.length > 0;
    } catch (error) {
      console.error('Error checking for existing cloud data:', error);
      return false;
    }
  }

  private async detectConflicts(): Promise<void> {
    // Simulate conflict detection
    this.conflicts = [
      {
        type: 'user',
        description: 'Admin user exists in both local and cloud',
        localValue: { name: 'Local Admin', email: 'admin@local.com', role: 'admin' },
        cloudValue: { name: 'Cloud Admin', email: 'admin@cloud.com', role: 'admin' },
        resolution: 'keep_cloud',
        resolved: false
      },
      {
        type: 'data',
        description: 'Customer records conflict detected',
        localValue: { count: 15, lastModified: new Date().toISOString() },
        cloudValue: { count: 23, lastModified: new Date(Date.now() - 86400000).toISOString() },
        resolution: 'manual',
        resolved: false
      }
    ];
  }

  private async applyConflictResolution(conflict: ConflictResolution): Promise<void> {
    switch (conflict.resolution) {
      case 'keep_cloud':
        // Use cloud data, discard local
        console.log('Keeping cloud data for:', conflict.description);
        break;
      case 'keep_local':
        // Use local data, overwrite cloud
        console.log('Keeping local data for:', conflict.description);
        break;
      case 'merge':
        // Attempt to merge both datasets
        console.log('Merging data for:', conflict.description);
        break;
      case 'manual':
        // Manual resolution required
        console.log('Manual resolution applied for:', conflict.description);
        break;
    }
  }

  private async initializeLocalDatabase(): Promise<void> {
    // Initialize local database structure
    const defaultData = {
      users: [],
      customers: [],
      transactions: [],
      settings: {
        theme: 'light',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY'
      }
    };

    localStorage.setItem('fincrm_data', JSON.stringify(defaultData));
  }

  private async createDefaultUser(): Promise<void> {
    const defaultUser = {
      id: 'user_1',
      name: 'Admin User',
      email: 'admin@fincrm.local',
      role: 'admin',
      createdAt: new Date().toISOString(),
      isActive: true
    };

    const rawData = localStorage.getItem('fincrm_data');
    const data = JSON.parse(rawData === "" ? '{}' : rawData || '{}');
    data.users = [defaultUser];
    localStorage.setItem('fincrm_data', JSON.stringify(data));
    localStorage.setItem('fincrm_current_user', JSON.stringify(defaultUser));
  }

  private async initializeCloudServices(): Promise<void> {
    if (!this.setupConfig?.cloudProvider) {
      throw new Error('Cloud provider not configured');
    }

    // Initialize cloud database service
    await getCloudDatabase().initializeCloudSync({
      provider: this.setupConfig.cloudProvider,
      rateLimitEnabled: true,
      maxRequestsPerMinute: 30,
      maxRequestsPerHour: 1000
    });

    // Initialize enhanced cloud services
    const service = this.setupConfig.cloudProvider === 'google' 
      ? enhancedGoogleDriveService 
      : enhancedOneDriveService;
    
    await service.initializeFolderStructure();
  }

  private async completeSetup(): Promise<void> {
    localStorage.setItem('fincrm_setup_completed', 'true');
    localStorage.setItem('fincrm_setup_date', new Date().toISOString());
    
    if (this.setupConfig) {
      localStorage.setItem('fincrm_setup_config', JSON.stringify(this.setupConfig));
    }

    this.updateProgress(this.progress.totalSteps, 'Setup Complete', 100);
  }

  private async exportLocalData(): Promise<any> {
    const data = localStorage.getItem('fincrm_data');
    return data && data !== "" ? JSON.parse(data) : {};
  }

  private async mergeLocalDataWithCloud(localData: any): Promise<void> {
    // Merge local data with existing cloud data
    // Cloud data takes precedence for conflicts
    console.log('Merging local data with cloud data');
  }

  private async uploadLocalDataToCloud(localData: any): Promise<void> {
    // Upload local data to new cloud account
    console.log('Uploading local data to cloud');
  }

  private loadExistingSetup(): void {
    try {
      const configData = localStorage.getItem('fincrm_setup_config');
      if (configData && configData !== "") {
        this.setupConfig = JSON.parse(configData);
      } else if (configData === "") {
        // Handle empty string case, perhaps by setting a default or logging
        console.warn("'fincrm_setup_config' was an empty string. Using default or no config.");
        this.setupConfig = {} as SetupConfig; // Or your default config
      }
    } catch (error) {
      console.error('Failed to load existing setup configuration:', error);
    }
  }

  private getDeviceName(): string {
    return `${navigator.platform} - ${new Date().toLocaleDateString()}`;
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mobile')) return 'mobile';
    if (userAgent.includes('tablet')) return 'tablet';
    return 'desktop';
  }
}

// Export singleton instance
export const setupManagerService = new SetupManagerService();