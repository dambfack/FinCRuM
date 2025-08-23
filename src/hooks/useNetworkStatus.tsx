'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NetworkStatusState {
  isOnline: boolean;
  isConnecting: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  lastOnlineAt: string | null;
  retryCount: number;
  maxRetries: number;
}

interface NetworkStatusActions {
  checkConnection: () => Promise<boolean>;
  retryConnection: () => Promise<boolean>;
  resetRetryCount: () => void;
  updateConnectionQuality: (quality: 'excellent' | 'good' | 'poor' | 'offline') => void;
}

interface NetworkStatusOptions {
  maxRetries?: number;
  retryDelay?: number;
  pingUrl?: string;
  enableQualityCheck?: boolean;
  onConnectionChange?: (isOnline: boolean) => void;
  onQualityChange?: (quality: string) => void;
}

export function useNetworkStatus(options: NetworkStatusOptions = {}): NetworkStatusState & NetworkStatusActions {
  const {
    maxRetries = 3,
    retryDelay = 2000,
    pingUrl = '/api/ping',
    enableQualityCheck = true,
    onConnectionChange,
    onQualityChange
  } = options;

  const [networkState, setNetworkState] = useState<NetworkStatusState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isConnecting: false,
    connectionQuality: 'excellent',
    lastOnlineAt: null,
    retryCount: 0,
    maxRetries
  });

  const { toast } = useToast();
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const qualityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousOnlineState = useRef(networkState.isOnline);

  // Check connection quality by measuring response time (throttled)
  const checkConnectionQuality = useCallback(async (): Promise<'excellent' | 'good' | 'poor' | 'offline'> => {
    if (!networkState.isOnline) return 'offline';
    
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // Reduced timeout to 2 seconds
      
      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) return 'poor';
      
      const responseTime = Date.now() - startTime;
      
      if (responseTime < 200) return 'excellent';
      if (responseTime < 500) return 'good';
      return 'poor';
    } catch (error) {
      // Silently handle all errors to prevent console spam
      if (error instanceof Error && error.name !== 'AbortError') {
        console.debug('Connection quality check failed:', error.message);
      }
      return 'poor'; // Return 'poor' instead of 'offline' to avoid unnecessary state changes
    }
  }, [networkState.isOnline, pingUrl]);

  // Check if we have an active internet connection (manual trigger only)
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setNetworkState(prev => ({ ...prev, isConnecting: true }));
    
    try {
      // First check navigator.onLine
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return false;
      }
      
      // Only make API call when explicitly requested
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // Reduced timeout to 2 seconds
      
      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      // Silently handle network errors to avoid console spam
      if (error instanceof Error && error.name !== 'AbortError') {
        console.debug('Manual network check failed:', error.message);
      }
      return false;
    } finally {
      setNetworkState(prev => ({ ...prev, isConnecting: false }));
    }
  }, [pingUrl]);

  // Retry connection with exponential backoff
  const retryConnection = useCallback(async (): Promise<boolean> => {
    if (networkState.retryCount >= maxRetries) {
      toast({
        title: 'Connection Failed',
        description: `Failed to reconnect after ${maxRetries} attempts.`,
        variant: 'destructive'
      });
      return false;
    }

    setNetworkState(prev => ({ 
      ...prev, 
      retryCount: prev.retryCount + 1,
      isConnecting: true 
    }));

    // Exponential backoff delay
    const delay = retryDelay * Math.pow(2, networkState.retryCount);
    
    return new Promise((resolve) => {
      retryTimeoutRef.current = setTimeout(async () => {
        const isConnected = await checkConnection();
        
        if (isConnected) {
          setNetworkState(prev => ({
            ...prev,
            isOnline: true,
            retryCount: 0,
            lastOnlineAt: new Date().toISOString(),
            isConnecting: false
          }));
          
          toast({
            title: 'Connection Restored',
            description: 'Internet connection has been restored.',
          });
        }
        
        resolve(isConnected);
      }, delay);
    });
  }, [networkState.retryCount, maxRetries, retryDelay, checkConnection, toast]);

  // Reset retry count
  const resetRetryCount = useCallback(() => {
    setNetworkState(prev => ({ ...prev, retryCount: 0 }));
  }, []);

  // Update connection quality manually
  const updateConnectionQuality = useCallback((quality: 'excellent' | 'good' | 'poor' | 'offline') => {
    setNetworkState(prev => ({ ...prev, connectionQuality: quality }));
    onQualityChange?.(quality);
  }, [onQualityChange]);

  // Handle online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      // Use navigator.onLine for immediate feedback without API calls
      const isOnline = navigator.onLine;
      
      setNetworkState(prev => ({
        ...prev,
        isOnline,
        lastOnlineAt: isOnline ? new Date().toISOString() : prev.lastOnlineAt,
        retryCount: isOnline ? 0 : prev.retryCount,
        connectionQuality: isOnline ? 'good' : 'offline'
      }));

      if (isOnline && !previousOnlineState.current) {
        toast({
          title: 'Back Online',
          description: 'Internet connection restored.',
        });
      }
      
      previousOnlineState.current = isOnline;
      onConnectionChange?.(isOnline);
    };

    const handleOffline = () => {
      setNetworkState(prev => ({
        ...prev,
        isOnline: false,
        connectionQuality: 'offline'
      }));
      
      if (previousOnlineState.current) {
        toast({
          title: 'Connection Lost',
          description: 'Internet connection lost.',
          variant: 'destructive'
        });
      }
      
      previousOnlineState.current = false;
      onConnectionChange?.(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial state setup without API call
    const initialOnline = navigator.onLine;
    setNetworkState(prev => ({
      ...prev,
      isOnline: initialOnline,
      connectionQuality: initialOnline ? 'good' : 'offline'
    }));
    previousOnlineState.current = initialOnline;

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, onConnectionChange]);

  // Periodic connection quality check (much reduced frequency)
  useEffect(() => {
    if (!enableQualityCheck || !networkState.isOnline) return;

    const checkQuality = async () => {
      try {
        const quality = await checkConnectionQuality();
        setNetworkState(prev => ({ ...prev, connectionQuality: quality }));
        onQualityChange?.(quality);
      } catch (error) {
        // Silently handle errors to prevent console spam
        console.debug('Quality check failed:', error);
      }
    };

    // Check quality every 5 minutes when online (reduced from 2 minutes)
    qualityCheckIntervalRef.current = setInterval(checkQuality, 300000);
    
    // Delay initial quality check by 30 seconds to avoid immediate API calls
    const initialCheckTimeout = setTimeout(checkQuality, 30000);

    return () => {
      if (qualityCheckIntervalRef.current) {
        clearInterval(qualityCheckIntervalRef.current);
      }
      clearTimeout(initialCheckTimeout);
    };
  }, [enableQualityCheck, networkState.isOnline, checkConnectionQuality, onQualityChange]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (qualityCheckIntervalRef.current) {
        clearInterval(qualityCheckIntervalRef.current);
      }
    };
  }, []);

  return {
    ...networkState,
    checkConnection,
    retryConnection,
    resetRetryCount,
    updateConnectionQuality
  };
}

// Helper hook for simple online/offline detection
export function useOnlineStatus(): boolean {
  const { isOnline } = useNetworkStatus({ enableQualityCheck: false });
  return isOnline;
}

// Helper hook for connection quality only
export function useConnectionQuality(): 'excellent' | 'good' | 'poor' | 'offline' {
  const { connectionQuality } = useNetworkStatus();
  return connectionQuality;
}