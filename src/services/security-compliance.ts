import CryptoJS from 'crypto-js';
import { User, LocalData } from '@/lib/types';

/**
 * Security and compliance service
 * Handles encryption, audit logging, access control, and compliance features
 */
export class SecurityComplianceService {
  private readonly ENCRYPTION_KEY_PREFIX = 'fincrm_enc_';
  private readonly AUDIT_LOG_KEY = 'fincrm_audit_log';
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  
  private sessionTimer: NodeJS.Timeout | null = null;
  private encryptionKey: string | null = null;

  /**
   * Initialize security service
   */
  async initialize(userPin: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate encryption key from user PIN
      this.encryptionKey = this.generateEncryptionKey(userPin);
      
      // Start session timeout
      this.startSessionTimeout();
      
      // Log security initialization
      await this.logSecurityEvent('SECURITY_INIT', {
        timestamp: new Date().toISOString(),
        event: 'Security service initialized'
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error initializing security service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate encryption key from PIN
   */
  private generateEncryptionKey(pin: string): string {
    const salt = 'fincrm_security_salt_2024';
    return CryptoJS.PBKDF2(pin, salt, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data: any): { success: boolean; encryptedData?: string; error?: string } {
    try {
      if (!this.encryptionKey) {
        return { success: false, error: 'Encryption key not initialized' };
      }

      const jsonString = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(jsonString, this.encryptionKey).toString();
      
      return { success: true, encryptedData: encrypted };
    } catch (error) {
      console.error('Error encrypting data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Encryption failed'
      };
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData: string): { success: boolean; data?: any; error?: string } {
    try {
      if (!this.encryptionKey) {
        return { success: false, error: 'Encryption key not initialized' };
      }

      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!jsonString) {
        return { success: false, error: 'Failed to decrypt data - invalid key or corrupted data' };
      }

      const data = JSON.parse(jsonString);
      return { success: true, data };
    } catch (error) {
      console.error('Error decrypting data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Decryption failed'
      };
    }
  }

  /**
   * Encrypt user data before storage
   */
  async encryptUserData(userId: string, data: LocalData): Promise<{ success: boolean; error?: string }> {
    try {
      const encryptResult = this.encryptData(data);
      if (!encryptResult.success || !encryptResult.encryptedData) {
        return { success: false, error: encryptResult.error };
      }

      // Store encrypted data
      const encryptedKey = `${this.ENCRYPTION_KEY_PREFIX}${userId}`;
      localStorage.setItem(encryptedKey, encryptResult.encryptedData);
      
      // Log encryption event
      await this.logSecurityEvent('DATA_ENCRYPTED', {
        userId,
        timestamp: new Date().toISOString(),
        dataSize: encryptResult.encryptedData.length
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error encrypting user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to encrypt user data'
      };
    }
  }

  /**
   * Decrypt user data from storage
   */
  async decryptUserData(userId: string): Promise<{ success: boolean; data?: LocalData; error?: string }> {
    try {
      const encryptedKey = `${this.ENCRYPTION_KEY_PREFIX}${userId}`;
      const encryptedData = localStorage.getItem(encryptedKey);
      
      if (!encryptedData) {
        return { success: false, error: 'No encrypted data found for user' };
      }

      const decryptResult = this.decryptData(encryptedData);
      if (!decryptResult.success || !decryptResult.data) {
        return { success: false, error: decryptResult.error };
      }

      // Log decryption event
      await this.logSecurityEvent('DATA_DECRYPTED', {
        userId,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, data: decryptResult.data };
    } catch (error) {
      console.error('Error decrypting user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to decrypt user data'
      };
    }
  }

  /**
   * Validate PIN strength
   */
  validatePinStrength(pin: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (pin.length < 4) {
      issues.push('PIN must be at least 4 digits long');
    }
    
    if (pin.length > 8) {
      issues.push('PIN should not exceed 8 digits');
    }
    
    if (!/^\d+$/.test(pin)) {
      issues.push('PIN must contain only numbers');
    }
    
    // Check for common weak PINs
    const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123'];
    if (weakPins.includes(pin)) {
      issues.push('PIN is too common and easily guessable');
    }
    
    // Check for sequential numbers
    if (pin.length >= 4) {
      let isSequential = true;
      for (let i = 1; i < pin.length; i++) {
        if (parseInt(pin[i]) !== parseInt(pin[i-1]) + 1) {
          isSequential = false;
          break;
        }
      }
      if (isSequential) {
        issues.push('PIN should not be sequential numbers');
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Track login attempts
   */
  async trackLoginAttempt(userId: string, success: boolean, ipAddress?: string): Promise<void> {
    try {
      const attemptKey = `login_attempts_${userId}`;
      const lockoutKey = `lockout_${userId}`;
      
      // Check if user is currently locked out
      const lockoutData = localStorage.getItem(lockoutKey);
      if (lockoutData) {
        const lockout = JSON.parse(lockoutData);
        if (new Date().getTime() < lockout.unlockTime) {
          await this.logSecurityEvent('LOGIN_ATTEMPT_BLOCKED', {
            userId,
            reason: 'Account locked',
            timestamp: new Date().toISOString(),
            ipAddress
          });
          return;
        } else {
          // Lockout expired, remove it
          localStorage.removeItem(lockoutKey);
        }
      }
      
      if (success) {
        // Clear failed attempts on successful login
        localStorage.removeItem(attemptKey);
        await this.logSecurityEvent('LOGIN_SUCCESS', {
          userId,
          timestamp: new Date().toISOString(),
          ipAddress
        });
      } else {
        // Track failed attempt
        const attemptsData = localStorage.getItem(attemptKey);
        const attempts = attemptsData ? JSON.parse(attemptsData) : { count: 0, firstAttempt: new Date().toISOString() };
        
        attempts.count++;
        attempts.lastAttempt = new Date().toISOString();
        
        localStorage.setItem(attemptKey, JSON.stringify(attempts));
        
        await this.logSecurityEvent('LOGIN_FAILED', {
          userId,
          attemptCount: attempts.count,
          timestamp: new Date().toISOString(),
          ipAddress
        });
        
        // Lock account if max attempts reached
        if (attempts.count >= this.MAX_LOGIN_ATTEMPTS) {
          const lockoutData = {
            lockedAt: new Date().toISOString(),
            unlockTime: new Date().getTime() + this.LOCKOUT_DURATION
          };
          
          localStorage.setItem(lockoutKey, JSON.stringify(lockoutData));
          localStorage.removeItem(attemptKey);
          
          await this.logSecurityEvent('ACCOUNT_LOCKED', {
            userId,
            reason: 'Too many failed login attempts',
            lockoutDuration: this.LOCKOUT_DURATION,
            timestamp: new Date().toISOString(),
            ipAddress
          });
        }
      }
    } catch (error) {
      console.error('Error tracking login attempt:', error);
    }
  }

  /**
   * Check if user is locked out
   */
  isUserLockedOut(userId: string): { isLocked: boolean; unlockTime?: string } {
    try {
      const lockoutKey = `lockout_${userId}`;
      const lockoutData = localStorage.getItem(lockoutKey);
      
      if (!lockoutData) {
        return { isLocked: false };
      }
      
      const lockout = JSON.parse(lockoutData);
      const currentTime = new Date().getTime();
      
      if (currentTime < lockout.unlockTime) {
        return {
          isLocked: true,
          unlockTime: new Date(lockout.unlockTime).toISOString()
        };
      } else {
        // Lockout expired, remove it
        localStorage.removeItem(lockoutKey);
        return { isLocked: false };
      }
    } catch (error) {
      console.error('Error checking lockout status:', error);
      return { isLocked: false };
    }
  }

  /**
   * Start session timeout
   */
  private startSessionTimeout(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    
    this.sessionTimer = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.SESSION_TIMEOUT);
  }

  /**
   * Reset session timeout
   */
  resetSessionTimeout(): void {
    this.startSessionTimeout();
  }

  /**
   * Handle session timeout
   */
  private async handleSessionTimeout(): Promise<void> {
    try {
      await this.logSecurityEvent('SESSION_TIMEOUT', {
        timestamp: new Date().toISOString(),
        reason: 'Session expired due to inactivity'
      });
      
      // Clear encryption key
      this.encryptionKey = null;
      
      // Notify application of session timeout
      window.dispatchEvent(new CustomEvent('sessionTimeout'));
    } catch (error) {
      console.error('Error handling session timeout:', error);
    }
  }

  /**
   * Log security events
   */
  async logSecurityEvent(eventType: string, eventData: any): Promise<void> {
    try {
      const auditLog = this.getAuditLog();
      
      const logEntry = {
        id: this.generateEventId(),
        type: eventType,
        timestamp: new Date().toISOString(),
        data: eventData,
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      auditLog.push(logEntry);
      
      // Keep only last 1000 entries
      if (auditLog.length > 1000) {
        auditLog.splice(0, auditLog.length - 1000);
      }
      
      localStorage.setItem(this.AUDIT_LOG_KEY, JSON.stringify(auditLog));
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Get audit log
   */
  getAuditLog(): any[] {
    try {
      const logData = localStorage.getItem(this.AUDIT_LOG_KEY);
      return logData ? JSON.parse(logData) : [];
    } catch (error) {
      console.error('Error getting audit log:', error);
      return [];
    }
  }

  /**
   * Export audit log for compliance
   */
  exportAuditLog(startDate?: string, endDate?: string): { success: boolean; data?: string; error?: string } {
    try {
      const auditLog = this.getAuditLog();
      
      let filteredLog = auditLog;
      
      if (startDate || endDate) {
        filteredLog = auditLog.filter(entry => {
          const entryDate = new Date(entry.timestamp);
          const start = startDate ? new Date(startDate) : new Date(0);
          const end = endDate ? new Date(endDate) : new Date();
          
          return entryDate >= start && entryDate <= end;
        });
      }
      
      const exportData = {
        exportTimestamp: new Date().toISOString(),
        totalEntries: filteredLog.length,
        dateRange: {
          start: startDate || 'All',
          end: endDate || 'All'
        },
        entries: filteredLog
      };
      
      return {
        success: true,
        data: JSON.stringify(exportData, null, 2)
      };
    } catch (error) {
      console.error('Error exporting audit log:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate user permissions
   */
  validateUserPermissions(user: User, action: string, resource?: string): boolean {
    try {
      // Basic role-based access control
      switch (user.role) {
        case 'admin':
          return true; // Admins can do everything
          
        case 'partner':
          // Partners can do most things except user management
          const restrictedActions = ['DELETE_USER', 'CHANGE_USER_ROLE', 'VIEW_AUDIT_LOG'];
          return !restrictedActions.includes(action);
          
        case 'employee':
          // Employees have limited permissions
          const allowedActions = ['VIEW_DATA', 'CREATE_DATA', 'UPDATE_OWN_DATA', 'DELETE_OWN_DATA'];
          return allowedActions.includes(action);
          
        default:
          return false;
      }
    } catch (error) {
      console.error('Error validating user permissions:', error);
      return false;
    }
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input: string): string {
    try {
      // Remove potentially dangerous characters
      return input
        .replace(/[<>"'&]/g, '') // Remove HTML/XML characters
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
    } catch (error) {
      console.error('Error sanitizing input:', error);
      return '';
    }
  }

  /**
   * Generate security report
   */
  generateSecurityReport(): {
    success: boolean;
    report?: {
      summary: any;
      recentEvents: any[];
      recommendations: string[];
    };
    error?: string;
  } {
    try {
      const auditLog = this.getAuditLog();
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const recentEvents = auditLog.filter(entry => 
        new Date(entry.timestamp) >= last30Days
      );
      
      const eventCounts = recentEvents.reduce((counts, event) => {
        counts[event.type] = (counts[event.type] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      
      const failedLogins = eventCounts['LOGIN_FAILED'] || 0;
      const accountLockouts = eventCounts['ACCOUNT_LOCKED'] || 0;
      const sessionTimeouts = eventCounts['SESSION_TIMEOUT'] || 0;
      
      const recommendations: string[] = [];
      
      if (failedLogins > 10) {
        recommendations.push('High number of failed login attempts detected. Consider reviewing user access.');
      }
      
      if (accountLockouts > 0) {
        recommendations.push('Account lockouts occurred. Ensure users are aware of security policies.');
      }
      
      if (sessionTimeouts > 5) {
        recommendations.push('Multiple session timeouts detected. Consider adjusting session timeout settings.');
      }
      
      const summary = {
        reportPeriod: '30 days',
        totalEvents: recentEvents.length,
        eventBreakdown: eventCounts,
        securityMetrics: {
          failedLogins,
          accountLockouts,
          sessionTimeouts
        }
      };
      
      return {
        success: true,
        report: {
          summary,
          recentEvents: recentEvents.slice(-20), // Last 20 events
          recommendations
        }
      };
    } catch (error) {
      console.error('Error generating security report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Report generation failed'
      };
    }
  }

  /**
   * Clear all security data (for logout)
   */
  clearSecurityData(): void {
    try {
      this.encryptionKey = null;
      
      if (this.sessionTimer) {
        clearTimeout(this.sessionTimer);
        this.sessionTimer = null;
      }
      
      // Log security cleanup
      this.logSecurityEvent('SECURITY_CLEANUP', {
        timestamp: new Date().toISOString(),
        reason: 'User logout or session end'
      });
    } catch (error) {
      console.error('Error clearing security data:', error);
    }
  }

  /**
   * Get security status
   */
  getSecurityStatus(): {
    isInitialized: boolean;
    sessionActive: boolean;
    encryptionEnabled: boolean;
    auditLogSize: number;
  } {
    return {
      isInitialized: this.encryptionKey !== null,
      sessionActive: this.sessionTimer !== null,
      encryptionEnabled: this.encryptionKey !== null,
      auditLogSize: this.getAuditLog().length
    };
  }
}

// Export singleton instance
export const securityComplianceService = new SecurityComplianceService();