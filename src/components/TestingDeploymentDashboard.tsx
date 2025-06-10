import React, { useState, useEffect } from 'react';
import { testingService } from '@/services/testing-service';
import { getDeploymentConfigService } from '@/services/deployment-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  Square,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  Upload,
  Settings,
  Monitor,
  FileText,
  Zap,
  Shield,
  Database,
  Globe,
  RefreshCw
} from 'lucide-react';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  message?: string;
  error?: string;
  details?: any;
}

interface TestSuiteResult {
  suiteName: string;
  suiteId: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  tests: TestResult[];
}

interface BuildStatus {
  status: 'idle' | 'building' | 'completed' | 'failed';
  logs: string[];
}

interface DeploymentStatus {
  status: 'idle' | 'deploying' | 'completed' | 'failed';
  logs: string[];
}

type EnvironmentType = 'development' | 'staging' | 'production';

export const TestingDeploymentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('testing');
  const [testResults, setTestResults] = useState<TestSuiteResult[]>([]);
  const [isTestingRunning, setIsTestingRunning] = useState(false);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>({ status: 'idle', logs: [] });
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>({ status: 'idle', logs: [] });
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentType>('development');
  const [deploymentConfig, setDeploymentConfig] = useState<any>(null);
  const [preDeploymentChecks, setPreDeploymentChecks] = useState<any>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = () => {
    const config = getDeploymentConfigService().getConfiguration();
    setDeploymentConfig(config);
    
    const buildStat = getDeploymentConfigService().getBuildStatus();
    setBuildStatus(buildStat);
    
    const deployStat = getDeploymentConfigService().getDeploymentStatus();
    setDeploymentStatus(deployStat);
  };

  const runAllTests = async () => {
    setIsTestingRunning(true);
    try {
      const results = await testingService.runAllTests();
      if (results.success) {
        setTestResults(results.results);
      }
    } catch (error) {
      console.error('Failed to run tests:', error);
    } finally {
      setIsTestingRunning(false);
    }
  };

  const runTestSuite = async (suiteId: string) => {
    setIsTestingRunning(true);
    try {
      const result = await testingService.runTestSuite(suiteId);
      setTestResults(prev => {
        const updated = prev.filter(r => r.suiteId !== suiteId);
        return [...updated, result];
      });
    } catch (error) {
      console.error(`Failed to run test suite ${suiteId}:`, error);
    } finally {
      setIsTestingRunning(false);
    }
  };

  const buildApplication = async () => {
    try {
      const result = await getDeploymentConfigService().buildApplication(selectedEnvironment);
      setBuildStatus(getDeploymentConfigService().getBuildStatus());
      
      if (result.success) {
        alert(`Build completed successfully in ${result.buildTime}ms`);
      } else {
        alert(`Build failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Build failed:', error);
    }
  };

  const deployApplication = async () => {
    try {
      const result = await getDeploymentConfigService().deployApplication(selectedEnvironment);
      setDeploymentStatus(getDeploymentConfigService().getDeploymentStatus());
      
      if (result.success) {
        alert(`Deployment to ${selectedEnvironment} completed successfully`);
      } else {
        alert(`Deployment failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Deployment failed:', error);
    }
  };

  const runPreDeploymentChecks = async () => {
    try {
      const checks = await getDeploymentConfigService().runPreDeploymentChecks(selectedEnvironment);
      setPreDeploymentChecks(checks);
    } catch (error) {
      console.error('Pre-deployment checks failed:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'building':
      case 'deploying':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (passed: boolean) => {
    return (
      <Badge variant={passed ? 'default' : 'destructive'}>
        {passed ? 'PASS' : 'FAIL'}
      </Badge>
    );
  };

  const calculateTestProgress = () => {
    if (testResults.length === 0) return 0;
    const totalTests = testResults.reduce((sum, suite) => sum + suite.totalTests, 0);
    const passedTests = testResults.reduce((sum, suite) => sum + suite.passedTests, 0);
    return totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Testing & Deployment Dashboard</h1>
          <p className="text-muted-foreground">
            Manage application testing, builds, and deployments
          </p>
        </div>
        <Button onClick={loadInitialData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="build">Build</TabsTrigger>
          <TabsTrigger value="deployment">Deployment</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Test Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Progress</span>
                    <span>{Math.round(calculateTestProgress())}%</span>
                  </div>
                  <Progress value={calculateTestProgress()} />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Total Suites</div>
                      <div className="text-2xl font-bold">{testResults.length}</div>
                    </div>
                    <div>
                      <div className="font-medium">Total Tests</div>
                      <div className="text-2xl font-bold">
                        {testResults.reduce((sum, suite) => sum + suite.totalTests, 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={runAllTests} 
                  disabled={isTestingRunning}
                  className="w-full"
                >
                  {isTestingRunning ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run All Tests
                </Button>
                
                <Button 
                  onClick={() => runTestSuite('unit')} 
                  disabled={isTestingRunning}
                  variant="outline"
                  className="w-full"
                >
                  Run Unit Tests
                </Button>
                
                <Button 
                  onClick={() => runTestSuite('integration')} 
                  disabled={isTestingRunning}
                  variant="outline"
                  className="w-full"
                >
                  Run Integration Tests
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Passed
                    </span>
                    <span className="font-bold">
                      {testResults.reduce((sum, suite) => sum + suite.passedTests, 0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Failed
                    </span>
                    <span className="font-bold">
                      {testResults.reduce((sum, suite) => sum + suite.failedTests, 0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      Duration
                    </span>
                    <span className="font-bold">
                      {testResults.reduce((sum, suite) => sum + suite.duration, 0)}ms
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            {testResults.map((suite) => (
              <Card key={suite.suiteId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(suite.passedTests === suite.totalTests ? 'passed' : 'failed')}
                      {suite.suiteName}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(suite.passedTests === suite.totalTests)}
                      <span className="text-sm text-muted-foreground">
                        {suite.passedTests}/{suite.totalTests} tests
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {suite.tests.map((test, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(test.passed ? 'passed' : 'failed')}
                          <span>{test.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(test.passed)}
                          <span className="text-sm text-muted-foreground">
                            {test.duration}ms
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Build Tab */}
        <TabsContent value="build" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Build Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Environment</label>
                  <select 
                    value={selectedEnvironment} 
                    onChange={(e) => setSelectedEnvironment(e.target.value as EnvironmentType)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
                
                <Button 
                  onClick={buildApplication}
                  disabled={buildStatus.status === 'building'}
                  className="w-full"
                >
                  {buildStatus.status === 'building' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Build Application
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(buildStatus.status)}
                  Build Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <Badge variant={buildStatus.status === 'completed' ? 'default' : 
                                  buildStatus.status === 'failed' ? 'destructive' : 'secondary'}>
                      {buildStatus.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  {buildStatus.status === 'building' && (
                    <Progress value={50} className="w-full" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Build Logs */}
          {buildStatus.logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Build Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full border rounded p-4">
                  <div className="space-y-1">
                    {buildStatus.logs.map((log, index) => (
                      <div key={index} className="text-sm font-mono">
                        {log}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Deployment Tab */}
        <TabsContent value="deployment" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Environment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Environment</label>
                  <select 
                    value={selectedEnvironment} 
                    onChange={(e) => setSelectedEnvironment(e.target.value as EnvironmentType)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
                
                {deploymentConfig && (
                  <div className="text-sm space-y-1">
                    <div><strong>URL:</strong> {deploymentConfig.environments[selectedEnvironment]?.url}</div>
                    <div><strong>API:</strong> {deploymentConfig.environments[selectedEnvironment]?.apiUrl}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pre-Deployment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={runPreDeploymentChecks}
                  variant="outline"
                  className="w-full"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Run Checks
                </Button>
                
                {preDeploymentChecks && (
                  <div className="space-y-2">
                    {preDeploymentChecks.results.map((check: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{check.name}</span>
                        {getStatusIcon(check.passed ? 'passed' : 'failed')}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(deploymentStatus.status)}
                  Deployment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={deployApplication}
                  disabled={deploymentStatus.status === 'deploying' || buildStatus.status !== 'completed'}
                  className="w-full"
                >
                  {deploymentStatus.status === 'deploying' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Deploy
                </Button>
                
                <div className="text-xs text-muted-foreground">
                  {buildStatus.status !== 'completed' && 'Build required before deployment'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deployment Logs */}
          {deploymentStatus.logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Deployment Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full border rounded p-4">
                  <div className="space-y-1">
                    {deploymentStatus.logs.map((log, index) => (
                      <div key={index} className="text-sm font-mono">
                        {log}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Database
                    </span>
                    <Badge variant="default">Healthy</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Security
                    </span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      API
                    </span>
                    <Badge variant="default">Online</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Response Time</span>
                      <span>120ms</span>
                    </div>
                    <Progress value={75} className="mt-1" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Memory Usage</span>
                      <span>45%</span>
                    </div>
                    <Progress value={45} className="mt-1" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>CPU Usage</span>
                      <span>32%</span>
                    </div>
                    <Progress value={32} className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 border rounded">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Deployment Successful</div>
                    <div className="text-xs text-muted-foreground">Production environment updated</div>
                  </div>
                  <div className="text-xs text-muted-foreground">2 hours ago</div>
                </div>
                
                <div className="flex items-center gap-3 p-2 border rounded">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Tests Passed</div>
                    <div className="text-xs text-muted-foreground">All integration tests completed</div>
                  </div>
                  <div className="text-xs text-muted-foreground">3 hours ago</div>
                </div>
                
                <div className="flex items-center gap-3 p-2 border rounded">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Performance Alert</div>
                    <div className="text-xs text-muted-foreground">Response time increased</div>
                  </div>
                  <div className="text-xs text-muted-foreground">5 hours ago</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TestingDeploymentDashboard;