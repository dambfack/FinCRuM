'use client';

import { useState, useCallback, useMemo } from 'react';
import type { DataConflict } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface ConflictResolutionState {
  conflicts: DataConflict[];
  isResolving: boolean;
  resolvedCount: number;
  pendingCount: number;
}

interface ConflictResolutionActions {
  addConflict: (conflict: DataConflict) => void;
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merge', mergedData?: any) => Promise<boolean>;
  resolveAllConflicts: (resolution: 'local' | 'remote') => Promise<boolean>;
  dismissConflict: (conflictId: string) => void;
  clearResolvedConflicts: () => void;
  getConflictById: (conflictId: string) => DataConflict | undefined;
}

type ConflictResolutionStrategy = 'manual' | 'prefer_local' | 'prefer_remote' | 'prefer_newer';

interface ConflictResolutionOptions {
  strategy?: ConflictResolutionStrategy;
  autoResolve?: boolean;
  maxConflicts?: number;
}

export function useConflictResolution(options: ConflictResolutionOptions = {}): ConflictResolutionState & ConflictResolutionActions {
  const {
    strategy = 'manual',
    autoResolve = false,
    maxConflicts = 100
  } = options;

  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const { toast } = useToast();

  // Computed values
  const resolvedCount = useMemo(() => 
    conflicts.filter(c => c.status === 'resolved').length,
    [conflicts]
  );

  const pendingCount = useMemo(() => 
    conflicts.filter(c => c.status === 'pending').length,
    [conflicts]
  );

  // Auto-resolve conflict based on strategy
  const autoResolveConflict = useCallback((conflict: DataConflict): { resolution: 'local' | 'remote' | 'merge'; mergedData?: any } | null => {
    switch (strategy) {
      case 'prefer_local':
        return { resolution: 'local' };
      
      case 'prefer_remote':
        return { resolution: 'remote' };
      
      case 'prefer_newer':
        const localTime = new Date(conflict.localData?.lastModified || 0).getTime();
        const remoteTime = new Date(conflict.remoteData?.lastModified || 0).getTime();
        return { resolution: localTime > remoteTime ? 'local' : 'remote' };
      
      case 'manual':
      default:
        return null;
    }
  }, [strategy]);

  // Add a new conflict
  const addConflict = useCallback((conflict: DataConflict) => {
    setConflicts(prev => {
      // Check if conflict already exists
      const existingIndex = prev.findIndex(c => c.id === conflict.id);
      if (existingIndex !== -1) {
        // Update existing conflict
        const updated = [...prev];
        updated[existingIndex] = { ...conflict, timestamp: new Date().toISOString() };
        return updated;
      }

      // Add new conflict
      const newConflicts = [...prev, { ...conflict, timestamp: new Date().toISOString() }];
      
      // Limit number of conflicts
      if (newConflicts.length > maxConflicts) {
        newConflicts.splice(0, newConflicts.length - maxConflicts);
      }

      return newConflicts;
    });

    // Auto-resolve if enabled
    if (autoResolve) {
      const resolution = autoResolveConflict(conflict);
      if (resolution) {
        setTimeout(() => {
          resolveConflict(conflict.id, resolution.resolution, resolution.mergedData);
        }, 100);
      }
    } else {
      toast({
        title: 'Data Conflict Detected',
        description: `Conflict in ${conflict.itemType}: ${conflict.itemId}`,
        variant: 'destructive'
      });
    }
  }, [maxConflicts, autoResolve, autoResolveConflict, toast]);

  // Resolve a specific conflict
  const resolveConflict = useCallback(async (conflictId: string, resolution: 'local' | 'remote' | 'merge', mergedData?: any): Promise<boolean> => {
    setIsResolving(true);
    
    try {
      setConflicts(prev => prev.map(conflict => {
        if (conflict.id === conflictId) {
          return {
            ...conflict,
            status: 'resolved' as const,
            resolution,
            mergedData,
            resolvedAt: new Date().toISOString()
          };
        }
        return conflict;
      }));

      toast({
        title: 'Conflict Resolved',
        description: `Conflict resolved using ${resolution} data.`,
      });

      return true;
    } catch (error) {
      toast({
        title: 'Resolution Failed',
        description: 'Failed to resolve conflict.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsResolving(false);
    }
  }, [toast]);

  // Resolve all pending conflicts with the same strategy
  const resolveAllConflicts = useCallback(async (resolution: 'local' | 'remote'): Promise<boolean> => {
    const pendingConflicts = conflicts.filter(c => c.status === 'pending');
    if (pendingConflicts.length === 0) return true;

    setIsResolving(true);
    
    try {
      setConflicts(prev => prev.map(conflict => {
        if (conflict.status === 'pending') {
          return {
            ...conflict,
            status: 'resolved' as const,
            resolution,
            resolvedAt: new Date().toISOString()
          };
        }
        return conflict;
      }));

      toast({
        title: 'All Conflicts Resolved',
        description: `Resolved ${pendingConflicts.length} conflicts using ${resolution} data.`,
      });

      return true;
    } catch (error) {
      toast({
        title: 'Bulk Resolution Failed',
        description: 'Failed to resolve all conflicts.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsResolving(false);
    }
  }, [conflicts, toast]);

  // Dismiss a conflict without resolving
  const dismissConflict = useCallback((conflictId: string) => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
    
    toast({
      title: 'Conflict Dismissed',
      description: 'Conflict has been dismissed.',
    });
  }, [toast]);

  // Clear all resolved conflicts
  const clearResolvedConflicts = useCallback(() => {
    setConflicts(prev => prev.filter(c => c.status !== 'resolved'));
    
    toast({
      title: 'Resolved Conflicts Cleared',
      description: 'All resolved conflicts have been cleared.',
    });
  }, [toast]);

  // Get conflict by ID
  const getConflictById = useCallback((conflictId: string): DataConflict | undefined => {
    return conflicts.find(c => c.id === conflictId);
  }, [conflicts]);

  return {
    conflicts,
    isResolving,
    resolvedCount,
    pendingCount,
    addConflict,
    resolveConflict,
    resolveAllConflicts,
    dismissConflict,
    clearResolvedConflicts,
    getConflictById
  };
}

// Helper function to create a conflict object
export function createConflict(
  itemType: string,
  itemId: string,
  localData: any,
  remoteData: any,
  conflictType: 'update' | 'delete' | 'create' = 'update'
): DataConflict {
  return {
    id: `${itemType}-${itemId}-${Date.now()}`,
    dataType: itemType,
    itemId,
    reason: `${conflictType} conflict detected`,
    rowIndex: 0,
    localValue: Array.isArray(localData) ? localData : [JSON.stringify(localData)],
    cloudValue: Array.isArray(remoteData) ? remoteData : [JSON.stringify(remoteData)],
    itemType,
    localData,
    remoteData,
    conflictType,
    status: 'pending',
    timestamp: new Date().toISOString()
  };
}

// Helper function to detect conflicts
export function detectConflict(localItem: any, remoteItem: any): boolean {
  if (!localItem || !remoteItem) return false;
  
  // Simple conflict detection based on lastModified timestamps
  const localTime = new Date(localItem.lastModified || 0).getTime();
  const remoteTime = new Date(remoteItem.lastModified || 0).getTime();
  
  // If timestamps are different and both items exist, there's a potential conflict
  return Math.abs(localTime - remoteTime) > 1000; // 1 second tolerance
}