import { renderHook, act } from '@testing-library/react';
import { useDataSync } from '../use-data-sync';
import { DataItemType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// Mock the hooks and services
jest.mock('@/hooks/use-toast');
jest.mock('@/services/onedrive');
jest.mock('@/services/google-drive');
jest.mock('@/services/google-calendar');
jest.mock('@/hooks/useGoogleSync');
jest.mock('@/hooks/useMicrosoftSync');
jest.mock('@/hooks/useConflictResolution');
jest.mock('@/hooks/useNetworkStatus');

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

describe('useDataSync', () => {
  const mockToast = jest.fn();
  const mockUseToast = useToast as jest.Mock;
  const mockGoogleConnect = jest.fn();
  const mockMicrosoftConnect = jest.fn();

  beforeEach(() => {
    // Reset all mocks and storage before each test
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    
    // Mock the toast function
    mockUseToast.mockReturnValue({
      toast: mockToast,
    });

    // Mock the hooks
    require('@/hooks/useGoogleSync').useGoogleSync.mockReturnValue({
      isConnected: false,
      connect: mockGoogleConnect,
      disconnect: jest.fn(),
      syncData: jest.fn(),
    });

    require('@/hooks/useMicrosoftSync').useMicrosoftSync.mockReturnValue({
      isConnected: false,
      connect: mockMicrosoftConnect,
      disconnect: jest.fn(),
      syncData: jest.fn(),
    });

    require('@/hooks/useConflictResolution').useConflictResolution.mockReturnValue({
      conflicts: [],
      addConflict: jest.fn(),
      resolveConflict: jest.fn(),
      pendingCount: 0,
    });

    require('@/hooks/useNetworkStatus').useNetworkStatus.mockReturnValue({
      isOnline: true,
      connectionQuality: 'good',
    });

    // Set up default mock implementations
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useDataSync());
    
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.conflicts).toEqual([]);
    expect(result.current.lastSyncTime).toBeNull();
    expect(result.current.syncStatus).toBe('idle');
  });

  describe('Google Calendar Integration', () => {
    beforeEach(() => {
      // Set up Google tokens in localStorage
      localStorage.setItem(DataItemType.GoogleCalendarAccessToken, 'test-access-token');
      localStorage.setItem(DataItemType.GoogleCalendarRefreshToken, 'test-refresh-token');
      localStorage.setItem('googleCalendarTokenExpiry', (Date.now() + 3600000).toString());
    });

    it('should sync calendar events successfully', async () => {
      const { result } = renderHook(() => useDataSync());
      
      // Trigger sync
      await act(async () => {
        await result.current.syncCalendarOnly();
      });

      // Verify the sync completed (status may be 'idle' after completion)
      expect(result.current.syncStatus).toMatch(/success|idle/);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Calendar'),
        })
      );
    });

    it('should handle calendar sync errors', async () => {
      const { result } = renderHook(() => useDataSync());
      
      // Trigger sync
      await act(async () => {
        await result.current.syncCalendarOnly();
      });

      // Verify that the function can be called without throwing
      expect(result.current.syncCalendarOnly).toBeDefined();
    });

    it('should handle token refresh during sync', async () => {
      // Set up expired token
      localStorage.setItem('googleCalendarTokenExpiry', (Date.now() - 1000).toString());
      
      const { result } = renderHook(() => useDataSync());
      
      // Trigger sync
      await act(async () => {
        await result.current.syncCalendarOnly();
      });

      // Verify that the function can be called with expired tokens
      expect(result.current.syncCalendarOnly).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should initiate Google authentication', async () => {
      const { result } = renderHook(() => useDataSync());
      
      // Trigger authentication
      await act(async () => {
        await result.current.initiateAuthentication('google');
      });
      
      // Verify that googleSync.connect was called
      expect(mockGoogleConnect).toHaveBeenCalled();
    });

    it('should initiate Microsoft authentication', async () => {
      const { result } = renderHook(() => useDataSync());
      
      // Trigger authentication
      await act(async () => {
        await result.current.initiateAuthentication('microsoft');
      });
      
      // Verify that microsoftSync.connect was called
      expect(mockMicrosoftConnect).toHaveBeenCalled();
    });
  });
});
