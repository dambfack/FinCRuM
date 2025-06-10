import { getData, saveData } from '@/lib/utils';
import { getRateLimiterService } from './rate-limiter';
import { v4 as uuidv4 } from 'uuid';

interface BufferedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  itemType: string;
  itemId: string;
  data: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'conflict';
  conflictData?: any;
  lastError?: string;
}

interface ConflictResolution {
  operationId: string;
  resolution: 'local' | 'remote' | 'merge' | 'skip';
  mergedData?: any;
}

interface SyncBufferConfig {
  maxBufferSize: number;
  maxRetries: number;
  retryDelay: number;
  conflictRetentionDays: number;
  autoResolveConflicts: boolean;
}

interface NetworkStatus {
  isOnline: boolean;
  lastOnlineTime: string;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

class SyncBufferService {
  private buffer: BufferedOperation[] = [];
  private conflicts: BufferedOperation[] = [];
  private isProcessing = false;
  private config: SyncBufferConfig;
  private networkStatus: NetworkStatus;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      maxBufferSize: 1000,
      maxRetries: 3,
      retryDelay: 5000,
      conflictRetentionDays: 7,
      autoResolveConflicts: false
    };

    this.networkStatus = {
      isOnline: navigator.onLine,
      lastOnlineTime: new Date().toISOString(),
      connectionQuality: 'excellent'
    };

    this.loadBufferFromStorage();
    this.setupNetworkListeners();
    this.startProcessing();
  }

  // Buffer Management
  async addOperation(operation: Omit<BufferedOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const bufferedOp: BufferedOperation = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
      ...operation
    };

    // Check buffer size limit
    if (this.buffer.length >= this.config.maxBufferSize) {
      // Remove oldest completed operations
      this.buffer = this.buffer.filter(op => op.status !== 'completed');
      
      // If still at limit, remove oldest pending operations
      if (this.buffer.length >= this.config.maxBufferSize) {
        this.buffer.shift();
      }
    }

    this.buffer.push(bufferedOp);
    this.saveBufferToStorage();

    // Try immediate processing if online
    if (this.networkStatus.isOnline && !this.isProcessing) {
      this.processBuffer();
    }

    return bufferedOp.id;
  }

  async removeOperation(operationId: string): Promise<boolean> {
    const index = this.buffer.findIndex(op => op.id === operationId);
    if (index !== -1) {
      this.buffer.splice(index, 1);
      this.saveBufferToStorage();
      return true;
    }
    return false;
  }

  async updateOperationStatus(operationId: string, status: BufferedOperation['status'], error?: string): Promise<void> {
    const operation = this.buffer.find(op => op.id === operationId);
    if (operation) {
      operation.status = status;
      if (error) {
        operation.lastError = error;
      }
      this.saveBufferToStorage();
    }
  }

  // Conflict Resolution
  async detectConflict(operation: BufferedOperation, remoteData: any): Promise<boolean> {
    // Simple conflict detection based on timestamp
    if (remoteData && remoteData.lastModified && remoteData.lastModified.trim() !== '') {
      const operationTime = operation.timestamp && operation.timestamp.trim() !== '' ? new Date(operation.timestamp).getTime() : 0;
      const remoteTime = new Date(remoteData.lastModified).getTime();
      
      // Conflict if remote data is newer than our operation
      return remoteTime > operationTime;
    }
    return false;
  }

  async handleConflict(operation: BufferedOperation, remoteData: any): Promise<void> {
    operation.status = 'conflict';
    operation.conflictData = remoteData;
    
    // Move to conflicts array for manual resolution
    this.conflicts.push({ ...operation });
    
    // Auto-resolve if enabled
    if (this.config.autoResolveConflicts) {
      await this.autoResolveConflict(operation, remoteData);
    }
    
    this.saveBufferToStorage();
    this.saveConflictsToStorage();
  }

  async autoResolveConflict(operation: BufferedOperation, remoteData: any): Promise<void> {
    // Simple auto-resolution strategy: prefer local changes for user data
    const resolution: ConflictResolution = {
      operationId: operation.id,
      resolution: 'local' // Default to local changes
    };

    // For certain types, prefer remote data
    if (operation.itemType === 'system_settings' || operation.itemType === 'shared_data') {
      resolution.resolution = 'remote';
    }

    await this.resolveConflict(resolution);
  }

  async resolveConflict(resolution: ConflictResolution): Promise<boolean> {
    const conflictIndex = this.conflicts.findIndex(op => op.id === resolution.operationId);
    if (conflictIndex === -1) return false;

    const conflict = this.conflicts[conflictIndex];
    
    switch (resolution.resolution) {
      case 'local':
        // Keep local changes, retry sync
        conflict.status = 'pending';
        conflict.retryCount = 0;
        this.buffer.push(conflict);
        break;
        
      case 'remote':
        // Accept remote changes, discard local
        conflict.status = 'completed';
        // Apply remote data locally
        await this.applyRemoteData(conflict, conflict.conflictData);
        break;
        
      case 'merge':
        // Use merged data
        if (resolution.mergedData) {
          conflict.data = resolution.mergedData;
          conflict.status = 'pending';
          conflict.retryCount = 0;
          this.buffer.push(conflict);
        }
        break;
        
      case 'skip':
        // Skip this operation
        conflict.status = 'completed';
        break;
    }

    // Remove from conflicts
    this.conflicts.splice(conflictIndex, 1);
    this.saveBufferToStorage();
    this.saveConflictsToStorage();
    
    return true;
  }

  private async applyRemoteData(operation: BufferedOperation, remoteData: any): Promise<void> {
    try {
      // Apply remote data to local storage
      saveData(operation.itemType as any, remoteData);
    } catch (error) {
      console.error('Failed to apply remote data:', error);
    }
  }

  // Network Management
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.networkStatus.isOnline = true;
      this.networkStatus.lastOnlineTime = new Date().toISOString();
      this.updateConnectionQuality();
      
      // Resume processing when back online
      if (!this.isProcessing) {
        this.processBuffer();
      }
    });

    window.addEventListener('offline', () => {
      this.networkStatus.isOnline = false;
      this.networkStatus.connectionQuality = 'offline';
    });
  }

  private updateConnectionQuality(): void {
    // Simple connection quality assessment
    if (!this.networkStatus.isOnline) {
      this.networkStatus.connectionQuality = 'offline';
      return;
    }

    // Check if we have navigator.connection API
    const connection = (navigator as any).connection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      switch (effectiveType) {
        case '4g':
          this.networkStatus.connectionQuality = 'excellent';
          break;
        case '3g':
          this.networkStatus.connectionQuality = 'good';
          break;
        case '2g':
        case 'slow-2g':
          this.networkStatus.connectionQuality = 'poor';
          break;
        default:
          this.networkStatus.connectionQuality = 'good';
      }
    } else {
      this.networkStatus.connectionQuality = 'good';
    }
  }

  // Buffer Processing
  private startProcessing(): void {
    // Process buffer every 30 seconds
    this.processingInterval = setInterval(() => {
      if (this.networkStatus.isOnline && !this.isProcessing) {
        this.processBuffer();
      }
    }, 30000);
  }

  private async processBuffer(): Promise<void> {
    if (this.isProcessing || !this.networkStatus.isOnline) {
      return;
    }

    this.isProcessing = true;

    try {
      // Sort by priority and timestamp
      const pendingOps = this.buffer
        .filter(op => op.status === 'pending')
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          const timeA = a.timestamp && a.timestamp.trim() !== '' ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp && b.timestamp.trim() !== '' ? new Date(b.timestamp).getTime() : 0;
          return timeA - timeB;
        });

      for (const operation of pendingOps) {
        if (!this.networkStatus.isOnline) break;

        await this.processOperation(operation);
        
        // Add delay between operations based on connection quality
        const delay = this.getProcessingDelay();
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      console.error('Error processing buffer:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processOperation(operation: BufferedOperation): Promise<void> {
    operation.status = 'processing';
    this.saveBufferToStorage();

    try {
      // Use rate limiter for cloud operations
      await getRateLimiterService().executeRequest(async () => {
        await this.executeCloudOperation(operation);
      }, operation.priority);

      operation.status = 'completed';
    } catch (error: any) {
      operation.retryCount++;
      operation.lastError = error.message;

      if (error.message.includes('conflict') || error.status === 409) {
        // Handle conflict
        await this.handleConflict(operation, error.conflictData);
      } else if (operation.retryCount >= operation.maxRetries) {
        operation.status = 'failed';
      } else {
        operation.status = 'pending';
        // Exponential backoff for retries
        const delay = this.config.retryDelay * Math.pow(2, operation.retryCount - 1);
        setTimeout(() => {
          // Operation will be retried in next processing cycle
        }, delay);
      }
    }

    this.saveBufferToStorage();
  }

  private async executeCloudOperation(operation: BufferedOperation): Promise<void> {
    // Import cloud database service dynamically to avoid circular dependency
    const { sharedCloudDatabase } = await import('./shared-cloud-database');
    
    if (!sharedCloudDatabase.isCloudEnabled || !sharedCloudDatabase.cloudProvider) {
      throw new Error('Cloud sync not enabled or provider not available');
    }
    
    switch (operation.type) {
      case 'create':
      case 'update':
        if (operation.itemType === 'full_sync') {
          // Full sync operation
          const localData = sharedCloudDatabase.getAllData();
          const cloudData = await sharedCloudDatabase.cloudProvider.getData();
          
          // Check for conflicts
          if (await this.detectConflict(operation, cloudData)) {
            const error = new Error('Conflict detected');
            (error as any).status = 409;
            (error as any).conflictData = cloudData;
            throw error;
          }
          
          // Merge and save
          const mergedData = { ...cloudData, ...localData };
          await sharedCloudDatabase.cloudProvider.saveData(mergedData);
        } else {
          // Individual item sync
          const cloudData = await sharedCloudDatabase.cloudProvider.getData();
          const existingItem = cloudData[operation.itemType];
          
          // Check for conflicts
          if (await this.detectConflict(operation, existingItem)) {
            const error = new Error('Conflict detected');
            (error as any).status = 409;
            (error as any).conflictData = existingItem;
            throw error;
          }
          
          // Update cloud data
          const updatedCloudData = { ...cloudData, [operation.itemType]: operation.data };
          await sharedCloudDatabase.cloudProvider.saveData(updatedCloudData);
        }
        break;
        
      case 'delete':
        const cloudData = await sharedCloudDatabase.cloudProvider.getData();
        delete cloudData[operation.itemType];
        await sharedCloudDatabase.cloudProvider.saveData(cloudData);
        break;
    }
  }

  private async simulateCloudRequest(method: string, operation: BufferedOperation): Promise<void> {
    // Simulate network request with potential for conflicts
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate random conflicts (10% chance)
        if (Math.random() < 0.1) {
          const error = new Error('Conflict detected');
          (error as any).status = 409;
          (error as any).conflictData = {
            id: operation.itemId,
            lastModified: new Date().toISOString(),
            data: { ...operation.data, remoteChange: true }
          };
          reject(error);
        } else {
          resolve();
        }
      }, 1000); // Simulate 1 second network delay
    });
  }

  private getProcessingDelay(): number {
    switch (this.networkStatus.connectionQuality) {
      case 'excellent': return 100;
      case 'good': return 500;
      case 'poor': return 2000;
      default: return 0;
    }
  }

  // Storage Management
  private loadBufferFromStorage(): void {
    try {
      const savedBuffer = getData('sync_buffer');
      if (savedBuffer && Array.isArray(savedBuffer)) {
        this.buffer = savedBuffer;
      }

      const savedConflicts = getData('sync_conflicts');
      if (savedConflicts && Array.isArray(savedConflicts)) {
        this.conflicts = savedConflicts;
      }

      const savedConfig = getData('sync_buffer_config');
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      console.error('Failed to load buffer from storage:', error);
    }
  }

  private saveBufferToStorage(): void {
    try {
      saveData('sync_buffer', this.buffer);
    } catch (error) {
      console.error('Failed to save buffer to storage:', error);
    }
  }

  private saveConflictsToStorage(): void {
    try {
      saveData('sync_conflicts', this.conflicts);
    } catch (error) {
      console.error('Failed to save conflicts to storage:', error);
    }
  }

  // Public API
  getBufferStatus() {
    return {
      totalOperations: this.buffer.length,
      pendingOperations: this.buffer.filter(op => op.status === 'pending').length,
      processingOperations: this.buffer.filter(op => op.status === 'processing').length,
      completedOperations: this.buffer.filter(op => op.status === 'completed').length,
      failedOperations: this.buffer.filter(op => op.status === 'failed').length,
      conflictOperations: this.conflicts.length,
      isProcessing: this.isProcessing,
      networkStatus: this.networkStatus
    };
  }

  getConflicts(): BufferedOperation[] {
    return [...this.conflicts];
  }

  getPendingOperations(): BufferedOperation[] {
    return this.buffer.filter(op => op.status === 'pending');
  }

  getFailedOperations(): BufferedOperation[] {
    return this.buffer.filter(op => op.status === 'failed');
  }

  async retryFailedOperations(): Promise<void> {
    const failedOps = this.buffer.filter(op => op.status === 'failed');
    for (const op of failedOps) {
      op.status = 'pending';
      op.retryCount = 0;
      op.lastError = undefined;
    }
    this.saveBufferToStorage();

    if (this.networkStatus.isOnline && !this.isProcessing) {
      this.processBuffer();
    }
  }

  async clearCompletedOperations(): Promise<void> {
    this.buffer = this.buffer.filter(op => op.status !== 'completed');
    this.saveBufferToStorage();
  }

  async clearAllOperations(): Promise<void> {
    this.buffer = [];
    this.conflicts = [];
    this.saveBufferToStorage();
    this.saveConflictsToStorage();
  }

  updateConfig(newConfig: Partial<SyncBufferConfig>): void {
    this.config = { ...this.config, ...newConfig };
    saveData('sync_buffer_config', this.config);
  }

  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

export const syncBufferService = new SyncBufferService();
export type { BufferedOperation, ConflictResolution, SyncBufferConfig, NetworkStatus };