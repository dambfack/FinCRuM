import { google } from 'googleapis';
import {
  generateGoogleAuthUrl,
  exchangeCodeForTokens,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  getAuthenticatedClient
} from '../google-calendar';
import { DataItemType } from '@/lib/types';

// Mock the google-auth-library and googleapis
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth'),
    getToken: jest.fn().mockResolvedValue({
      tokens: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000
      }
    }),
    setCredentials: jest.fn(),
    refreshAccessToken: jest.fn().mockResolvedValue({
      credentials: {
        access_token: 'new-access-token',
        expiry_date: Date.now() + 3600000
      }
    })
  }))
}));

jest.mock('googleapis', () => ({
  google: {
    calendar: jest.fn().mockReturnValue({
      events: {
        insert: jest.fn().mockResolvedValue({ data: { id: 'test-event-id' } }),
        update: jest.fn().mockResolvedValue({ data: { id: 'test-event-id' } }),
        delete: jest.fn().mockResolvedValue({ data: {} }),
        list: jest.fn().mockResolvedValue({
          data: {
            items: [
              { id: 'event-1', summary: 'Test Event 1' },
              { id: 'event-2', summary: 'Test Event 2' }
            ]
          }
        })
      }
    })
  }
}));

describe('Google Calendar Service', () => {
  const mockTokens = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expiry_date: Date.now() + 3600000
  };

  const mockAppointment = {
    id: 'test-appointment-id',
    title: 'Test Appointment',
    start: new Date().toISOString(),
    end: new Date(Date.now() + 3600000).toISOString(),
    description: 'Test Description',
    googleCalendarEventId: 'test-event-id',
    type: 'appointment' as const
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('generateGoogleAuthUrl', () => {
    it('should generate a Google OAuth URL', async () => {
      const url = await generateGoogleAuthUrl();
      expect(url).toBe('https://accounts.google.com/o/oauth2/auth');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange an authorization code for tokens', async () => {
      const tokens = await exchangeCodeForTokens('test-code');
      expect(tokens).toEqual({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: expect.any(Number)
      });
    });
  });

  describe('getAuthenticatedClient', () => {
    it('should return a client with valid tokens', async () => {
      const client = await getAuthenticatedClient(mockTokens);
      expect(client).toBeDefined();
    });

    it('should refresh tokens if expired', async () => {
      const expiredTokens = {
        ...mockTokens,
        expiry_date: Date.now() - 1000 // Expired token
      };
      
      const client = await getAuthenticatedClient(expiredTokens);
      expect(client).toBeDefined();
      // Verify refreshToken was called
      expect(google.auth.OAuth2Client.prototype.refreshAccessToken).toHaveBeenCalled();
    });
  });

  describe('createCalendarEvent', () => {
    it('should create a new calendar event', async () => {
      const result = await createCalendarEvent(mockAppointment, 'appointment', mockTokens);
      expect(result.event.id).toBe('test-event-id');
      expect(google.calendar().events.insert).toHaveBeenCalled();
    });
  });

  describe('updateCalendarEvent', () => {
    it('should update an existing calendar event', async () => {
      const result = await updateCalendarEvent(
        'test-event-id',
        mockAppointment,
        'appointment',
        mockTokens
      );
      
      expect(result.event.id).toBe('test-event-id');
      expect(google.calendar().events.update).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'test-event-id',
          requestBody: expect.any(Object)
        })
      );
    });
  });

  describe('deleteCalendarEvent', () => {
    it('should delete a calendar event', async () => {
      const result = await deleteCalendarEvent('test-event-id', mockTokens);
      expect(result.success).toBe(true);
      expect(google.calendar().events.delete).toHaveBeenCalledWith({
        eventId: 'test-event-id',
        calendarId: 'primary'
      });
    });
  });

  describe('listCalendarEvents', () => {
    it('should list calendar events', async () => {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const result = await listCalendarEvents(
        mockTokens,
        now.toISOString(),
        nextWeek.toISOString()
      );
      
      expect(result.events).toHaveLength(2);
      expect(google.calendar().events.list).toHaveBeenCalledWith(
        expect.objectContaining({
          timeMin: now.toISOString(),
          timeMax: nextWeek.toISOString()
        })
      );
    });
  });
});
