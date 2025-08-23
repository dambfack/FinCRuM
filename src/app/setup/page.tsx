'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowRight, ArrowLeft, Users, Cloud, Database, Settings, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleAuthManager } from '@/components/GoogleAuthManager';
import { MicrosoftAuthManager } from '@/components/MicrosoftAuthManager';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { saveData, getData } from '@/lib/utils';
import { DataItemType } from '@/lib/types';
// import type { UserRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface UserSetupData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  organizationName: string;
  organizationSize: string;
  industry: string;
  description: string;
  enableNotifications: boolean;
  autoSync: boolean;
}

const SetupPage: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState<UserSetupData>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'admin',
    organizationName: '',
    organizationSize: '1-10',
    industry: '',
    description: '',
    enableNotifications: true,
    autoSync: true
  });
  
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: 'welcome',
      title: 'Welcome to FinCRuM',
      description: 'Let\'s get you started with your CRM setup',
      icon: <Users className="h-6 w-6" />,
      completed: false
    },
    {
      id: 'profile',
      title: 'User Profile',
      description: 'Set up your profile and role',
      icon: <Shield className="h-6 w-6" />,
      completed: false
    },
    {
      id: 'organization',
      title: 'Organization Details',
      description: 'Tell us about your business',
      icon: <Settings className="h-6 w-6" />,
      completed: false
    },
    {
      id: 'cloud',
      title: 'Cloud Services',
      description: 'Connect your cloud storage and calendar',
      icon: <Cloud className="h-6 w-6" />,
      completed: false
    },
    {
      id: 'preferences',
      title: 'Preferences',
      description: 'Configure your app preferences',
      icon: <Database className="h-6 w-6" />,
      completed: false
    }
  ]);

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      // Mark current step as completed
      const updatedSteps = [...steps];
      updatedSteps[currentStep].completed = true;
      setSteps(updatedSteps);
      setCurrentStep(currentStep + 1);
    } else {
      handleFinishSetup();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinishSetup = () => {
    // Save setup data
    saveData(DataItemType.SetupCompleted, true);
    saveData(DataItemType.UserProfile, setupData);
    
    // Mark all steps as completed
    const completedSteps = steps.map(step => ({ ...step, completed: true }));
    setSteps(completedSteps);
    
    toast({
      title: "Setup Complete!",
      description: "Welcome to FinCRuM. You're ready to start managing your customers.",
    });
    
    // Redirect to dashboard
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: // Welcome
        return true;
      case 1: // Profile
        return setupData.firstName && setupData.lastName && setupData.email;
      case 2: // Organization
        return setupData.organizationName && setupData.industry;
      case 3: // Cloud
        return true; // Optional step
      case 4: // Preferences
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Users className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome to FinCRuM
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Your comprehensive Financial Customer Relationship Management solution. 
                Let's set up your account and get you started with managing customers, 
                appointments, and tasks with seamless cloud synchronization.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">Customer Management</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Organize and track all your customers</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <Cloud className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold">Cloud Sync</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Sync across all your devices</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <Shield className="h-8 w-8 text-purple-600" />
                  <div>
                    <h3 className="font-semibold">Role-Based Access</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Team collaboration with permissions</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Set Up Your Profile
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Tell us about yourself and your role in the organization
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={setupData.firstName}
                  onChange={(e) => setSetupData({ ...setupData, firstName: e.target.value })}
                  placeholder="Enter your first name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={setupData.lastName}
                  onChange={(e) => setSetupData({ ...setupData, lastName: e.target.value })}
                  placeholder="Enter your last name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={setupData.email}
                  onChange={(e) => setSetupData({ ...setupData, email: e.target.value })}
                  placeholder="Enter your email address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Your Role</Label>
                <Select value={setupData.role} onValueChange={(value: string) => setSetupData({ ...setupData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center space-x-2">
                        <Badge variant="default">Admin</Badge>
                        <span>Full access to all features</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="partner">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">Partner</Badge>
                        <span>Access to customers, appointments, tasks</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="employee">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">Employee</Badge>
                        <span>Limited access to assigned data</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Organization Details
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Help us understand your business better
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name *</Label>
                <Input
                  id="organizationName"
                  value={setupData.organizationName}
                  onChange={(e) => setSetupData({ ...setupData, organizationName: e.target.value })}
                  placeholder="Enter your organization name"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="organizationSize">Organization Size</Label>
                  <Select value={setupData.organizationSize} onValueChange={(value) => setSetupData({ ...setupData, organizationSize: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-1000">201-1000 employees</SelectItem>
                      <SelectItem value="1000+">1000+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry *</Label>
                  <Input
                    id="industry"
                    value={setupData.industry}
                    onChange={(e) => setSetupData({ ...setupData, industry: e.target.value })}
                    placeholder="e.g., Technology, Healthcare, Finance"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Business Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={setupData.description}
                  onChange={(e) => setSetupData({ ...setupData, description: e.target.value })}
                  placeholder="Brief description of your business..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Connect Cloud Services
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Connect your Google Drive and OneDrive for seamless data synchronization
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Cloud className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>Google Services</span>
                  </CardTitle>
                  <CardDescription>
                    Connect Google Drive for data storage and Google Calendar for appointments
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <GoogleAuthManager />
                </CardContent>
              </Card>
              
              <Card className="p-6">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                      <Cloud className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span>Microsoft Services</span>
                  </CardTitle>
                  <CardDescription>
                    Connect OneDrive for data storage and Outlook Calendar for appointments
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <MicrosoftAuthManager />
                </CardContent>
              </Card>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Cloud services are optional but recommended for multi-device access and data backup. 
                You can always connect them later from the Data Sync Settings page.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Configure Preferences
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Set up your app preferences and notification settings
              </p>
            </div>
            
            <div className="space-y-6">
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Enable Notifications</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Receive notifications for appointments, tasks, and important updates
                      </p>
                    </div>
                    <Switch
                      checked={setupData.enableNotifications}
                      onCheckedChange={(checked) => setSetupData({ ...setupData, enableNotifications: checked })}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Automatic Sync</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Automatically sync data with connected cloud services
                      </p>
                    </div>
                    <Switch
                      checked={setupData.autoSync}
                      onCheckedChange={(checked) => setSetupData({ ...setupData, autoSync: checked })}
                    />
                  </div>
                </div>
              </Card>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>Almost done!</strong> Click "Complete Setup" to finish and start using FinCRuM.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Setup FinCRuM
            </h1>
            <Badge variant="outline">
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center space-y-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step.completed 
                    ? 'bg-green-500 text-white' 
                    : index === currentStep 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="text-center">
                  <p className={`text-xs font-medium ${
                    step.completed || index === currentStep 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-8">
          {renderStepContent()}
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!isStepValid()}
            className="flex items-center space-x-2"
          >
            <span>{currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;