'use client';

import React, { useState, useEffect } from 'react';
import { syncBufferService, BufferedOperation, ConflictResolution } from '@/services/sync-buffer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Trash2,
  RotateCcw
} from 'lucide-react';

interface SyncBufferStatus {
  totalOperations: number;
  pendingOperations: number;
  processingOperations: number;
  completedOperations: number;
  failedOperations: number;
  conflictOperations: number;
  isProcessing: boolean;
  networkStatus: {
    isOnline: boolean;
    lastOnlineTime: string;
    connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  };
}

const SyncBufferManager: React.FC = () => {
  const [status, setStatus] = useState<SyncBufferStatus | null>(null);
  const [conflicts, setConflicts] = useState<BufferedOperation[]>([]);
  const [failedOps, setFailedOps] = useState<BufferedOperation[]>([]);
  const [pendingOps, setPendingOps] = useState<BufferedOperation[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<BufferedOperation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const bufferStatus = syncBufferService.getBufferStatus();
      const conflictsList = syncBufferService.getConflicts();
      const failedList = syncBufferService.getFailedOperations();
      const pendingList = syncBufferService.getPendingOperations();

      setStatus(bufferStatus);
      setConflicts(conflictsList);
      setFailedOps(failedList);
      setPendingOps(pendingList);
    } catch (error) {
      console.error('Failed to load sync buffer data:', error);
    }
  };

  const handleRetryFailed = async () => {
    setIsLoading(true);
    try {
      await syncBufferService.retryFailedOperations();
      await loadData();
    } catch (error) {
      console.error('Failed to retry operations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCompleted = async () => {
    setIsLoading(true);
    try {
      await syncBufferService.clearCompletedOperations();
      await loadData();
    } catch (error) {
      console.error('Failed to clear completed operations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveConflict = async (resolution: ConflictResolution) => {
    setIsLoading(true);
    try {
      await syncBufferService.resolveConflict(resolution);
      setSelectedConflict(null);
      await loadData();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (operationStatus: string) => {
    switch (operationStatus) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'conflict': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionIcon = () => {
    if (!status?.networkStatus.isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    
    switch (status.networkStatus.connectionQuality) {
      case 'excellent':
      case 'good':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'poor':
        return <Wifi className="h-4 w-4 text-yellow-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getProgressPercentage = () => {
    if (!status || status.totalOperations === 0) return 0;
    return Math.round((status.completedOperations / status.totalOperations) * 100);
  };

  if (!status) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading sync status...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getConnectionIcon()}
            Sync Buffer Status
            {status.isProcessing && <RefreshCw className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            Network: {status.networkStatus.isOnline ? 'Online' : 'Offline'} 
            ({status.networkStatus.connectionQuality})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{status.totalOperations}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{status.pendingOperations}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{status.completedOperations}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{status.failedOperations}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{status.conflictOperations}</div>
              <div className="text-sm text-gray-500">Conflicts</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sync Progress</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="w-full" />
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={handleRetryFailed} 
              disabled={isLoading || status.failedOperations === 0}
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Failed
            </Button>
            <Button 
              onClick={handleClearCompleted} 
              disabled={isLoading || status.completedOperations === 0}
              variant="outline"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Completed
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Operations */}
      <Tabs defaultValue="conflicts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="conflicts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Conflicts ({conflicts.length})
          </TabsTrigger>
          <TabsTrigger value="failed" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Failed ({failedOps.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingOps.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conflicts" className="space-y-4">
          {conflicts.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>No conflicts to resolve.</AlertDescription>
            </Alert>
          ) : (
            conflicts.map((conflict) => (
              <Card key={conflict.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {conflict.itemType} - {conflict.type}
                    </span>
                    <Badge variant="destructive">Conflict</Badge>
                  </CardTitle>
                  <CardDescription>
                    {formatTimestamp(conflict.timestamp)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Local Changes</h4>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(conflict.data, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Remote Changes</h4>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(conflict.conflictData, null, 2)}
                        </pre>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleResolveConflict({
                          operationId: conflict.id,
                          resolution: 'local'
                        })}
                        size="sm"
                        disabled={isLoading}
                      >
                        Keep Local
                      </Button>
                      <Button 
                        onClick={() => handleResolveConflict({
                          operationId: conflict.id,
                          resolution: 'remote'
                        })}
                        size="sm"
                        variant="outline"
                        disabled={isLoading}
                      >
                        Keep Remote
                      </Button>
                      <Button 
                        onClick={() => handleResolveConflict({
                          operationId: conflict.id,
                          resolution: 'skip'
                        })}
                        size="sm"
                        variant="destructive"
                        disabled={isLoading}
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          {failedOps.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>No failed operations.</AlertDescription>
            </Alert>
          ) : (
            failedOps.map((op) => (
              <Card key={op.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {op.itemType} - {op.type}
                    </span>
                    <Badge variant="destructive">Failed</Badge>
                  </CardTitle>
                  <CardDescription>
                    Retries: {op.retryCount}/{op.maxRetries} | {formatTimestamp(op.timestamp)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {op.lastError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{op.lastError}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingOps.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>No pending operations.</AlertDescription>
            </Alert>
          ) : (
            pendingOps.map((op) => (
              <Card key={op.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {op.itemType} - {op.type}
                    </span>
                    <Badge 
                      className={`${getStatusColor(op.status)} text-white`}
                    >
                      {op.priority} priority
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {formatTimestamp(op.timestamp)}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SyncBufferManager;