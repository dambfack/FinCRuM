import { securityComplianceService } from './security-compliance';

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  burstLimit: number;
  cooldownPeriod: number; // in milliseconds
}

interface RateLimitState {
  requestsThisMinute: number;
  requestsThisHour: number;
  requestsThisDay: number;
  lastMinuteReset: number;
  lastHourReset: number;
  lastDayReset: number;
  burstCount: number;
  lastBurstReset: number;
  isThrottled: boolean;
  throttledUntil: number;
}

interface QueuedRequest {
  id: string;
  operation: () => Promise<any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

interface RateLimitMetrics {
  totalRequests: number;
  throttledRequests: number;
  averageWaitTime: number;
  queueLength: number;
  successRate: number;
  lastThrottleTime: number | null;
}

export class RateLimiterService {
  private config: RateLimitConfig;
  private state: RateLimitState;
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private metrics: RateLimitMetrics;
  private storageKey = 'fincrm_rate_limit_state';
  private metricsKey = 'fincrm_rate_limit_metrics';

  constructor(config?: Partial<RateLimitConfig>) {
    // Load saved config from localStorage if available
    let savedConfig = {};
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem('fincrm_rate_limit_config');
        if (saved) {
          savedConfig = JSON.parse(saved);
        }
      } catch (error) {
        console.error('Failed to load rate limit config:', error);
      }
    }
    
    this.config = {
      maxRequestsPerMinute: 30,
      maxRequestsPerHour: 1000,
      maxRequestsPerDay: 10000,
      burstLimit: 5,
      cooldownPeriod: 60000, // 1 minute
      ...savedConfig,
      ...config
    };

    // Only access localStorage in browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      this.state = this.loadState();
      this.metrics = this.loadMetrics();
    } else {
      // Default state for SSR
      this.state = this.getDefaultState();
      this.metrics = this.getDefaultMetrics();
    }
    
    this.startQueueProcessor();
    this.startCleanupTimer();
  }

  /**
   * Execute a request with rate limiting
   */
  async executeRequest<T>(
    operation: () => Promise<T>,
    priority: QueuedRequest['priority'] = 'medium',
    maxRetries = 3
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: this.generateRequestId(),
        operation,
        priority,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries,
        resolve,
        reject
      };

      this.addToQueue(request);
    });
  }

  /**
   * Check if a request can be executed immediately
   */
  canExecuteNow(): boolean {
    this.updateTimers();
    
    if (this.state.isThrottled && Date.now() < this.state.throttledUntil) {
      return false;
    }

    return (
      this.state.requestsThisMinute < this.config.maxRequestsPerMinute &&
      this.state.requestsThisHour < this.config.maxRequestsPerHour &&
      this.state.requestsThisDay < this.config.maxRequestsPerDay &&
      this.state.burstCount < this.config.burstLimit
    );
  }

  /**
   * Get time until next request can be made
   */
  getTimeUntilNextRequest(): number {
    this.updateTimers();

    if (this.state.isThrottled) {
      return Math.max(0, this.state.throttledUntil - Date.now());
    }

    const now = Date.now();
    const timeUntilMinuteReset = 60000 - (now - this.state.lastMinuteReset);
    const timeUntilHourReset = 3600000 - (now - this.state.lastHourReset);
    const timeUntilDayReset = 86400000 - (now - this.state.lastDayReset);
    const timeUntilBurstReset = this.config.cooldownPeriod - (now - this.state.lastBurstReset);

    if (this.state.requestsThisMinute >= this.config.maxRequestsPerMinute) {
      return timeUntilMinuteReset;
    }

    if (this.state.requestsThisHour >= this.config.maxRequestsPerHour) {
      return timeUntilHourReset;
    }

    if (this.state.requestsThisDay >= this.config.maxRequestsPerDay) {
      return timeUntilDayReset;
    }

    if (this.state.burstCount >= this.config.burstLimit) {
      return timeUntilBurstReset;
    }

    return 0;
  }

  /**
   * Get current rate limit status
   */
  getStatus() {
    this.updateTimers();
    
    return {
      canExecute: this.canExecuteNow(),
      timeUntilNext: this.getTimeUntilNextRequest(),
      requestsThisMinute: this.state.requestsThisMinute,
      requestsThisHour: this.state.requestsThisHour,
      requestsThisDay: this.state.requestsThisDay,
      burstCount: this.state.burstCount,
      queueLength: this.requestQueue.length,
      isThrottled: this.state.isThrottled,
      throttledUntil: this.state.throttledUntil,
      limits: {
        perMinute: this.config.maxRequestsPerMinute,
        perHour: this.config.maxRequestsPerHour,
        perDay: this.config.maxRequestsPerDay,
        burst: this.config.burstLimit
      }
    };
  }

  /**
   * Get rate limiting metrics
   */
  getMetrics(): RateLimitMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear the request queue
   */
  clearQueue(): void {
    this.requestQueue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.requestQueue = [];
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveState();
  }

  /**
   * Reset rate limiting state
   */
  reset(): void {
    this.state = {
      requestsThisMinute: 0,
      requestsThisHour: 0,
      requestsThisDay: 0,
      lastMinuteReset: Date.now(),
      lastHourReset: Date.now(),
      lastDayReset: Date.now(),
      burstCount: 0,
      lastBurstReset: Date.now(),
      isThrottled: false,
      throttledUntil: 0
    };
    this.saveState();
  }

  /**
   * Enable or disable rate limiting
   */
  setEnabled(enabled: boolean): void {
    if (!enabled) {
      this.clearQueue();
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('fincrm_rate_limiting_enabled', enabled.toString());
    }
  }

  /**
   * Check if rate limiting is enabled
   */
  isEnabled(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return true; // Default to enabled in SSR
    }
    return localStorage.getItem('fincrm_rate_limiting_enabled') !== 'false';
  }

  /**
   * Update rate limit configuration
   */
  setRateLimit(period: 'minute' | 'hour' | 'day', limit: number): void {
    switch (period) {
      case 'minute':
        this.config.maxRequestsPerMinute = limit;
        break;
      case 'hour':
        this.config.maxRequestsPerHour = limit;
        break;
      case 'day':
        this.config.maxRequestsPerDay = limit;
        break;
      default:
        throw new Error(`Invalid period: ${period}`);
    }
    
    // Save updated config to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('fincrm_rate_limit_config', JSON.stringify(this.config));
      } catch (error) {
        console.error('Failed to save rate limit config:', error);
      }
    }
  }

  /**
   * Get current rate limit configuration
   */
  getRateLimit(period: 'minute' | 'hour' | 'day'): number {
    switch (period) {
      case 'minute':
        return this.config.maxRequestsPerMinute;
      case 'hour':
        return this.config.maxRequestsPerHour;
      case 'day':
        return this.config.maxRequestsPerDay;
      default:
        throw new Error(`Invalid period: ${period}`);
    }
  }

  private addToQueue(request: QueuedRequest): void {
    // Insert request based on priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const insertIndex = this.requestQueue.findIndex(
      req => priorityOrder[req.priority] > priorityOrder[request.priority]
    );
    
    if (insertIndex === -1) {
      this.requestQueue.push(request);
    } else {
      this.requestQueue.splice(insertIndex, 0, request);
    }

    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0 || !this.isEnabled()) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      if (!this.canExecuteNow()) {
        const waitTime = this.getTimeUntilNextRequest();
        if (waitTime > 0) {
          await this.sleep(Math.min(waitTime, 5000)); // Max 5 second wait
          continue;
        }
      }

      const request = this.requestQueue.shift();
      if (!request) break;

      try {
        await this.executeQueuedRequest(request);
      } catch (error) {
        console.error('Error processing queued request:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  private async executeQueuedRequest(request: QueuedRequest): Promise<void> {
    try {
      this.incrementCounters();
      const startTime = Date.now();
      
      const result = await request.operation();
      
      const waitTime = Date.now() - request.timestamp;
      this.updateMetrics(true, waitTime);
      
      request.resolve(result);
      
      // Log successful request
      securityComplianceService.logSecurityEvent({
        type: 'rate_limit_request_success',
        details: {
          requestId: request.id,
          priority: request.priority,
          waitTime,
          executionTime: Date.now() - startTime
        }
      });
    } catch (error) {
      this.updateMetrics(false, Date.now() - request.timestamp);
      
      if (request.retryCount < request.maxRetries) {
        request.retryCount++;
        request.timestamp = Date.now();
        this.addToQueue(request);
        
        securityComplianceService.logSecurityEvent({
          type: 'rate_limit_request_retry',
          details: {
            requestId: request.id,
            retryCount: request.retryCount,
            error: error.message
          }
        });
      } else {
        request.reject(error);
        
        securityComplianceService.logSecurityEvent({
          type: 'rate_limit_request_failed',
          details: {
            requestId: request.id,
            retryCount: request.retryCount,
            error: error.message
          }
        });
      }
    }
  }

  private incrementCounters(): void {
    this.updateTimers();
    
    this.state.requestsThisMinute++;
    this.state.requestsThisHour++;
    this.state.requestsThisDay++;
    this.state.burstCount++;
    this.state.lastBurstReset = Date.now();

    // Check for throttling conditions
    if (
      this.state.requestsThisMinute >= this.config.maxRequestsPerMinute ||
      this.state.requestsThisHour >= this.config.maxRequestsPerHour ||
      this.state.requestsThisDay >= this.config.maxRequestsPerDay ||
      this.state.burstCount >= this.config.burstLimit
    ) {
      this.state.isThrottled = true;
      this.state.throttledUntil = Date.now() + this.config.cooldownPeriod;
      
      securityComplianceService.logSecurityEvent({
        type: 'rate_limit_throttled',
        details: {
          reason: 'Rate limit exceeded',
          requestsThisMinute: this.state.requestsThisMinute,
          requestsThisHour: this.state.requestsThisHour,
          requestsThisDay: this.state.requestsThisDay,
          burstCount: this.state.burstCount
        }
      });
    }

    this.saveState();
  }

  private updateTimers(): void {
    const now = Date.now();

    // Reset minute counter
    if (now - this.state.lastMinuteReset >= 60000) {
      this.state.requestsThisMinute = 0;
      this.state.lastMinuteReset = now;
    }

    // Reset hour counter
    if (now - this.state.lastHourReset >= 3600000) {
      this.state.requestsThisHour = 0;
      this.state.lastHourReset = now;
    }

    // Reset day counter
    if (now - this.state.lastDayReset >= 86400000) {
      this.state.requestsThisDay = 0;
      this.state.lastDayReset = now;
    }

    // Reset burst counter
    if (now - this.state.lastBurstReset >= this.config.cooldownPeriod) {
      this.state.burstCount = 0;
      this.state.lastBurstReset = now;
    }

    // Clear throttling if cooldown period has passed
    if (this.state.isThrottled && now >= this.state.throttledUntil) {
      this.state.isThrottled = false;
      this.state.throttledUntil = 0;
    }
  }

  private updateMetrics(success: boolean, waitTime: number): void {
    this.metrics.totalRequests++;
    
    if (!success) {
      this.metrics.throttledRequests++;
    }
    
    if (this.state.isThrottled) {
      this.metrics.lastThrottleTime = Date.now();
    }
    
    // Update average wait time
    this.metrics.averageWaitTime = 
      (this.metrics.averageWaitTime * (this.metrics.totalRequests - 1) + waitTime) / 
      this.metrics.totalRequests;
    
    this.metrics.queueLength = this.requestQueue.length;
    this.metrics.successRate = 
      ((this.metrics.totalRequests - this.metrics.throttledRequests) / this.metrics.totalRequests) * 100;
    
    this.saveMetrics();
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessingQueue && this.requestQueue.length > 0) {
        this.processQueue();
      }
    }, 1000);
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.updateTimers();
      this.saveState();
      
      // Remove old queued requests (older than 5 minutes)
      const fiveMinutesAgo = Date.now() - 300000;
      const oldRequests = this.requestQueue.filter(req => req.timestamp < fiveMinutesAgo);
      
      oldRequests.forEach(req => {
        req.reject(new Error('Request timeout'));
      });
      
      this.requestQueue = this.requestQueue.filter(req => req.timestamp >= fiveMinutesAgo);
    }, 30000); // Every 30 seconds
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getDefaultState(): RateLimitState {
    const now = Date.now();
    return {
      requestsThisMinute: 0,
      requestsThisHour: 0,
      requestsThisDay: 0,
      lastMinuteReset: now,
      lastHourReset: now,
      lastDayReset: now,
      burstCount: 0,
      lastBurstReset: now,
      isThrottled: false,
      throttledUntil: 0
    };
  }

  private getDefaultMetrics(): RateLimitMetrics {
    return {
      totalRequests: 0,
      throttledRequests: 0,
      averageWaitTime: 0,
      queueLength: 0,
      successRate: 100,
      lastThrottleTime: null
    };
  }

  private loadState(): RateLimitState {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return this.getDefaultState();
      }
      
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const state = JSON.parse(saved);
        // Validate and update timers on load
        const now = Date.now();
        
        // Reset counters if too much time has passed
        if (now - state.lastMinuteReset >= 60000) {
          state.requestsThisMinute = 0;
          state.lastMinuteReset = now;
        }
        
        if (now - state.lastHourReset >= 3600000) {
          state.requestsThisHour = 0;
          state.lastHourReset = now;
        }
        
        if (now - state.lastDayReset >= 86400000) {
          state.requestsThisDay = 0;
          state.lastDayReset = now;
        }
        
        if (now - state.lastBurstReset >= this.config.cooldownPeriod) {
          state.burstCount = 0;
          state.lastBurstReset = now;
        }
        
        if (state.isThrottled && now >= state.throttledUntil) {
          state.isThrottled = false;
          state.throttledUntil = 0;
        }
        
        return state;
      }
    } catch (error) {
      console.error('Failed to load rate limit state:', error);
    }

    const now = Date.now();
    return {
      requestsThisMinute: 0,
      requestsThisHour: 0,
      requestsThisDay: 0,
      lastMinuteReset: now,
      lastHourReset: now,
      lastDayReset: now,
      burstCount: 0,
      lastBurstReset: now,
      isThrottled: false,
      throttledUntil: 0
    };
  }

  private saveState(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
      }
    } catch (error) {
      console.error('Failed to save rate limit state:', error);
    }
  }

  private loadMetrics(): RateLimitMetrics {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(this.metricsKey);
        if (saved) {
          return JSON.parse(saved);
        }
      }
    } catch (error) {
      console.error('Failed to load rate limit metrics:', error);
    }

    return this.getDefaultMetrics();
  }

  private saveMetrics(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.metricsKey, JSON.stringify(this.metrics));
      }
    } catch (error) {
      console.error('Failed to save rate limit metrics:', error);
    }
  }
}

// Export getter function to avoid SSR issues
let rateLimiterInstance: RateLimiterService | null = null;

export function getRateLimiterService(): RateLimiterService {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiterService();
  }
  return rateLimiterInstance;
}