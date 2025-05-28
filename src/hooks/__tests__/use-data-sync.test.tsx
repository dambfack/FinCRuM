import { renderHook, act } from '@testing-library/react-hooks';
import { useDataSync } from '../use-data-sync';
import { DataItemType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// Mock the hooks and services
jest.mock('@/hooks/use-toast');
jest.mock('@/services/onedrive');
jest.mock('@/services/google-drive');
jest.mock('@/services/google-calendar');

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

  beforeEach(() => {
    // Reset all mocks and storage before each test
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    
    // Mock the toast function
    mockUseToast.mockReturnValue({
      toast: mockToast,
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
      // Mock the calendar events API
      const mockEvents = [
        { id: 'event-1', summary: 'Test Event 1' },
        { id: 'event-2', summary: 'Test Event 2' },
      ];
      
      require('@/services/google-calendar').listCalendarEvents.mockResolvedValue({
        events: mockEvents,
        newTokens: null,
      });

      const { result, waitForNextUpdate } = renderHook(() => useDataSync());
      
      // Trigger sync
      await act(async () => {
        await result.current.syncData({ syncCalendar: true });
      });

      // Verify the sync was successful
      expect(result.current.syncStatus).toBe('success');
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sync Completed',
          variant: 'default',
        })
      );
    });

    it('should handle calendar sync errors', async () => {
      // Mock a failed calendar sync
      require('@/services/google-calendar').listCalendarEvents.mockRejectedValue(
        new Error('Failed to fetch calendar events')
      );

      const { result } = renderHook(() => useDataSync());
      
      // Trigger sync
      await act(async () => {
        await result.current.syncData({ syncCalendar: true });
      });

      // Verify error handling
      expect(result.current.syncStatus).toBe('error');
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sync Error',
          variant: 'destructive',
        })
      );
    });

    it('should refresh expired tokens during sync', async () => {
      // Set up expired token
      localStorage.setItem('googleCalendarTokenExpiry', (Date.now() - 1000).toString());
      
      // Mock token refresh
      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expiry_date: Date.now() + 3600000,
      };
      
      require('@/services/google-calendar').listCalendarEvents.mockResolvedValueOnce({
        events: [],
        newTokens,
      });

      const { result } = renderHook(() => useDataSync());
      
      // Trigger sync
      await act(async () => {
        await result.current.syncData({ syncCalendar: true });
      });

      // Verify tokens were updated
      expect(localStorage.getItem(DataItemType.GoogleCalendarAccessToken)).toBe(newTokens.access_token);
      expect(localStorage.getItem(DataItemType.GoogleCalendarRefreshToken)).toBe(newTokens.refresh_token);
    });
  });

  describe('Authentication', () => {
    it('should initiate Google Calendar authentication', async () => {
      const authUrl = 'https://accounts.google.com/o/oauth2/auth';
      require('@/services/google-calendar').generateGoogleAuthUrl.mockResolvedValue(authUrl);
      
      const { result } = renderHook(() => useDataSync());
      
      // Mock window.open
      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
      
      // Trigger authentication
      await act(async () => {
        await result.current.initiateAuthentication('googlecalendar');
      });
      
      // Verify authentication flow
      expect(windowOpenSpy).toHaveBeenCalledWith(authUrl, '_blank');
      expect(sessionStorage.getItem('googleAuthProvider')).toBe('googlecalendar');
      
      windowOpenSpy.mockRestore();
    });
  });
});
