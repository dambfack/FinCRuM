import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Clock, User, FileText, Search, Download, Filter } from 'lucide-react';
import { useCloudDatabase } from '@/hooks/use-cloud-database';
import { ConflictResolutionEntry, DataItemType } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

interface ConflictResolutionLogProps {
  className?: string;
}

export function ConflictResolutionLog({ className }: ConflictResolutionLogProps) {
  const { actions } = useCloudDatabase();
  const [logs, setLogs] = useState<ConflictResolutionEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ConflictResolutionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDataType, setFilterDataType] = useState<string>('all');
  const [filterResolution, setFilterResolution] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const logData = await actions.getConflictResolutionLogs();
      setLogs(logData);
      setFilteredLogs(logData);
    } catch (error) {
      console.error('Failed to load conflict resolution logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    let filtered = [...logs];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.itemId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.conflictReason.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply data type filter
    if (filterDataType !== 'all') {
      filtered = filtered.filter(log => log.dataType === filterDataType);
    }

    // Apply resolution filter
    if (filterResolution !== 'all') {
      filtered = filtered.filter(log => log.resolution === filterResolution);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredLogs(filtered);
  }, [logs, searchTerm, filterDataType, filterResolution, sortOrder]);

  const exportLogs = () => {
    const csvContent = [
      'Timestamp,User ID,Data Type,Item ID,Conflict Reason,Resolution,Local Value,Cloud Value',
      ...filteredLogs.map(log => 
        `"${log.timestamp}","${log.userId}","${log.dataType}","${log.itemId}","${log.conflictReason}","${log.resolution}","${JSON.stringify(log.localValue).replace(/"/g, '""')}","${JSON.stringify(log.cloudValue).replace(/"/g, '""')}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conflict-resolution-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getResolutionBadgeVariant = (resolution: string) => {
    switch (resolution) {
      case 'user_precedence':
        return 'default';
      case 'cloud_precedence':
        return 'secondary';
      case 'merge':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case DataItemType.Contacts:
        return '👤';
      case DataItemType.Tasks:
        return '✓';
      case DataItemType.Transactions:
        return '💰';
      case DataItemType.Categories:
        return '📁';
      default:
        return '📄';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <CardTitle>Conflict Resolution Log</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={isLoading}
            >
              <Clock className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterDataType} onValueChange={setFilterDataType}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by data type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Data Types</SelectItem>
              <SelectItem value={DataItemType.Contacts}>Contacts</SelectItem>
              <SelectItem value={DataItemType.Tasks}>Tasks</SelectItem>
              <SelectItem value={DataItemType.Transactions}>Transactions</SelectItem>
              <SelectItem value={DataItemType.Categories}>Categories</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterResolution} onValueChange={setFilterResolution}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by resolution" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resolutions</SelectItem>
              <SelectItem value="user_precedence">User Precedence</SelectItem>
              <SelectItem value="cloud_precedence">Cloud Precedence</SelectItem>
              <SelectItem value="merge">Merge</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest First</SelectItem>
              <SelectItem value="asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No conflict resolution logs found</p>
            {logs.length > 0 && (
              <p className="text-sm mt-2">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {filteredLogs.map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getDataTypeIcon(log.dataType)}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{log.dataType}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.itemId.substring(0, 8)}...
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <User className="h-3 w-3" />
                          <span>{log.userId}</span>
                          <Clock className="h-3 w-3 ml-2" />
                          <span>{formatDateTime(log.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={getResolutionBadgeVariant(log.resolution)}>
                      {log.resolution.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Conflict Reason:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{log.conflictReason}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-2">Local Value:</p>
                      <pre className="text-xs bg-blue-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.localValue, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-2">Cloud Value:</p>
                      <pre className="text-xs bg-green-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.cloudValue, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {filteredLogs.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredLogs.length} of {logs.length} log entries
            {logs.length > 0 && (
              <span className="block mt-1">
                Logs are automatically deleted after 90 days
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}