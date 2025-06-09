import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, User, Cloud, Merge, Clock } from 'lucide-react';
import { DataConflictWithResolution, ConflictResolution } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: DataConflictWithResolution[];
  onResolve: (resolutions: Map<string, ConflictResolution>) => Promise<void>;
  isResolving?: boolean;
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  conflicts,
  onResolve,
  isResolving = false
}: ConflictResolutionDialogProps) {
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());
  const [selectedConflictIndex, setSelectedConflictIndex] = useState(0);

  const handleResolutionChange = (conflictId: string, resolution: ConflictResolution) => {
    const newResolutions = new Map(resolutions);
    newResolutions.set(conflictId, resolution);
    setResolutions(newResolutions);
  };

  const handleResolveAll = async () => {
    // Auto-resolve any unresolved conflicts with user precedence
    const finalResolutions = new Map(resolutions);
    conflicts.forEach(conflict => {
      if (!finalResolutions.has(conflict.id)) {
        finalResolutions.set(conflict.id, 'user_precedence');
      }
    });

    await onResolve(finalResolutions);
    setResolutions(new Map());
    setSelectedConflictIndex(0);
  };

  const handleCancel = () => {
    setResolutions(new Map());
    setSelectedConflictIndex(0);
    onOpenChange(false);
  };

  const getResolutionIcon = (resolution: ConflictResolution) => {
    switch (resolution) {
      case 'user_precedence':
        return <User className="h-4 w-4" />;
      case 'cloud_precedence':
        return <Cloud className="h-4 w-4" />;
      case 'merge':
        return <Merge className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getResolutionDescription = (resolution: ConflictResolution) => {
    switch (resolution) {
      case 'user_precedence':
        return 'Keep your local changes and overwrite cloud data';
      case 'cloud_precedence':
        return 'Accept cloud changes and overwrite your local data';
      case 'merge':
        return 'Attempt to merge both versions (when possible)';
      default:
        return '';
    }
  };

  const currentConflict = conflicts[selectedConflictIndex];
  const allResolved = conflicts.every(conflict => resolutions.has(conflict.id));

  if (!currentConflict) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Resolve Data Conflicts</span>
            <Badge variant="outline">
              {selectedConflictIndex + 1} of {conflicts.length}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Data conflicts were detected during synchronization. Please choose how to resolve each conflict.
            Your choice will be logged for future reference.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
            {/* Conflict List */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Conflicts</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-64 lg:h-80">
                    <div className="space-y-1 p-3">
                      {conflicts.map((conflict, index) => (
                        <div
                          key={conflict.id}
                          className={`p-2 rounded cursor-pointer transition-colors ${
                            index === selectedConflictIndex
                              ? 'bg-blue-100 border border-blue-300'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedConflictIndex(index)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium truncate">
                              {conflict.dataType}
                            </div>
                            {resolutions.has(conflict.id) && (
                              <div className="text-green-500">
                                ✓
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {conflict.itemId.substring(0, 12)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Conflict Details */}
            <div className="lg:col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {currentConflict.dataType} Conflict
                  </CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Item ID: {currentConflict.itemId}</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>Detected: {formatDateTime(new Date().toISOString())}</span>
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Conflict Reason:</h4>
                    <p className="text-sm bg-orange-50 p-3 rounded border border-orange-200">
                      {currentConflict.reason}
                    </p>
                  </div>

                  <Separator />

                  {/* Resolution Options */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Choose Resolution:</h4>
                    <RadioGroup
                      value={resolutions.get(currentConflict.id) || ''}
                      onValueChange={(value) => 
                        handleResolutionChange(currentConflict.id, value as ConflictResolution)
                      }
                    >
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 p-3 border rounded hover:bg-blue-50">
                          <RadioGroupItem value="user_precedence" id="user_precedence" />
                          <Label htmlFor="user_precedence" className="flex-1 cursor-pointer">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">Keep My Changes (Recommended)</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {getResolutionDescription('user_precedence')}
                            </p>
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2 p-3 border rounded hover:bg-green-50">
                          <RadioGroupItem value="cloud_precedence" id="cloud_precedence" />
                          <Label htmlFor="cloud_precedence" className="flex-1 cursor-pointer">
                            <div className="flex items-center space-x-2">
                              <Cloud className="h-4 w-4 text-green-600" />
                              <span className="font-medium">Accept Cloud Changes</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {getResolutionDescription('cloud_precedence')}
                            </p>
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2 p-3 border rounded hover:bg-purple-50">
                          <RadioGroupItem value="merge" id="merge" />
                          <Label htmlFor="merge" className="flex-1 cursor-pointer">
                            <div className="flex items-center space-x-2">
                              <Merge className="h-4 w-4 text-purple-600" />
                              <span className="font-medium">Merge Both Versions</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {getResolutionDescription('merge')}
                            </p>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* Data Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-blue-700 mb-2 flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>Your Local Data</span>
                      </h4>
                      <ScrollArea className="h-32">
                        <pre className="text-xs bg-blue-50 p-3 rounded border border-blue-200 overflow-x-auto">
                          {JSON.stringify(currentConflict.localValue, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                    <div>
                      <h4 className="font-medium text-green-700 mb-2 flex items-center space-x-2">
                        <Cloud className="h-4 w-4" />
                        <span>Cloud Data</span>
                      </h4>
                      <ScrollArea className="h-32">
                        <pre className="text-xs bg-green-50 p-3 rounded border border-green-200 overflow-x-auto">
                          {JSON.stringify(currentConflict.cloudValue, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setSelectedConflictIndex(Math.max(0, selectedConflictIndex - 1))}
              disabled={selectedConflictIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedConflictIndex(Math.min(conflicts.length - 1, selectedConflictIndex + 1))}
              disabled={selectedConflictIndex === conflicts.length - 1}
            >
              Next
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleCancel} disabled={isResolving}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolveAll} 
              disabled={isResolving}
              className="min-w-[120px]"
            >
              {isResolving ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Resolving...</span>
                </div>
              ) : (
                `Resolve All (${resolutions.size}/${conflicts.length})`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}