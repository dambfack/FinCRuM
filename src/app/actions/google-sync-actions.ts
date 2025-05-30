'use server';

import {
  deleteCalendarEvent
} from '@/services/google-calendar';
import { GoogleTokens } from '@/lib/types';

export async function deleteCalendarEventAction(
  eventId: string,
  tokens: GoogleTokens
): Promise<{ success: boolean; newTokens?: GoogleTokens; error?: string }> {
  try {
    const result = await deleteCalendarEvent(eventId, tokens);
    return { success: true, newTokens: result.newTokens };
  } catch (error) {
    console.error('Error in deleteCalendarEventAction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Note: listCalendarEventsAction removed as listCalendarEvents function is not implemented