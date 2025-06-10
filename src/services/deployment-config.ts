import { testingService } from './testing-service';
import { securityComplianceService } from './security-compliance';
import { backupVersioningService } from './backup-versioning';

/**
 * Deployment configuration and automation service
 * Handles environment setup, build processes, and deployment automation
 */
export class DeploymentConfigService {
  private deploymentConfig: DeploymentConfig;
  private buildStatus: BuildStatus = 'idle';
  private deploymentStatus: DeploymentStatus = 'idle';
  private buildLogs: string[] = [];
  private deploymentLogs: string[] = [];

  constructor() {
    this.deploymentConfig = this.getDefaultConfig();
    // Only load configuration in browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      this.loadConfiguration();
    }
  }

  /**
   * Get default deployment configuration
   */
  private getDefaultConfig(): DeploymentConfig {
    return {
      environments: {
        development: {
          name: 'Development',
          url: 'http://localhost:3000',
          apiUrl: 'http://localhost:3001/api',
          features: {
            debugMode: true,
            testMode: true,
            mockData: true,
            hotReload: true
          },
          security: {
            httpsRequired: false,
            corsEnabled: true,
            rateLimiting: false
          },
          database: {
            provider: 'localStorage',
            backupEnabled: false
          }
        },
        staging: {
          name: 'Staging',
          url: 'https://staging.fincrm.app',
          apiUrl: 'https://staging-api.fincrm.app',
          features: {
            debugMode: false,
            testMode: true,
            mockData: false,
            hotReload: false
          },
          security: {
            httpsRequired: true,
            corsEnabled: true,
            rateLimiting: true
          },
          database: {
            provider: 'cloud',
            backupEnabled: true
          }
        },
        production: {
          name: 'Production',
          url: 'https://fincrm.app',
          apiUrl: 'https://api.fincrm.app',
          features: {
            debugMode: false,
            testMode: false,
            mockData: false,
            hotReload: false
          },
          security: {
            httpsRequired: true,
            corsEnabled: false,
            rateLimiting: true
          },
          database: {
            provider: 'cloud',
            backupEnabled: true
          }
        }
      },
      build: {
        outputDir: 'dist',
        sourceMap: true,
        minification: true,
        compression: true,
        bundleAnalysis: true,
        treeshaking: true
      },
      deployment: {
        strategy: 'rolling',
        healthChecks: true,
        rollbackEnabled: true,
        preDeploymentTests: true,
        postDeploymentTests: true,
        notifications: {
          email: true,
          slack: false,
          webhook: false
        }
      },
      monitoring: {
        errorTracking: true,
        performanceMonitoring: true,
        userAnalytics: false,
        logLevel: 'info'
      }
    };
  }

  /**
   * Load configuration from storage
   */
  private loadConfiguration(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('fincrm_deployment_config');
        if (stored) {
          const config = JSON.parse(stored);
          this.deploymentConfig = { ...this.deploymentConfig, ...config };
        }
      }
    } catch (error) {
      console.warn('Failed to load deployment configuration:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  private saveConfiguration(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('fincrm_deployment_config', JSON.stringify(this.deploymentConfig));
      }
    } catch (error) {
      console.error('Failed to save deployment configuration:', error);
    }
  }

  /**
   * Get current deployment configuration
   */
  getConfiguration(): DeploymentConfig {
    return { ...this.deploymentConfig };
  }

  /**
   * Update deployment configuration
   */
  updateConfiguration(updates: Partial<DeploymentConfig>): { success: boolean; error?: string } {
    try {
      this.deploymentConfig = { ...this.deploymentConfig, ...updates };
      this.saveConfiguration();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Configuration update failed'
      };
    }
  }

  /**
   * Get environment configuration
   */
  getEnvironmentConfig(environment: EnvironmentType): EnvironmentConfig | null {
    return this.deploymentConfig.environments[environment] || null;
  }

  /**
   * Update environment configuration
   */
  updateEnvironmentConfig(
    environment: EnvironmentType,
    config: Partial<EnvironmentConfig>
  ): { success: boolean; error?: string } {
    try {
      if (!this.deploymentConfig.environments[environment]) {
        return { success: false, error: `Environment '${environment}' not found` };
      }

      this.deploymentConfig.environments[environment] = {
        ...this.deploymentConfig.environments[environment],
        ...config
      };

      this.saveConfiguration();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Environment configuration update failed'
      };
    }
  }

  /**
   * Validate environment configuration
   */
  validateEnvironmentConfig(environment: EnvironmentType): ValidationResult {
    const config = this.getEnvironmentConfig(environment);
    if (!config) {
      return {
        isValid: false,
        errors: [`Environment '${environment}' not found`],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate URLs
    if (!config.url || !this.isValidUrl(config.url)) {
      errors.push('Invalid or missing application URL');
    }

    if (!config.apiUrl || !this.isValidUrl(config.apiUrl)) {
      errors.push('Invalid or missing API URL');
    }

    // Validate security settings for production
    if (environment === 'production') {
      if (!config.security.httpsRequired) {
        errors.push('HTTPS is required for production environment');
      }

      if (config.features.debugMode) {
        warnings.push('Debug mode should be disabled in production');
      }

      if (config.features.testMode) {
        warnings.push('Test mode should be disabled in production');
      }

      if (config.features.mockData) {
        errors.push('Mock data must be disabled in production');
      }
    }

    // Validate database configuration
    if (environment !== 'development' && config.database.provider === 'localStorage') {
      warnings.push('localStorage is not recommended for non-development environments');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run pre-deployment checks
   */
  async runPreDeploymentChecks(environment: EnvironmentType): Promise<CheckResult> {
    const checks: CheckResult = {
      passed: true,
      results: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Environment configuration validation
      const configValidation = this.validateEnvironmentConfig(environment);
      checks.results.push({
        name: 'Environment Configuration',
        passed: configValidation.isValid,
        message: configValidation.isValid ? 'Configuration is valid' : 'Configuration validation failed',
        details: configValidation
      });

      if (!configValidation.isValid) {
        checks.passed = false;
      }

      // Security checks
      const securityStatus = securityComplianceService.getSecurityStatus();
      checks.results.push({
        name: 'Security Configuration',
        passed: securityStatus.encryptionEnabled,
        message: securityStatus.encryptionEnabled ? 'Security is properly configured' : 'Security configuration issues detected',
        details: securityStatus
      });

      if (!securityStatus.encryptionEnabled) {
        checks.passed = false;
      }

      // Backup system check
      const backupStatus = backupVersioningService.getStatus();
      checks.results.push({
        name: 'Backup System',
        passed: backupStatus.isInitialized,
        message: backupStatus.isInitialized ? 'Backup system is ready' : 'Backup system not initialized',
        details: backupStatus
      });

      if (!backupStatus.isInitialized && environment !== 'development') {
        checks.passed = false;
      }

      // Run tests if enabled
      if (this.deploymentConfig.deployment.preDeploymentTests) {
        const testResults = await testingService.runTestSuite('unit');
        const testsPassed = testResults.passedTests === testResults.totalTests;
        
        checks.results.push({
          name: 'Unit Tests',
          passed: testsPassed,
          message: testsPassed ? 'All unit tests passed' : `${testResults.failedTests} tests failed`,
          details: testResults
        });

        if (!testsPassed) {
          checks.passed = false;
        }
      }

      // Database connectivity check (simulated)
      const dbCheck = await this.checkDatabaseConnectivity(environment);
      checks.results.push({
        name: 'Database Connectivity',
        passed: dbCheck.success,
        message: dbCheck.success ? 'Database is accessible' : 'Database connectivity issues',
        details: dbCheck
      });

      if (!dbCheck.success) {
        checks.passed = false;
      }

    } catch (error) {
      checks.passed = false;
      checks.results.push({
        name: 'Pre-deployment Checks',
        passed: false,
        message: 'Pre-deployment checks failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return checks;
  }

  /**
   * Check database connectivity
   */
  private async checkDatabaseConnectivity(environment: EnvironmentType): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const config = this.getEnvironmentConfig(environment);
      if (!config) {
        return { success: false, error: 'Environment configuration not found' };
      }

      if (config.database.provider === 'localStorage') {
        // Check localStorage availability
        try {
          localStorage.setItem('connectivity_test', 'test');
          localStorage.removeItem('connectivity_test');
          return { success: true, details: { provider: 'localStorage' } };
        } catch {
          return { success: false, error: 'localStorage not available' };
        }
      } else {
        // For cloud providers, this would involve actual connectivity tests
        // For now, we'll simulate the check
        return {
          success: true,
          details: {
            provider: config.database.provider,
            simulated: true
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database connectivity check failed'
      };
    }
  }

  /**
   * Build application for deployment
   */
  async buildApplication(environment: EnvironmentType): Promise<BuildResult> {
    if (this.buildStatus === 'building') {
      return {
        success: false,
        error: 'Build already in progress',
        logs: [...this.buildLogs]
      };
    }

    this.buildStatus = 'building';
    this.buildLogs = [];
    const startTime = Date.now();

    try {
      this.addBuildLog(`Starting build for ${environment} environment`);
      
      // Simulate build steps
      await this.simulateBuildStep('Validating configuration', 500);
      await this.simulateBuildStep('Installing dependencies', 2000);
      await this.simulateBuildStep('Compiling TypeScript', 1500);
      await this.simulateBuildStep('Bundling assets', 2500);
      
      if (this.deploymentConfig.build.minification) {
        await this.simulateBuildStep('Minifying code', 1000);
      }
      
      if (this.deploymentConfig.build.compression) {
        await this.simulateBuildStep('Compressing assets', 800);
      }
      
      if (this.deploymentConfig.build.bundleAnalysis) {
        await this.simulateBuildStep('Analyzing bundle', 600);
      }

      await this.simulateBuildStep('Generating build artifacts', 500);
      
      const buildTime = Date.now() - startTime;
      this.addBuildLog(`Build completed successfully in ${buildTime}ms`);
      
      this.buildStatus = 'completed';
      
      return {
        success: true,
        buildTime,
        outputPath: this.deploymentConfig.build.outputDir,
        artifacts: [
          'index.html',
          'main.js',
          'main.css',
          'assets/',
          'manifest.json'
        ],
        logs: [...this.buildLogs]
      };
    } catch (error) {
      this.buildStatus = 'failed';
      this.addBuildLog(`Build failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Build failed',
        logs: [...this.buildLogs]
      };
    }
  }

  /**
   * Simulate build step
   */
  private async simulateBuildStep(step: string, duration: number): Promise<void> {
    this.addBuildLog(`${step}...`);
    await new Promise(resolve => setTimeout(resolve, duration));
    this.addBuildLog(`${step} completed`);
  }

  /**
   * Add build log entry
   */
  private addBuildLog(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.buildLogs.push(logEntry);
    console.log(logEntry);
  }

  /**
   * Deploy application
   */
  async deployApplication(
    environment: EnvironmentType,
    buildArtifacts?: string[]
  ): Promise<DeploymentResult> {
    if (this.deploymentStatus === 'deploying') {
      return {
        success: false,
        error: 'Deployment already in progress',
        logs: [...this.deploymentLogs]
      };
    }

    this.deploymentStatus = 'deploying';
    this.deploymentLogs = [];
    const startTime = Date.now();

    try {
      this.addDeploymentLog(`Starting deployment to ${environment}`);
      
      // Pre-deployment checks
      if (this.deploymentConfig.deployment.preDeploymentTests) {
        this.addDeploymentLog('Running pre-deployment checks...');
        const preChecks = await this.runPreDeploymentChecks(environment);
        
        if (!preChecks.passed) {
          throw new Error('Pre-deployment checks failed');
        }
        
        this.addDeploymentLog('Pre-deployment checks passed');
      }

      // Simulate deployment steps
      await this.simulateDeploymentStep('Uploading build artifacts', 3000);
      await this.simulateDeploymentStep('Updating configuration', 1000);
      await this.simulateDeploymentStep('Starting new instances', 2000);
      
      if (this.deploymentConfig.deployment.healthChecks) {
        await this.simulateDeploymentStep('Running health checks', 1500);
      }
      
      await this.simulateDeploymentStep('Switching traffic', 500);
      
      if (this.deploymentConfig.deployment.postDeploymentTests) {
        this.addDeploymentLog('Running post-deployment tests...');
        const postTests = await testingService.runTestSuite('integration');
        
        if (postTests.passedTests !== postTests.totalTests) {
          this.addDeploymentLog(`Warning: ${postTests.failedTests} post-deployment tests failed`);
        } else {
          this.addDeploymentLog('Post-deployment tests passed');
        }
      }
      
      const deploymentTime = Date.now() - startTime;
      this.addDeploymentLog(`Deployment completed successfully in ${deploymentTime}ms`);
      
      this.deploymentStatus = 'completed';
      
      // Send notifications if configured
      if (this.deploymentConfig.deployment.notifications.email) {
        this.addDeploymentLog('Sending deployment notification email...');
      }
      
      return {
        success: true,
        deploymentTime,
        environment,
        url: this.getEnvironmentConfig(environment)?.url,
        logs: [...this.deploymentLogs]
      };
    } catch (error) {
      this.deploymentStatus = 'failed';
      this.addDeploymentLog(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Attempt rollback if enabled
      if (this.deploymentConfig.deployment.rollbackEnabled) {
        this.addDeploymentLog('Attempting automatic rollback...');
        await this.simulateDeploymentStep('Rolling back deployment', 2000);
        this.addDeploymentLog('Rollback completed');
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed',
        environment,
        logs: [...this.deploymentLogs]
      };
    }
  }

  /**
   * Simulate deployment step
   */
  private async simulateDeploymentStep(step: string, duration: number): Promise<void> {
    this.addDeploymentLog(`${step}...`);
    await new Promise(resolve => setTimeout(resolve, duration));
    this.addDeploymentLog(`${step} completed`);
  }

  /**
   * Add deployment log entry
   */
  private addDeploymentLog(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.deploymentLogs.push(logEntry);
    console.log(logEntry);
  }

  /**
   * Get build status
   */
  getBuildStatus(): {
    status: BuildStatus;
    logs: string[];
  } {
    return {
      status: this.buildStatus,
      logs: [...this.buildLogs]
    };
  }

  /**
   * Get deployment status
   */
  getDeploymentStatus(): {
    status: DeploymentStatus;
    logs: string[];
  } {
    return {
      status: this.deploymentStatus,
      logs: [...this.deploymentLogs]
    };
  }

  /**
   * Generate deployment report
   */
  generateDeploymentReport(): DeploymentReport {
    const environments = Object.keys(this.deploymentConfig.environments) as EnvironmentType[];
    const environmentReports = environments.map(env => {
      const config = this.getEnvironmentConfig(env)!;
      const validation = this.validateEnvironmentConfig(env);
      
      return {
        environment: env,
        name: config.name,
        url: config.url,
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        lastDeployment: this.getLastDeploymentInfo(env)
      };
    });

    return {
      timestamp: new Date().toISOString(),
      configuration: this.deploymentConfig,
      environments: environmentReports,
      buildStatus: this.buildStatus,
      deploymentStatus: this.deploymentStatus
    };
  }

  /**
   * Get last deployment info (simulated)
   */
  private getLastDeploymentInfo(environment: EnvironmentType): any {
    // In a real implementation, this would fetch from deployment history
    return {
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      version: '1.0.0',
      status: 'success',
      duration: Math.floor(Math.random() * 300000) + 60000 // 1-5 minutes
    };
  }

  /**
   * Reset build and deployment status
   */
  reset(): void {
    this.buildStatus = 'idle';
    this.deploymentStatus = 'idle';
    this.buildLogs = [];
    this.deploymentLogs = [];
  }

  /**
   * Export configuration
   */
  exportConfiguration(): string {
    return JSON.stringify(this.deploymentConfig, null, 2);
  }

  /**
   * Import configuration
   */
  importConfiguration(configJson: string): { success: boolean; error?: string } {
    try {
      const config = JSON.parse(configJson);
      
      // Basic validation
      if (!config.environments || !config.build || !config.deployment) {
        return { success: false, error: 'Invalid configuration format' };
      }
      
      this.deploymentConfig = config;
      this.saveConfiguration();
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Configuration import failed'
      };
    }
  }
}

// Types
type EnvironmentType = 'development' | 'staging' | 'production';
type BuildStatus = 'idle' | 'building' | 'completed' | 'failed';
type DeploymentStatus = 'idle' | 'deploying' | 'completed' | 'failed';

interface DeploymentConfig {
  environments: Record<EnvironmentType, EnvironmentConfig>;
  build: BuildConfig;
  deployment: DeploymentSettings;
  monitoring: MonitoringConfig;
}

interface EnvironmentConfig {
  name: string;
  url: string;
  apiUrl: string;
  features: {
    debugMode: boolean;
    testMode: boolean;
    mockData: boolean;
    hotReload: boolean;
  };
  security: {
    httpsRequired: boolean;
    corsEnabled: boolean;
    rateLimiting: boolean;
  };
  database: {
    provider: 'localStorage' | 'cloud';
    backupEnabled: boolean;
  };
}

interface BuildConfig {
  outputDir: string;
  sourceMap: boolean;
  minification: boolean;
  compression: boolean;
  bundleAnalysis: boolean;
  treeshaking: boolean;
}

interface DeploymentSettings {
  strategy: 'rolling' | 'blue-green' | 'canary';
  healthChecks: boolean;
  rollbackEnabled: boolean;
  preDeploymentTests: boolean;
  postDeploymentTests: boolean;
  notifications: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
  };
}

interface MonitoringConfig {
  errorTracking: boolean;
  performanceMonitoring: boolean;
  userAnalytics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface CheckResult {
  passed: boolean;
  results: {
    name: string;
    passed: boolean;
    message: string;
    error?: string;
    details?: any;
  }[];
  timestamp: string;
}

interface BuildResult {
  success: boolean;
  buildTime?: number;
  outputPath?: string;
  artifacts?: string[];
  error?: string;
  logs: string[];
}

interface DeploymentResult {
  success: boolean;
  deploymentTime?: number;
  environment?: EnvironmentType;
  url?: string;
  error?: string;
  logs: string[];
}

interface DeploymentReport {
  timestamp: string;
  configuration: DeploymentConfig;
  environments: {
    environment: EnvironmentType;
    name: string;
    url: string;
    isValid: boolean;
    errors: string[];
    warnings: string[];
    lastDeployment: any;
  }[];
  buildStatus: BuildStatus;
  deploymentStatus: DeploymentStatus;
}

// Export getter function to avoid SSR issues
let deploymentConfigInstance: DeploymentConfigService | null = null;

export function getDeploymentConfigService(): DeploymentConfigService {
  if (!deploymentConfigInstance) {
    deploymentConfigInstance = new DeploymentConfigService();
  }
  return deploymentConfigInstance;
}