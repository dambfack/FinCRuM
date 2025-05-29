import { DataItemType } from '@/lib/types';

// Re-export all functions for easy access
export {
  generateMicrosoftAuthUrl,
  exchangeCodeForTokens,
  refreshMicrosoftTokens,
  getValidMicrosoftToken,
  makeAuthenticatedRequest
} from './microsoft-oauth';

export {
  createMicrosoftCalendarEvent as createMicrosoftCalendarEventClient,
  updateMicrosoftCalendarEvent as updateMicrosoftCalendarEventClient,
  deleteMicrosoftCalendarEvent as deleteMicrosoftCalendarEventClient,
  getMicrosoftCalendarEvents,
  findMicrosoftCalendarEventBySubject
} from './microsoft-calendar-client';

export {
  mapToMicrosoftCalendarEvent,
  extractItemIdFromMicrosoftEvent,
  isMicrosoftEventFromFinCRuM
} from './microsoft-calendar-mapper';

export {
  createMicrosoftCalendarEvent,
  updateMicrosoftCalendarEvent,
  deleteMicrosoftCalendarEvent,
  syncToMicrosoftCalendar,
  batchSyncToMicrosoftCalendar
} from './microsoft-calendar-events';

// Type exports
export type { MicrosoftCalendarEvent } from './microsoft-calendar-client';
export type { MicrosoftTokens } from '@/lib/types';

// Extend the global NodeJS namespace to include Microsoft environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_MICROSOFT_CLIENT_ID: string;
      MICROSOFT_CLIENT_SECRET: string;
      NEXT_PUBLIC_MICROSOFT_REDIRECT_URI: string;
      MICROSOFT_TENANT_ID?: string;
    }
  }
}