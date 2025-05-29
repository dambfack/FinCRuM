import { jest } from '@jest/globals';
import { createCalendarEvent, updateCalendarEvent } from '../../services/google-calendar';
import { createCalendarEventAction, updateCalendarEventAction } from '../../app/actions/google-calendar-actions';
import type { Reminder, Appointment, GoogleTokens } from '../../lib/types';

// Mock the google-calendar service
jest.mock('../../services/google-calendar');

const mockCreateCalendarEvent = createCalendarEvent as jest.MockedFunction<typeof createCalendarEvent>;
const mockUpdateCalendarEvent = updateCalendarEvent as jest.MockedFunction<typeof updateCalendarEvent>;

describe('Google Calendar Sync - Duplicate Prevention', () => {
  const mockTokens: GoogleTokens = {
    accessToken: 'mock_access_token',
    refreshToken: 'mock_refresh_token'
  };

  const mockReminder: Reminder = {
    id: 'reminder-123',
    title: 'Test Reminder',
    description: 'Test Description',
    date: '2024-12-31',
    time: '10:00',
    completed: false,
    googleCalendarEventId: null
  };

  const mockAppointment: Appointment = {
    id: 'appointment-123',
    title: 'Test Appointment',
    description: 'Test Description',
    date: '2024-12-31',
    startTime: '10:00',
    endTime: '11:00',
    customerId: 'customer-123',
    googleCalendarEventId: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Calendar Event Action Functions', () => {
    it('should return correct data structure when creating calendar event', async () => {
      // Mock successful calendar event creation
      mockCreateCalendarEvent.mockResolvedValue({
        event: { id: 'calendar-event-123' },
        newTokens: { accessToken: 'new-token', refreshToken: 'new-refresh' }
      });

      const result = await createCalendarEventAction(mockReminder, 'reminder', mockTokens);

      expect(result).toEqual({
        success: true,
        data: {
          event: { id: 'calendar-event-123' },
          newTokens: { accessToken: 'new-token', refreshToken: 'new-refresh' }
        }
      });
      expect(mockCreateCalendarEvent).toHaveBeenCalledWith(mockReminder, 'reminder', mockTokens);
    });

    it('should handle calendar event creation failure gracefully', async () => {
      // Mock failed calendar event creation
      mockCreateCalendarEvent.mockRejectedValue(new Error('Calendar sync failed'));

      const result = await createCalendarEventAction(mockReminder, 'reminder', mockTokens);

      expect(result).toEqual({
        success: false,
        error: 'Calendar sync failed'
      });
      expect(mockCreateCalendarEvent).toHaveBeenCalledWith(mockReminder, 'reminder', mockTokens);
    });

    it('should update existing calendar event correctly', async () => {
      // Mock successful calendar event update
      mockUpdateCalendarEvent.mockResolvedValue({
        event: { id: 'existing-event-123' },
        newTokens: { accessToken: 'updated-token' }
      });

      const result = await updateCalendarEventAction(
        'existing-event-123',
        mockReminder,
        'reminder',
        mockTokens
      );

      expect(result).toEqual({
        success: true,
        data: {
          event: { id: 'existing-event-123' },
          newTokens: { accessToken: 'updated-token' }
        }
      });
      expect(mockUpdateCalendarEvent).toHaveBeenCalledWith(
        'existing-event-123',
        mockReminder,
        'reminder',
        mockTokens
      );
    });

    it('should handle appointment calendar event creation', async () => {
      // Mock successful calendar event creation for appointment
      mockCreateCalendarEvent.mockResolvedValue({
        event: { id: 'appointment-event-123' },
        newTokens: { accessToken: 'new-token' }
      });

      const result = await createCalendarEventAction(mockAppointment, 'appointment', mockTokens);

      expect(result).toEqual({
        success: true,
        data: {
          event: { id: 'appointment-event-123' },
          newTokens: { accessToken: 'new-token' }
        }
      });
      expect(mockCreateCalendarEvent).toHaveBeenCalledWith(mockAppointment, 'appointment', mockTokens);
    });

    it('should handle missing Google tokens gracefully', async () => {
      // Mock missing tokens error
      mockCreateCalendarEvent.mockRejectedValue(new Error('No valid Google tokens found'));

      const result = await createCalendarEventAction(mockAppointment, 'appointment', null);

      expect(result).toEqual({
        success: false,
        error: 'No valid Google tokens found'
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors during calendar sync', async () => {
      // Mock network error
      mockCreateCalendarEvent.mockRejectedValue(new Error('Network error'));

      const result = await createCalendarEventAction(mockReminder, 'reminder', mockTokens);

      expect(result).toEqual({
        success: false,
        error: 'Network error'
      });
    });

    it('should handle malformed calendar API response', async () => {
      // Mock malformed response
      mockCreateCalendarEvent.mockResolvedValue(null);

      const result = await createCalendarEventAction(mockReminder, 'reminder', mockTokens);

      expect(result).toEqual({
        success: true,
        data: null
      });
    });
  });

  describe('Token Management', () => {
    it('should update tokens when provided in calendar response', async () => {
      // Mock response with new tokens
      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };
      
      mockCreateCalendarEvent.mockResolvedValue({
        event: { id: 'event-123' },
        newTokens
      });

      const result = await createCalendarEventAction(mockReminder, 'reminder', mockTokens);

      expect(result).toEqual({
        success: true,
        data: {
          event: { id: 'event-123' },
          newTokens
        }
      });
    });
  });
});