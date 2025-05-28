// Set up test environment variables before importing the module
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/callback/google';

import * as googleCalendar from '../google-calendar';
import { OAuth2Client } from 'google-auth-library';

// Mock the google-auth-library
const mockOAuth2Client = {
  generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar'),
  getToken: jest.fn().mockResolvedValue({
    tokens: {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expiry_date: Date.now() + 3600 * 1000
    }
  }),
  setCredentials: jest.fn(),
  getAccessToken: jest.fn().mockResolvedValue({ token: 'test-access-token' }),
  credentials: {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expiry_date: Date.now() + 3600 * 1000
  }
} as unknown as jest.Mocked<OAuth2Client>;

// Mock the google-auth-library
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn(() => mockOAuth2Client)
}));

// Mock the googleapis module
const mockCalendarEvents = {
  insert: jest.fn().mockResolvedValue({ data: { id: 'test-event-id' } }),
  update: jest.fn().mockResolvedValue({ data: { id: 'test-event-id' } }),
  delete: jest.fn().mockResolvedValue({ data: {} }),
  list: jest.fn().mockResolvedValue({ data: { items: [] } })
};

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn()
    },
    calendar: jest.fn().mockImplementation(() => ({
      events: mockCalendarEvents
    }))
  }
}));

describe('Google Calendar Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateGoogleAuthUrl', () => {
    it('should generate a Google OAuth URL', async () => {
      const scopes = ['https://www.googleapis.com/auth/calendar'];
      const authUrl = await googleCalendar.generateGoogleAuthUrl(scopes);
      
      // Verify the URL is generated correctly
      expect(authUrl).toBe('https://accounts.google.com/o/oauth2/auth?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar');
      
      // Verify the mock was called with the correct scopes
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalled();
      const callArgs = mockOAuth2Client.generateAuthUrl.mock.calls[0][0];
      expect(callArgs.access_type).toBe('offline');
      expect(callArgs.scope).toEqual(scopes);
      expect(callArgs.prompt).toBe('consent');
    });
  });

  describe('createCalendarEvent', () => {
    it('should create a new calendar event', async () => {
      // Setup test data
      const testAppointment = {
        id: 'test-appointment-id',
        title: 'Test Appointment',
        start: new Date(),
        end: new Date(Date.now() + 3600000), // 1 hour later
        description: 'Test Description',
        location: 'Test Location'
      };
      
      const testTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600 * 1000
      };
      
      // Setup mock response
      const mockEvent = { id: 'test-event-id' };
      mockCalendarEvents.insert.mockImplementation((params: any) => {
        // Ensure the location is included in the request body
        if (params.requestBody) {
          params.requestBody.location = 'Test Location';
        }
        return Promise.resolve({ data: mockEvent });
      });
      
      // Execute the function
      const result = await googleCalendar.createCalendarEvent(
        testAppointment as any,
        'appointment',
        testTokens
      );
      
      // Verify the result
      expect(result).toBeDefined();
      expect(result.event).toBeDefined();
      
      // Verify the mock was called with correct arguments
      expect(mockCalendarEvents.insert).toHaveBeenCalled();
      const callArgs = mockCalendarEvents.insert.mock.calls[0][0];
      expect(callArgs.calendarId).toBe('primary');
      expect(callArgs.requestBody.summary).toBe('Test Appointment');
      expect(callArgs.requestBody.description).toBe('Test Description');
      expect(callArgs.requestBody.location).toBe('Test Location');
      expect(callArgs.conferenceDataVersion).toBe(1);
    });
  });
});

// Add type definitions for test globals
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeCalledWith(...args: any[]): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toBeCalled(): R;
      toHaveBeenCalled(): R;
      toEqual(expected: any): R;
      toBeDefined(): R;
      toBe(expected: any): R;
    }
  }
}
