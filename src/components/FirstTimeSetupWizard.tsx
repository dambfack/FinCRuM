import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Cloud,
  HardDrive,
  Users,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  ArrowLeft,
  Settings,
  Zap,
  Globe,
  Database
} from 'lucide-react';
import { getCloudDatabase } from '@/services/shared-cloud-database';
import { securityComplianceService } from '@/services/security-compliance';

interface SetupChoice {
  type: 'local' | 'cloud';
  title: string;
  description: string;
  features: string[];
  limitations: string[];
  icon: React.ReactNode;
}

interface CloudAccount {
  provider: 'google' | 'onedrive';
  email: string;
  hasExistingUsers: boolean;
  userCount: number;
  lastSync: string | null;
}

interface ConflictItem {
  type: 'user' | 'data';
  description: string;
  localValue: any;
  cloudValue: any;
  resolution: 'keep_cloud' | 'keep_local' | 'merge' | 'manual';
}

interface FirstTimeSetupWizardProps {
  onSetupComplete: (setupResult: any) => void;
}

export const FirstTimeSetupWizard: React.FC<FirstTimeSetupWizardProps> = ({ onSetupComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [setupChoice, setSetupChoice] = useState<'local' | 'cloud' | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'onedrive' | null>(null);
  const [cloudAccount, setCloudAccount] = useState<CloudAccount | null>(null);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [setupProgress, setSetupProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const setupChoices: SetupChoice[] = [
    {
      type: 'local',
      title: 'Local Storage Only',
      description: 'Keep all data on this device only',
      features: [
        'Fast performance',
        'Complete privacy',
        'No internet required',
        'Instant access'
      ],
      limitations: [
        'Single device only',
        'No multi-user support',
        'No automatic backup',
        'Data loss if device fails'
      ],
      icon: <HardDrive className="h-8 w-8 text-blue-500" />
    },
    {
      type: 'cloud',
      title: 'Cloud Sync',
      description: 'Sync data across devices and enable multi-user features',
      features: [
        'Multi-device access',
        'Multi-user support',
        'Automatic backup',
        'Real-time sync',
        'Data recovery'
      ],
      limitations: [
        'Requires internet',
        'Uses cloud storage quota',
        'Potential sync delays',
        'Rate limiting applies'
      ],
      icon: <Cloud className="h-8 w-8 text-green-500" />
    }
  ];

  const steps = [
    'Choose Setup Type',
    setupChoice === 'cloud' ? 'Select Cloud Provider' : 'Configure Local Storage',
    setupChoice === 'cloud' ? 'Account Setup' : 'Complete Setup',
    setupChoice === 'cloud' ? 'Resolve Conflicts' : null,
    'Finalize Setup'
  ].filter(Boolean);

  useEffect(() => {
    // Check if user has already completed setup
    const hasCompletedSetup = localStorage.getItem('fincrm_setup_completed');
    if (hasCompletedSetup) {
      setIsComplete(true);
    }
  }, []);

  const handleSetupChoice = (choice: 'local' | 'cloud') => {
    setSetupChoice(choice);
    setSetupProgress(25);
    
    if (choice === 'local') {
      // Configure for local-only mode
      localStorage.setItem('fincrm_storage_mode', 'local');
      localStorage.setItem('fincrm_multi_user_enabled', 'false');
      setCurrentStep(currentStep + 2); // Skip cloud-specific steps
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleProviderSelection = (provider: 'google' | 'onedrive') => {
    setSelectedProvider(provider);
    setSetupProgress(50);
    setCurrentStep(currentStep + 1);
  };

  const connectToCloudAccount = async () => {
    if (!selectedProvider) return;
    
    setIsConnecting(true);
    try {
      // Simulate cloud account connection and check for existing users
      const mockAccount: CloudAccount = {
        provider: selectedProvider,
        email: selectedProvider === 'google' ? 'user@gmail.com' : 'user@outlook.com',
        hasExistingUsers: Math.random() > 0.5, // Simulate 50% chance of existing users
        userCount: Math.floor(Math.random() * 5) + 1,
        lastSync: Math.random() > 0.3 ? new Date().toISOString() : null
      };
      
      setCloudAccount(mockAccount);
      setSetupProgress(75);
      
      // Check for conflicts if there are existing users
      if (mockAccount.hasExistingUsers) {
        const mockConflicts: ConflictItem[] = [
          {
            type: 'user',
            description: 'Admin user already exists in cloud account',
            localValue: { name: 'Local Admin', role: 'admin' },
            cloudValue: { name: 'Cloud Admin', role: 'admin' },
            resolution: 'keep_cloud'
          },
          {
            type: 'data',
            description: 'Customer database conflicts detected',
            localValue: { customers: 15, lastModified: new Date().toISOString() },
            cloudValue: { customers: 23, lastModified: new Date(Date.now() - 86400000).toISOString() },
            resolution: 'manual'
          }
        ];
        setConflicts(mockConflicts);
        setCurrentStep(currentStep + 1);
      } else {
        // No conflicts, proceed to finalization
        setCurrentStep(currentStep + 2);
      }
    } catch (error) {
      console.error('Failed to connect to cloud account:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const resolveConflict = (index: number, resolution: ConflictItem['resolution']) => {
    setConflicts(prev => 
      prev.map((conflict, i) => 
        i === index ? { ...conflict, resolution } : conflict
      )
    );
  };

  const finalizeSetup = async () => {
    setIsProcessing(true);
    setSetupError(null);
    setSetupProgress(100);
    
    try {
      if (setupChoice === 'cloud') {
        // Configure cloud sync settings
        localStorage.setItem('fincrm_storage_mode', 'cloud');
        localStorage.setItem('fincrm_cloud_provider', selectedProvider!);
        localStorage.setItem('fincrm_multi_user_enabled', 'true');
        localStorage.setItem('fincrm_rate_limit_enabled', 'true');
        
        // Apply conflict resolutions
        for (const conflict of conflicts) {
          await applyConflictResolution(conflict);
        }
        
        // Initialize cloud sync with rate limiting
        await getCloudDatabase().initializeCloudSync({
          provider: selectedProvider!,
          rateLimitEnabled: true,
          maxRequestsPerMinute: 30, // Conservative limit for personal accounts
          maxRequestsPerHour: 1000
        });
      } else {
        // Configure local storage settings
        localStorage.setItem('fincrm_storage_mode', 'local');
        localStorage.setItem('fincrm_multi_user_enabled', 'false');
        localStorage.setItem('fincrm_rate_limit_enabled', 'false');
      }
      
      // Mark setup as completed
      localStorage.setItem('fincrm_setup_completed', 'true');
      localStorage.setItem('fincrm_setup_date', new Date().toISOString());
      
      // Log setup completion
      securityComplianceService.logSecurityEvent({
        type: 'setup_completed',
        details: {
          storageMode: setupChoice,
          cloudProvider: selectedProvider,
          multiUserEnabled: setupChoice === 'cloud',
          timestamp: new Date().toISOString()
        }
      });
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsComplete(true);
    } catch (error) {
      console.error('Failed to finalize setup:', error);
      setSetupError(error instanceof Error ? error.message : 'An unexpected error occurred during setup');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyConflictResolution = async (conflict: ConflictItem) => {
    switch (conflict.resolution) {
      case 'keep_cloud':
        // Cloud data takes precedence
        console.log('Keeping cloud data for:', conflict.description);
        break;
      case 'keep_local':
        // Local data takes precedence
        console.log('Keeping local data for:', conflict.description);
        break;
      case 'merge':
        // Attempt to merge data
        console.log('Merging data for:', conflict.description);
        break;
      case 'manual':
        // Manual resolution required
        console.log('Manual resolution required for:', conflict.description);
        break;
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setSetupProgress(Math.max(0, setupProgress - 25));
    }
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Setup Complete!</CardTitle>
            <CardDescription>
              FinCRuM is ready to use with your selected configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium">Configuration Summary</div>
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                <div>Storage Mode: {setupChoice === 'local' ? 'Local Only' : 'Cloud Sync'}</div>
                {setupChoice === 'cloud' && (
                  <>
                    <div>Provider: {selectedProvider}</div>
                    <div>Multi-User: Enabled</div>
                    <div>Rate Limiting: Enabled</div>
                  </>
                )}
              </div>
            </div>
            <Button onClick={() => onSetupComplete({ setupChoice, selectedProvider })} className="w-full">
              Start Using FinCRuM
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Welcome to FinCRuM</CardTitle>
              <CardDescription>
                Let's set up your financial CRM system
              </CardDescription>
            </div>
            <Badge variant="outline">
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Setup Progress</span>
              <span>{setupProgress}%</span>
            </div>
            <Progress value={setupProgress} className="w-full" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Step 1: Choose Setup Type */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Choose Your Setup Type</h3>
                <p className="text-muted-foreground">
                  Select how you want to store and access your data
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {setupChoices.map((choice) => (
                  <Card 
                    key={choice.type}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      setupChoice === choice.type ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleSetupChoice(choice.type)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        {choice.icon}
                        <div>
                          <CardTitle className="text-lg">{choice.title}</CardTitle>
                          <CardDescription>{choice.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Features
                        </h4>
                        <ul className="text-sm space-y-1">
                          {choice.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-green-500 rounded-full" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-orange-700 mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Limitations
                        </h4>
                        <ul className="text-sm space-y-1">
                          {choice.limitations.map((limitation, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-orange-500 rounded-full" />
                              {limitation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Cloud Provider Selection */}
          {currentStep === 1 && setupChoice === 'cloud' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Select Cloud Provider</h3>
                <p className="text-muted-foreground">
                  Choose your preferred cloud storage provider
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedProvider === 'google' ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleProviderSelection('google')}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Globe className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <CardTitle>Google Drive</CardTitle>
                        <CardDescription>15GB free storage</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      <li>• Excellent integration with Google services</li>
                      <li>• Reliable sync performance</li>
                      <li>• Advanced sharing capabilities</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedProvider === 'onedrive' ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleProviderSelection('onedrive')}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Database className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle>OneDrive</CardTitle>
                        <CardDescription>5GB free storage</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      <li>• Deep Windows integration</li>
                      <li>• Office 365 compatibility</li>
                      <li>• Enterprise-grade security</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Rate Limiting Notice</AlertTitle>
                <AlertDescription>
                  To respect personal cloud account limits, sync operations will be rate-limited to 30 requests per minute and 1000 requests per hour.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 3: Account Setup */}
          {currentStep === 2 && setupChoice === 'cloud' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Connect Your Account</h3>
                <p className="text-muted-foreground">
                  Authenticate with {selectedProvider === 'google' ? 'Google' : 'Microsoft'} to enable cloud sync
                </p>
              </div>
              
              {!cloudAccount ? (
                <div className="text-center space-y-4">
                  <Button 
                    onClick={connectToCloudAccount}
                    disabled={isConnecting}
                    size="lg"
                    className="w-full max-w-md"
                  >
                    {isConnecting ? (
                      <>
                        <Settings className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 mr-2" />
                        Connect to {selectedProvider === 'google' ? 'Google Drive' : 'OneDrive'}
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Account Connected Successfully</AlertTitle>
                    <AlertDescription>
                      Connected to {cloudAccount.email} ({cloudAccount.provider})
                    </AlertDescription>
                  </Alert>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Account Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>Email:</span>
                        <span className="font-medium">{cloudAccount.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Existing Users:</span>
                        <Badge variant={cloudAccount.hasExistingUsers ? 'default' : 'secondary'}>
                          {cloudAccount.hasExistingUsers ? `${cloudAccount.userCount} users found` : 'New account'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Sync:</span>
                        <span className="text-sm text-muted-foreground">
                          {cloudAccount.lastSync ? new Date(cloudAccount.lastSync).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {cloudAccount.hasExistingUsers ? (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Existing Data Detected</AlertTitle>
                      <AlertDescription>
                        This account already has user data. Cloud data will take precedence, and conflicts will need to be resolved manually.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>New Account Setup</AlertTitle>
                      <AlertDescription>
                        This is a new account. Your existing local data will be synced to the cloud, and you'll have full access to multi-user features.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Conflict Resolution */}
          {currentStep === 3 && setupChoice === 'cloud' && conflicts.length > 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Resolve Data Conflicts</h3>
                <p className="text-muted-foreground">
                  Choose how to handle conflicts between local and cloud data
                </p>
              </div>
              
              <div className="space-y-4">
                {conflicts.map((conflict, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        {conflict.description}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium mb-2">Local Data</h4>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                            {JSON.stringify(conflict.localValue, null, 2)}
                          </pre>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <h4 className="font-medium mb-2">Cloud Data</h4>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                            {JSON.stringify(conflict.cloudValue, null, 2)}
                          </pre>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Resolution Strategy:</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            { value: 'keep_cloud', label: 'Keep Cloud', color: 'bg-blue-100 text-blue-700' },
                            { value: 'keep_local', label: 'Keep Local', color: 'bg-green-100 text-green-700' },
                            { value: 'merge', label: 'Merge', color: 'bg-purple-100 text-purple-700' },
                            { value: 'manual', label: 'Manual', color: 'bg-orange-100 text-orange-700' }
                          ].map((option) => (
                            <Button
                              key={option.value}
                              variant={conflict.resolution === option.value ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => resolveConflict(index, option.value as ConflictItem['resolution'])}
                              className={conflict.resolution === option.value ? '' : option.color}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Local Setup Completion */}
          {currentStep === 2 && setupChoice === 'local' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Local Storage Configuration</h3>
                <p className="text-muted-foreground">
                  Your data will be stored locally on this device only
                </p>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Configuration Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Storage Mode:</span>
                    <Badge>Local Only</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Multi-User Support:</span>
                    <Badge variant="secondary">Disabled</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Cloud Sync:</span>
                    <Badge variant="secondary">Disabled</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Data Location:</span>
                    <span className="text-sm text-muted-foreground">Browser Local Storage</span>
                  </div>
                </CardContent>
              </Card>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Important Notes</AlertTitle>
                <AlertDescription className="space-y-2">
                  <div>• You can enable cloud sync later from the settings menu</div>
                  <div>• Multi-user features will only be available after enabling cloud sync</div>
                  <div>• Regular backups are recommended to prevent data loss</div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Final Step: Complete Setup */}
          {currentStep === steps.length - 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Ready to Complete Setup</h3>
                <p className="text-muted-foreground">
                  Review your configuration and finalize the setup
                </p>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Final Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Storage Mode:</span>
                    <Badge>{setupChoice === 'local' ? 'Local Only' : 'Cloud Sync'}</Badge>
                  </div>
                  {setupChoice === 'cloud' && (
                    <>
                      <div className="flex justify-between">
                        <span>Cloud Provider:</span>
                        <Badge>{selectedProvider}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Account:</span>
                        <span className="text-sm">{cloudAccount?.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Multi-User:</span>
                        <Badge>Enabled</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Rate Limiting:</span>
                        <Badge>Enabled</Badge>
                      </div>
                      {conflicts.length > 0 && (
                        <div className="flex justify-between">
                          <span>Conflicts Resolved:</span>
                          <Badge>{conflicts.length} items</Badge>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              
              {setupError && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Setup Error</AlertTitle>
                  <AlertDescription>{setupError}</AlertDescription>
                </Alert>
              )}
              
              <div className="text-center">
                <Button 
                  onClick={finalizeSetup} 
                  size="lg" 
                  className="w-full max-w-md"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Complete Setup
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <Separator />
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={goBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <Button 
              onClick={goNext}
              disabled={
                currentStep === steps.length - 1 ||
                (currentStep === 0 && !setupChoice) ||
                (currentStep === 1 && setupChoice === 'cloud' && !selectedProvider) ||
                (currentStep === 2 && setupChoice === 'cloud' && !cloudAccount)
              }
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FirstTimeSetupWizard;