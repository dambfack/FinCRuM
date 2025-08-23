// Set up environment variables before importing modules
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/callback/google';

// Import Jest types
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
// Removed direct import of googleapis types to avoid client-side bundling issues

// Add Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeDefined(): R;
      toHaveBeenCalled(): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toBe(value: any): R;
      toEqual(value: any): R;
    }
    interface Expect {
      anything(): any;
    }
  }
}

// Mock the OAuth configuration check before importing modules
jest.mock('../google-oauth', () => {
  const originalModule = jest.requireActual('../google-oauth');
  return {
    ...originalModule,
    isGoogleOAuthConfigured: jest.fn().mockReturnValue(true),
    getAuthenticatedClient: jest.fn().mockImplementation((tokens) => {
      // If tokens are expired, return a client with refreshed credentials
      const isExpired = tokens.expiry_date && tokens.expiry_date < Date.now() + 60000;
      const credentials = isExpired ? {
        access_token: 'refreshed-access-token',
        refresh_token: tokens.refresh_token,
        expiry_date: Date.now() + 7200000
      } : tokens;
      
      return {
        setCredentials: jest.fn(),
        credentials: credentials
      };
    })
  };
});

// Import the module under test after setting up mocks
// Removed direct import of googleapis to avoid client-side bundling issues
import {
  getOAuth2Client,
  getCalendarClient,
  generateGoogleAuthUrl,
  exchangeCodeForTokens,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  mapToGoogleCalendarEvent,
} from '../google-calendar';
import type { Task, Reminder, Appointment, GoogleTokens } from '@/lib/types';

// Mock the google-auth-library methods
const mockGenerateAuthUrl = jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth');

// Mock getToken with proper typing
const mockGetToken = jest.fn().mockImplementation((code: string) => {
  return Promise.resolve({
    tokens: {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expiry_date: Date.now() + 3600000,
    },
  });
});

const mockSetCredentials = jest.fn();

// Mock refreshAccessToken with proper typing
const mockRefreshAccessToken = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    credentials: {
      access_token: 'refreshed-access-token',
      expiry_date: Date.now() + 7200000,
    },
  });
});

// Mock the OAuth2Client class
const MockOAuth2Client = jest.fn().mockImplementation(() => ({
  generateAuthUrl: mockGenerateAuthUrl,
  getToken: mockGetToken,
  setCredentials: mockSetCredentials,
  refreshAccessToken: mockRefreshAccessToken,
}));

// Define response interfaces
type TokenResponse = {
  tokens: {
    access_token: string;
    refresh_token?: string;
    expiry_date: number;
  };
};

type RefreshTokenResponse = {
  credentials: {
    access_token: string;
    expiry_date: number;
  };
};

// Type the mock functions
const typedMockGetToken = mockGetToken as jest.Mock<Promise<{
  tokens: {
    access_token: string;
    refresh_token?: string;
    expiry_date: number;
  };
}>>;

const typedMockSetCredentials = mockSetCredentials as jest.Mock<void>;

const typedMockRefreshAccessToken = mockRefreshAccessToken as jest.Mock<Promise<{
  credentials: {
    access_token: string;
    expiry_date: number;
  };
}>>;



// Mock the google-auth-library module
jest.mock('google-auth-library', () => ({
  OAuth2Client: MockOAuth2Client,
}));

// Define types for mock data
interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
  [key: string]: any;
}

// Mock the google.calendar methods
const mockCalendarEvents = {
  insert: jest.fn().mockImplementation(() => 
    Promise.resolve({
      data: {
        id: 'test-event-id',
        summary: 'Test Event',
        start: { dateTime: '2025-06-01T10:00:00Z' },
        end: { dateTime: '2025-06-01T11:00:00Z' },
      },
    })
  ),
  update: jest.fn().mockImplementation(() => 
    Promise.resolve({
      data: {
        id: 'test-event-id',
        summary: 'Updated Test Event',
        start: { dateTime: '2025-06-01T10:00:00Z' },
        end: { dateTime: '2025-06-01T11:00:00Z' },
      },
    })
  ),
  delete: jest.fn().mockImplementation(() => Promise.resolve()),
  list: jest.fn().mockImplementation(() => 
    Promise.resolve({
      data: {
        items: [
          {
            id: 'test-event-1',
            summary: 'Test Event 1',
            start: { dateTime: '2025-06-01T10:00:00Z' },
            end: { dateTime: '2025-06-01T11:00:00Z' },
          },
          {
            id: 'test-event-2',
            summary: 'Test Event 2',
            start: { dateTime: '2025-06-02T14:00:00Z' },
            end: { dateTime: '2025-06-02T15:00:00Z' },
          },
        ],
      },
    })
  ),
};

// Mock the google.calendar function
const mockCalendar = jest.fn().mockReturnValue({
  events: mockCalendarEvents,
});

// Mock the google module
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: mockGenerateAuthUrl,
        getToken: mockGetToken,
        setCredentials: mockSetCredentials,
        refreshAccessToken: mockRefreshAccessToken,
      })),
    },
    calendar: jest.fn().mockImplementation(() => ({
      events: mockCalendarEvents,
    })),
  },
}));



// Mock environment variables
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/callback/google';

describe('Google Calendar Service - Extended Tests', () => {
  // Test data
  const mockTokens: GoogleTokens = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expiry_date: Date.now() + 3600000,
  };

  // Create test data that matches the actual types from the application
  const mockTask: Task = {
    id: 'task-123',
    title: 'Test Task',
    description: 'This is a test task',
    dueDate: '2025-06-01T10:00:00Z',
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    priority: 'medium',
    status: 'todo',
    checklist: [
      { id: '1', text: 'Task item 1', completed: false },
      { id: '2', text: 'Task item 2', completed: true },
    ]
  };

  const mockReminder: Reminder = {
    id: 'reminder-123',
    title: 'Test Reminder',
    description: 'This is a test reminder',
    dateTime: '2025-06-02T15:00:00Z',
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dismissed: false
  };

  const mockAppointment: Appointment = {
    id: 'appointment-123',
    title: 'Test Appointment',
    description: 'This is a test appointment',
    date: '2025-06-02',
    time: '10:00',
    start: '2025-06-02T10:00:00Z',
    end: '2025-06-02T11:00:00Z',
    location: 'Test Location',
    attendeesList: [
      { email: 'attendee1@example.com', displayName: 'Attendee One' },
      { email: 'attendee2@example.com', displayName: 'Attendee Two' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    googleCalendarStatus: 'confirmed'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOAuth2Client', () => {
    it('should create an OAuth2 client with the correct configuration', async () => {
      const client = await getOAuth2Client();
      expect(client).toBeDefined();
      // Use type assertion to access the mock implementation
      // Removed direct require to avoid client-side bundling issues
      expect(MockOAuth2Client).toHaveBeenCalledWith({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/auth/callback/google',
      });
    });
  });

  describe('getCalendarClient', () => {
    it('should create a calendar client with the provided tokens', async () => {
      const calendar = await getCalendarClient(mockTokens);
      expect(calendar).toBeDefined();
      expect(google.calendar).toHaveBeenCalledWith({
        version: 'v3',
        auth: expect.anything(),
      });
    });
  });

  describe('generateGoogleAuthUrl', () => {
    it('should generate a Google OAuth URL with default scopes', async () => {
      const url = await generateGoogleAuthUrl();
      expect(url).toBe('https://accounts.google.com/o/oauth2/auth');
    });

    it('should generate a Google OAuth URL with custom scopes', async () => {
      const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
      await generateGoogleAuthUrl(scopes);
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(expect.objectContaining({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
      }));
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange an authorization code for tokens', async () => {
      const tokens = await exchangeCodeForTokens('test-code');
      expect(tokens).toEqual({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: expect.any(Number),
      });
    });

    it('should throw an error if token exchange fails', async () => {
      const errorMessage = 'Token exchange failed';
      mockGetToken.mockRejectedValueOnce(new Error(errorMessage));

      await expect(exchangeCodeForTokens('invalid-code')).rejects.toThrow(
        `Failed to exchange authorization code for tokens: ${errorMessage}`
      );
    });
  });

  describe('mapToGoogleCalendarEvent', () => {
    // Task mapping removed - only reminder and appointment are supported

    it('should map a reminder to a Google Calendar event', () => {
      const event = mapToGoogleCalendarEvent(mockReminder, 'reminder');
      expect(event).toMatchObject({
        summary: 'Reminder: Test Reminder',
        description: 'This is a test reminder\n\n-added from FinsculptCRM',
        start: { dateTime: '2025-06-02T15:00:00.000Z' },
        end: { dateTime: '2025-06-02T15:30:00.000Z' },
      });
    });

    it('should map an appointment to a Google Calendar event with attendees', () => {
      const event = mapToGoogleCalendarEvent(mockAppointment, 'appointment');
      expect(event).toMatchObject({
        summary: 'Test Appointment',
        description: 'This is a test appointment\n\n-added from FinsculptCRM',
        start: { dateTime: '2025-06-02T10:00:00.000Z' },
        end: { dateTime: '2025-06-02T11:00:00.000Z' },
        attendees: [
          { email: 'attendee1@example.com', displayName: 'Attendee One' },
          { email: 'attendee2@example.com', displayName: 'Attendee Two' },
        ],
      });
    });
  });

  describe('createCalendarEvent', () => {
    it('should create a new calendar event for a reminder', async () => {
      const result = await createCalendarEvent(mockReminder, 'reminder', mockTokens);
      expect(result).toHaveProperty('event');
      expect(result.event.id).toBe('test-event-id');
      expect(google.calendar().events.insert).toHaveBeenCalledWith({
        calendarId: 'primary',
        requestBody: expect.objectContaining({
          summary: 'Reminder: Test Reminder',
        }),
        conferenceDataVersion: 0,
        sendUpdates: 'all',
      });
    });

    it('should include conference data for online meetings', async () => {
      const onlineAppointment = {
        ...mockAppointment,
        isOnline: true,
        meetingLink: 'https://meet.google.com/abc-xyz',
      };
      
      await createCalendarEvent(onlineAppointment, 'appointment', mockTokens);
      
      expect(google.calendar().events.insert).toHaveBeenCalledWith(expect.objectContaining({
        calendarId: 'primary',
        requestBody: expect.objectContaining({
          conferenceData: {
            createRequest: {
              requestId: expect.any(String),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }),
        conferenceDataVersion: 1,
        sendUpdates: 'all',
      }));
    });
  });

  describe('updateCalendarEvent', () => {
    it('should update an existing calendar event', async () => {
      const result = await updateCalendarEvent('event-123', mockAppointment, 'appointment', mockTokens);
      expect(result).toHaveProperty('event');
      expect(result.event.summary).toBe('Updated Test Event');
      expect(google.calendar().events.update).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'event-123',
        requestBody: expect.anything(),
        conferenceDataVersion: 1,
        sendUpdates: 'all',
      });
    });
  });

  describe('deleteCalendarEvent', () => {
    it('should delete an existing calendar event', async () => {
      const result = await deleteCalendarEvent('event-123', mockTokens);
      expect(result).toMatchObject({ success: true });
      expect(google.calendar().events.delete).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'event-123',
        sendUpdates: 'all',
      });
    });
  });

  describe('listCalendarEvents', () => {
    it('should list calendar events within the specified time range', async () => {
      const timeMin = '2025-06-01T00:00:00Z';
      const timeMax = '2025-06-30T23:59:59Z';
      
      const result = await listCalendarEvents(mockTokens, timeMin, timeMax);
      
      expect(result).toHaveProperty('events');
      expect(result.events).toHaveLength(2);
      expect(google.calendar().events.list).toHaveBeenCalledWith({
        calendarId: 'primary',
        timeMin,
        timeMax,
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
      });
    });

    it('should use default time range if none provided', async () => {
      const now = new Date();
      const defaultTimeMin = now.toISOString();
      const defaultTimeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      await listCalendarEvents(mockTokens);
      
      const callArgs = (google.calendar().events.list as jest.Mock).mock.calls[0][0];
      expect(new Date(callArgs.timeMin).getTime()).toBeCloseTo(new Date(defaultTimeMin).getTime(), -3);
      expect(new Date(callArgs.timeMax).getTime()).toBeCloseTo(new Date(defaultTimeMax).getTime(), -3);
    });
  });

  describe('token refresh', () => {
    it('should refresh expired tokens when needed', async () => {
      const expiredTokens = {
        ...mockTokens,
        expiry_date: Date.now() - 1000, // Expired token
      };

      const result = await listCalendarEvents(expiredTokens);
      
      expect(result).toHaveProperty('newTokens');
      expect(result.newTokens?.access_token).toBe('refreshed-access-token');
    });
  });
});
