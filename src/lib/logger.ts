// Centralized logging system for FinCRuM

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
  context?: string;
  sessionId: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableLocalStorage: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  maxStorageEntries: number;
}

export class Logger {
  private config: LoggerConfig;
  private context?: string;
  private sessionId: string;
  private logBuffer: LogEntry[] = [];
  private isElectron: boolean;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: 'info',
      enableConsole: true,
      enableLocalStorage: false,
      enableRemote: false,
      maxStorageEntries: 1000,
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.isElectron = this.detectElectron();
    this.context = 'app';

    // Cleanup old logs on initialization
    if (this.config.enableLocalStorage) {
      this.cleanupOldLogs();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private detectElectron(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).require || !!(window as any).electronAPI;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private serializeError(obj: any): any {
    if (obj instanceof Error) {
      return {
        name: obj.name,
        message: obj.message,
        stack: obj.stack,
      };
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const serialized: any = Array.isArray(obj) ? [] : {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          serialized[key] = this.serializeError(obj[key]);
        }
      }
      return serialized;
    }
    
    return obj;
  }

  private createLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data: data ? this.serializeError(data) : data,
      context: this.context,
      sessionId: this.sessionId,
    };
  }

  private writeToConsole(level: LogLevel, message: string, data?: any): void {
    if (!this.config.enableConsole || typeof console === 'undefined') return;

    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${contextStr} ${message}`;

    const consoleMethod = console[level] || console.log;
    if (data !== undefined) {
      const serializedData = this.serializeError(data);
      consoleMethod(logMessage, serializedData);
    } else {
      consoleMethod(logMessage);
    }
  }

  private writeToStorage(entry: LogEntry): void {
    if (!this.config.enableLocalStorage || typeof window === 'undefined') return;

    try {
      const key = 'fincrm_logs';
      const existing = localStorage.getItem(key);
      const logs: LogEntry[] = existing ? JSON.parse(existing) : [];
      
      logs.push(entry);
      
      // Keep only the most recent entries
      if (logs.length > this.config.maxStorageEntries) {
        logs.splice(0, logs.length - this.config.maxStorageEntries);
      }
      
      localStorage.setItem(key, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to write log to storage:', error);
    }
  }

  private writeToElectronLog(entry: LogEntry): void {
    if (!this.isElectron) return;

    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.log) {
        electronAPI.log(entry);
      }
    } catch (error) {
      console.error('Failed to write to Electron log:', error);
    }
  }

  private async writeToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      console.error('Failed to send log to remote endpoint:', error);
    }
  }

  private cleanupOldLogs(): void {
    if (typeof window === 'undefined') return;

    try {
      const key = 'fincrm_logs';
      const existing = localStorage.getItem(key);
      if (!existing) return;

      const logs: LogEntry[] = JSON.parse(existing);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentLogs = logs.filter(log => 
        new Date(log.timestamp) > oneDayAgo
      );
      
      if (recentLogs.length !== logs.length) {
        localStorage.setItem(key, JSON.stringify(recentLogs));
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  private async log(level: LogLevel, message: string, data?: any): Promise<void> {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, data);
    
    // Write to various outputs
    this.writeToConsole(level, message, data);
    this.writeToStorage(entry);
    this.writeToElectronLog(entry);
    
    // Buffer for remote logging
    if (this.config.enableRemote) {
      this.logBuffer.push(entry);
      await this.flushRemoteLogs();
    }
  }

  private async flushRemoteLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    for (const entry of logsToSend) {
      await this.writeToRemote(entry);
    }
  }

  // Public API
  async debug(message: string, data?: any): Promise<void> {
    await this.log('debug', message, data);
  }

  async info(message: string, data?: any): Promise<void> {
    await this.log('info', message, data);
  }

  async warn(message: string, data?: any): Promise<void> {
    await this.log('warn', message, data);
  }

  async error(message: string, data?: any): Promise<void> {
    await this.log('error', message, data);
  }

  setContext(context: string): void {
    this.context = context;
  }

  clearContext(): void {
    this.context = undefined;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  enableRemoteLogging(endpoint: string): void {
    this.config.enableRemote = true;
    this.config.remoteEndpoint = endpoint;
  }

  disableRemoteLogging(): void {
    this.config.enableRemote = false;
  }

  getLogs(): LogEntry[] {
    if (typeof window === 'undefined') return [];

    try {
      const existing = localStorage.getItem('fincrm_logs');
      return existing ? JSON.parse(existing) : [];
    } catch (error) {
      console.error('Failed to retrieve logs:', error);
      return [];
    }
  }

  clearLogs(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem('fincrm_logs');
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  exportLogs(): string {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  // Performance logging helpers
  time(label: string): void {
    if (typeof window !== 'undefined') {
      console.time(label);
    }
    this.debug(`Timer started: ${label}`);
  }

  timeEnd(label: string): void {
    if (typeof window !== 'undefined') {
      console.timeEnd(label);
    }
    this.debug(`Timer ended: ${label}`);
  }

  // Create child logger with specific context
  child(context: string): Logger {
    const childLogger = new Logger(this.config);
    childLogger.setContext(`${this.context}:${context}`);
    return childLogger;
  }

  // Utility function for wrapping functions with logging
  withLogging<T extends (...args: any[]) => any>(
    fn: T,
    functionName: string
  ): T {
    return ((...args: any[]) => {
      // Note: Using non-async logging for synchronous wrapper
      const logInfo = (msg: string, data?: any) => {
        const entry = this.createLogEntry('info', msg, data);
        this.writeToConsole('info', msg, data);
        this.writeToStorage(entry);
        this.writeToElectronLog(entry);
      };
      
      const logError = (msg: string, data?: any) => {
        const entry = this.createLogEntry('error', msg, data);
        this.writeToConsole('error', msg, data);
        this.writeToStorage(entry);
        this.writeToElectronLog(entry);
      };
      
      logInfo(`Function ${functionName} started`, { args });
      
      try {
        const result = fn(...args);
        
        if (result instanceof Promise) {
          return result
            .then(res => {
              logInfo(`Function ${functionName} completed`, { result: res });
              return res;
            })
            .catch(error => {
              logError(`Function ${functionName} failed`, { error });
              throw error;
            });
        }
        
        logInfo(`Function ${functionName} completed`, { result });
        return result;
      } catch (error) {
        logError(`Function ${functionName} failed`, { error });
        throw error;
      }
    }) as T;
  }
}

// Create default logger instance
const defaultConfig: Partial<LoggerConfig> = {
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  enableConsole: true,
  enableLocalStorage: true,
  enableRemote: false
};

export const logger = new Logger(defaultConfig);

// Export utility functions
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}