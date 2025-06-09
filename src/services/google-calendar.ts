import type { Task, Reminder, Appointment, GoogleTokens, AppointmentAttendee, ChecklistItem } from '@/lib/types';
import { DataItemType } from '@/lib/types';

// Re-export all functions for backward compatibility
export {
  getOAuth2Client,
  generateGoogleAuthUrl,
  exchangeCodeForTokens,
  getAuthenticatedClient
} from './google-oauth';

export {
  getCalendarClient
} from './google-calendar-client';

export {
  mapToGoogleCalendarEvent
} from './google-calendar-mapper';

export {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents
} from './google-calendar-events';

// Type exports moved to individual service files to avoid client-side googleapis imports

// Extend the global NodeJS namespace to include our custom environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;
      NEXT_PUBLIC_GOOGLE_REDIRECT_URI: string;
    }
  }
}