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
// Dynamic import to prevent server-side modules from being bundled on client
import { CloudDatabaseService } from '@/services/shared-cloud-database';
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
  provider: 'googledrive' | 'onedrive';
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
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedStep = localStorage.getItem('first_time_setup_step');
      if (savedStep && !isNaN(parseInt(savedStep, 10))) {
        return parseInt(savedStep, 10);
      }
    }
    return 0;
  });
  const [setupChoice, setSetupChoice] = useState<'local' | 'cloud' | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'googledrive' | 'onedrive' | null>(null);
  const [cloudAccount, setCloudAccount] = useState<CloudAccount | null>(null);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [setupProgress, setSetupProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('first_time_setup_step', currentStep.toString());
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      finalizeSetup();
    } else if (currentStep === 0 && !setupChoice) {
      setSetupError("Please select a setup type.");
      setTimeout(() => setSetupError(null), 3000);
    } else if (currentStep === 1 && setupChoice === 'cloud' && !selectedProvider) {
      setSetupError("Please select a cloud provider.");
      setTimeout(() => setSetupError(null), 3000);
    } else if (currentStep === 2 && setupChoice === 'cloud' && !cloudAccount) {
      // This case is handled by the connectToCloudAccount button itself
      // Or, if the button changes to 'Next' after connection, this logic might be needed.
    } else {
      // Logic for advancing, considering cloud skips
      let nextStep = currentStep;
      if (setupChoice === 'cloud' && currentStep === 2 && cloudAccount && !cloudAccount.hasExistingUsers) {
        nextStep = currentStep + 2; // Skip conflict resolution
      } else {
        nextStep = currentStep + 1;
      }
      setCurrentStep(nextStep);
    }
  };

  const isNextDisabled = () => {
    if (isProcessing) return true;
    if (currentStep === 0 && !setupChoice) return true;
    if (currentStep === 1 && setupChoice === 'cloud' && !selectedProvider) return true;
    // Disable Next/Finish on Account Setup step if cloudAccount is not yet set (i.e., still showing 'Connect')
    if (currentStep === 2 && setupChoice === 'cloud' && !cloudAccount) return true;
    // Disable Finish on the last step if processing (already covered by isProcessing)
    return false;
  };

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

  const handleProviderSelection = async (provider: 'googledrive' | 'onedrive') => {
    setSelectedProvider(provider);
    setSetupProgress(50);
    setSetupError(null);
    
    // Immediately initiate the authentication flow
    try {
      if (provider === 'googledrive') {
        // Import Google auth action dynamically
        const { generateGoogleAuthUrlAction } = await import('@/app/actions/google-auth-actions');
        const result = await generateGoogleAuthUrlAction();
        
        if (result.success && result.authUrl) {
          // Redirect to the authentication URL
        window.location.href = result.authUrl;
        } else {
          throw new Error(result.error || 'Failed to generate Google auth URL');
        }
      } else if (provider === 'onedrive') {
        // Import Microsoft auth function dynamically
        const { generateMicrosoftAuthUrl, isMicrosoftOAuthConfigured } = await import('@/services/microsoft-oauth');
        
        // Check if Microsoft OAuth is configured
        if (!isMicrosoftOAuthConfigured()) {
          throw new Error('Microsoft OAuth is not configured. Please set up your Microsoft OAuth credentials in the environment variables.');
        }
        
        const authUrl = await generateMicrosoftAuthUrl();
        
        // Redirect to the authentication URL
        window.location.href = authUrl;
      }
      
      // Move to the next step
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Failed to initiate authentication:', error);
      setSetupError(`Failed to start ${provider} authentication: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const connectToCloudAccount = async () => {
    if (!selectedProvider) return;
    
    setIsConnecting(true);
    setSetupError(null);
    
    try {
      // Check if authentication tokens exist
      let isAuthenticated = false;
      let userEmail = '';
      
      if (selectedProvider === 'googledrive') {
        const googleTokens = localStorage.getItem('google_access_token');
        if (googleTokens) {
          isAuthenticated = true;
          userEmail = 'user@gmail.com'; // In real implementation, get from Google API
        }
      } else if (selectedProvider === 'onedrive') {
        const microsoftTokens = localStorage.getItem('microsoft_access_token');
        if (microsoftTokens) {
          isAuthenticated = true;
          userEmail = 'user@outlook.com'; // In real implementation, get from Microsoft API
        }
      }
      
      if (!isAuthenticated) {
        setSetupError(`Please authenticate with ${selectedProvider} first. Click the provider card above to sign in.`);
        setIsConnecting(false);
        return;
      }
      
      // Create cloud account object
      const cloudAccount: CloudAccount = {
        provider: selectedProvider,
        email: userEmail,
        hasExistingUsers: Math.random() > 0.5, // Simulate 50% chance of existing users
        userCount: Math.floor(Math.random() * 5) + 1,
        lastSync: Math.random() > 0.3 ? new Date().toISOString() : null
      };
      
      setCloudAccount(cloudAccount);
      setSetupProgress(75);
      
      // Check for conflicts if there are existing users
      if (cloudAccount.hasExistingUsers) {
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
      setSetupError(`Failed to connect to ${selectedProvider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        const getCloudDatabase = () => CloudDatabaseService.getInstance();
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
      securityComplianceService.logSecurityEvent('setup_completed', {
        storageMode: setupChoice,
        cloudProvider: selectedProvider,
        multiUserEnabled: setupChoice === 'cloud',
        timestamp: new Date().toISOString()
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

  const renderStepContent = () => {
    // Determine the actual content based on currentStep and setupChoice
    let stepSpecificContent = null;
    switch (currentStep) {
      case 0: // Choose Setup Type
        stepSpecificContent = (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-center">{steps[currentStep]}</h3>
            <p className="text-sm text-muted-foreground text-center">Select how you want to store and access your data.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {setupChoices.map((choice) => (
                <Card
                  key={choice.type}
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${setupChoice === choice.type ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => handleSetupChoice(choice.type)}
                >
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      {choice.icon}
                      <CardTitle>{choice.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{choice.description}</p>
                    <div>
                      <h4 className="font-semibold text-sm mb-1 text-green-500">Features:</h4>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        {choice.features.map((feature, i) => <li key={i}>{feature}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1 text-red-500">Limitations:</h4>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        {choice.limitations.map((limitation, i) => <li key={i}>{limitation}</li>)}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {setupError && currentStep === 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{setupError}</AlertDescription>
              </Alert>
            )}
          </div>
        );
        break;
      case 1: // Select Cloud Provider or Configure Local Storage
        if (setupChoice === 'cloud') {
          stepSpecificContent = (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-center">{steps[currentStep]}</h3>
              <p className="text-sm text-muted-foreground text-center">Choose your preferred cloud service for synchronization.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <Card 
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${
                    selectedProvider === 'googledrive' ? 'ring-2 ring-primary' : ''
                  } ${
                    localStorage.getItem('google_access_token') ? 'bg-green-50 border-green-200' : ''
                  }`}
                  onClick={() => handleProviderSelection('googledrive')}
                >
                  <CardHeader className="flex flex-row items-center space-x-3">
                    <Globe className="h-8 w-8 text-red-500" /> 
                    <CardTitle className="flex items-center space-x-2">
                      <span>Google Drive</span>
                      {localStorage.getItem('google_access_token') && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {localStorage.getItem('google_access_token') 
                        ? 'Connected! Click to re-authenticate or continue.' 
                        : 'Click to sign in with your Google Drive account.'}
                    </p>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${
                    selectedProvider === 'onedrive' ? 'ring-2 ring-primary' : ''
                  } ${
                    localStorage.getItem('microsoft_access_token') ? 'bg-green-50 border-green-200' : ''
                  }`}
                  onClick={() => handleProviderSelection('onedrive')}
                >
                  <CardHeader className="flex flex-row items-center space-x-3">
                    <Cloud className="h-8 w-8 text-blue-500" />
                    <CardTitle className="flex items-center space-x-2">
                      <span>Microsoft OneDrive</span>
                      {localStorage.getItem('microsoft_access_token') && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {localStorage.getItem('microsoft_access_token') 
                        ? 'Connected! Click to re-authenticate or continue.' 
                        : 'Click to sign in with your OneDrive account.'}
                    </p>
                  </CardContent>
                </Card>
              </div>
              {setupError && currentStep === 1 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{setupError}</AlertDescription>
                </Alert>
              )}
            </div>
          );
        } else { // Local Storage - this step is skipped, effectively part of step 0 or finalization
          stepSpecificContent = (
            <div className="text-center space-y-2">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-xl font-semibold">Local Storage Configured</h3>
                <p className="text-sm text-muted-foreground">Your data will be stored locally on this device.</p>
            </div>
          );
        }
        break;
      case 2: // Account Setup (Cloud) or Complete Setup (Local)
        if (setupChoice === 'cloud') {
          stepSpecificContent = (
            <div className="space-y-4 text-center">
              <h3 className="text-xl font-semibold">{steps[currentStep]}</h3>
              {cloudAccount ? (
                <div className="space-y-2">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <p>Connected to {cloudAccount.provider} as {cloudAccount.email}.</p>
                  {cloudAccount.hasExistingUsers && <p>{cloudAccount.userCount} existing users found.</p>}
                  {cloudAccount.lastSync && <p>Last sync: {new Date(cloudAccount.lastSync).toLocaleString()}</p>}
                </div>
              ) : (
                <Button onClick={connectToCloudAccount} disabled={isConnecting || !selectedProvider}>
                  {isConnecting ? 'Connecting...' : `Connect to ${selectedProvider}`}
                  {isConnecting && <Zap className="ml-2 h-4 w-4 animate-spin" />}
                </Button>
              )}
            </div>
          );
        } else { // Local - Finalize
           stepSpecificContent = (
            <div className="text-center space-y-2">
                <Settings className="h-12 w-12 text-primary mx-auto" />
                <h3 className="text-xl font-semibold">Ready to Complete Setup</h3>
                <p className="text-sm text-muted-foreground">Click 'Finish' to save your local storage configuration.</p>
            </div>
          );
        }
        break;
      case 3: // Resolve Conflicts (Cloud only)
        if (setupChoice === 'cloud' && conflicts.length > 0) {
          stepSpecificContent = (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-center">{steps[currentStep]}</h3>
              <p className="text-sm text-muted-foreground text-center">Resolve conflicts between local and cloud data.</p>
              {conflicts.map((conflict, index) => (
                <Card key={index} className="bg-amber-50/20 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center text-foreground">
                      <AlertTriangle className="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" /> Conflict: {conflict.description}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2 text-foreground">
                    <p><strong>Local:</strong> {JSON.stringify(conflict.localValue)}</p>
                    <p><strong>Cloud:</strong> {JSON.stringify(conflict.cloudValue)}</p>
                    <div className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`conflict-${index}`}
                            value="keep_local"
                            checked={conflict.resolution === 'keep_local'}
                            onChange={() => resolveConflict(index, 'keep_local')}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Keep Local Data</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`conflict-${index}`}
                            value="keep_cloud"
                            checked={conflict.resolution === 'keep_cloud'}
                            onChange={() => resolveConflict(index, 'keep_cloud')}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Keep Cloud Data</span>
                        </label>
                        {conflict.type === 'data' && (
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`conflict-${index}`}
                              value="merge"
                              checked={conflict.resolution === 'merge'}
                              onChange={() => resolveConflict(index, 'merge')}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Merge Both Versions</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        } else if (setupChoice === 'cloud') { // No conflicts, or step not applicable
            stepSpecificContent = (
                <div className="text-center space-y-2">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <h3 className="text-xl font-semibold">No Conflicts Found</h3>
                    <p className="text-sm text-muted-foreground">Proceeding to finalize setup.</p>
                </div>
            );
        }
        break;
      case 4: // Finalize Setup (Cloud) or effectively this is the state for local after step 2
         stepSpecificContent = (
          <div className="text-center space-y-2">
            {isProcessing ? (
              <>
                <Database className="h-12 w-12 text-primary mx-auto animate-pulse" />
                <h3 className="text-xl font-semibold">Finalizing Setup...</h3>
                <p className="text-sm text-muted-foreground">Please wait while we configure your system.</p>
              </>
            ) : (
              <>
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-xl font-semibold">Setup Almost Complete!</h3>
                <p className="text-sm text-muted-foreground">Click 'Finish' to complete the setup process.</p>
              </>
            )}
            {setupError && (
                <Alert variant="destructive" className="mt-4 text-left">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Setup Failed</AlertTitle>
                    <AlertDescription>{setupError}</AlertDescription>
                </Alert>
            )}
          </div>
        );
        break;
      default:
        stepSpecificContent = <div>Unknown step</div>;
    }

    return stepSpecificContent;
  };

  if (isComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Setup Complete!</CardTitle>
            <CardDescription>FinCRuM is now configured and ready to use.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => onSetupComplete({ setupChoice, cloudAccount })}> 
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <Card className="w-full max-w-2xl shadow-2xl bg-transparent">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-bold">Welcome to FinCRuM</CardTitle>
            </div>
            <Badge variant="outline">First Time Setup</Badge>
          </div>
          <CardDescription className="pt-1">Configure your data storage and preferences.</CardDescription>
          <Progress value={setupProgress} className="mt-2 h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            {steps.map((step, index) => (
              <span key={step} className={`${index === currentStep ? 'font-semibold text-primary' : ''} ${index < currentStep ? 'text-green-600' : ''}`}>
                {step}
              </span>
            ))}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6 pb-6 min-h-[300px]">
          {renderStepContent()}
        </CardContent>
        <Separator />
        <div className="flex justify-between p-4">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(prev => Math.max(0, prev - (setupChoice === 'cloud' && prev === 3 && cloudAccount && !cloudAccount.hasExistingUsers ? 2 : 1)))}
            disabled={currentStep === 0 || isProcessing}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button 
            variant="outline"
            onClick={handleNext} 
            disabled={isNextDisabled()}
          >
            {currentStep === steps.length - 1 ? 'Finish' : 'Next'} 
            {currentStep === steps.length - 1 ? <CheckCircle className="ml-2 h-4 w-4" /> : <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
        {setupError && currentStep > 1 && (
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Setup Error</AlertTitle>
            <AlertDescription>{setupError}</AlertDescription>
          </Alert>
        )}
      </Card>
    </div>
  );
};

export default FirstTimeSetupWizard;