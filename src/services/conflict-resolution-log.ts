import { ConflictResolutionEntry, DataItemType } from '@/lib/types';
import { getData, saveData } from '@/lib/utils';

/**
 * Service for managing conflict resolution logs
 * - Tracks all manual conflict resolutions by users
 * - Automatically cleans up entries older than 90 days
 * - Provides read-only access to the log
 */
export class ConflictResolutionLogService {
  private static instance: ConflictResolutionLogService;
  private readonly LOG_RETENTION_DAYS = 90;
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanupTimer();
  }

  public static getInstance(): ConflictResolutionLogService {
    if (!ConflictResolutionLogService.instance) {
      ConflictResolutionLogService.instance = new ConflictResolutionLogService();
    }
    return ConflictResolutionLogService.instance;
  }

  /**
   * Add a new conflict resolution entry to the log
   */
  public async addEntry(entry: Omit<ConflictResolutionEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const logs = await this.getLogs();
      
      const newEntry: ConflictResolutionEntry = {
        ...entry,
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      };

      logs.push(newEntry);
      
      // Save to localStorage with skipCloudSync to avoid conflicts
      await saveData(DataItemType.ConflictResolutionLog, logs, true);
      
      console.log('Conflict resolution entry added:', newEntry.id);
    } catch (error) {
      console.error('Failed to add conflict resolution entry:', error);
    }
  }

  /**
   * Get all conflict resolution logs (read-only)
   */
  public async getLogs(): Promise<ConflictResolutionEntry[]> {
    try {
      const logs = getData<ConflictResolutionEntry[]>(DataItemType.ConflictResolutionLog) || [];
      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to get conflict resolution logs:', error);
      return [];
    }
  }

  /**
   * Get logs filtered by date range
   */
  public async getLogsByDateRange(startDate: Date, endDate: Date): Promise<ConflictResolutionEntry[]> {
    const logs = await this.getLogs();
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  /**
   * Get logs filtered by user
   */
  public async getLogsByUser(userId: string): Promise<ConflictResolutionEntry[]> {
    const logs = await this.getLogs();
    return logs.filter(log => log.userId === userId);
  }

  /**
   * Get logs filtered by data type
   */
  public async getLogsByDataType(dataType: DataItemType): Promise<ConflictResolutionEntry[]> {
    const logs = await this.getLogs();
    return logs.filter(log => log.dataType === dataType);
  }

  /**
   * Get logs filtered by action type
   */
  public async getLogsByAction(action: ConflictResolutionEntry['action']): Promise<ConflictResolutionEntry[]> {
    const logs = await this.getLogs();
    return logs.filter(log => log.action === action);
  }

  /**
   * Get statistics about conflict resolutions
   */
  public async getStatistics(): Promise<{
    totalEntries: number;
    entriesLast30Days: number;
    entriesLast7Days: number;
    actionBreakdown: Record<ConflictResolutionEntry['action'], number>;
    dataTypeBreakdown: Record<string, number>;
    userBreakdown: Record<string, number>;
  }> {
    const logs = await this.getLogs();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const entriesLast30Days = logs.filter(log => new Date(log.timestamp) >= thirtyDaysAgo).length;
    const entriesLast7Days = logs.filter(log => new Date(log.timestamp) >= sevenDaysAgo).length;

    const actionBreakdown: Record<ConflictResolutionEntry['action'], number> = {
      manual_override: 0,
      user_choice: 0,
      merge_conflict: 0
    };

    const dataTypeBreakdown: Record<string, number> = {};
    const userBreakdown: Record<string, number> = {};

    logs.forEach(log => {
      actionBreakdown[log.action]++;
      dataTypeBreakdown[log.dataType] = (dataTypeBreakdown[log.dataType] || 0) + 1;
      userBreakdown[log.userName] = (userBreakdown[log.userName] || 0) + 1;
    });

    return {
      totalEntries: logs.length,
      entriesLast30Days,
      entriesLast7Days,
      actionBreakdown,
      dataTypeBreakdown,
      userBreakdown
    };
  }

  /**
   * Clean up entries older than 90 days
   */
  public async cleanupOldEntries(): Promise<number> {
    try {
      const logs = await this.getLogs();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.LOG_RETENTION_DAYS);

      const filteredLogs = logs.filter(log => new Date(log.timestamp) >= cutoffDate);
      const removedCount = logs.length - filteredLogs.length;

      if (removedCount > 0) {
        await saveData(DataItemType.ConflictResolutionLog, filteredLogs, true);
        console.log(`Cleaned up ${removedCount} old conflict resolution entries`);
      }

      return removedCount;
    } catch (error) {
      console.error('Failed to cleanup old conflict resolution entries:', error);
      return 0;
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupOldEntries();
    }, this.CLEANUP_INTERVAL);

    // Run initial cleanup
    this.cleanupOldEntries();
  }

  /**
   * Stop automatic cleanup timer
   */
  public stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Export logs as JSON (for backup purposes)
   */
  public async exportLogs(): Promise<string> {
    const logs = await this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Get a summary of recent activity
   */
  public async getRecentActivity(limit: number = 10): Promise<ConflictResolutionEntry[]> {
    const logs = await this.getLogs();
    return logs.slice(0, limit);
  }

  /**
   * Search logs by description or item ID
   */
  public async searchLogs(query: string): Promise<ConflictResolutionEntry[]> {
    const logs = await this.getLogs();
    const lowerQuery = query.toLowerCase();
    
    return logs.filter(log => 
      log.description.toLowerCase().includes(lowerQuery) ||
      log.itemId.toLowerCase().includes(lowerQuery) ||
      log.conflictDetails.resolutionReason.toLowerCase().includes(lowerQuery)
    );
  }
}

// Export singleton instance
export const conflictResolutionLog = ConflictResolutionLogService.getInstance();