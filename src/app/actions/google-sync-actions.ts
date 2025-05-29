'use server';

import {
  deleteCalendarEvent,
  listCalendarEvents
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

export async function listCalendarEventsAction(
  tokens: GoogleTokens,
  timeMin?: string,
  timeMax?: string
): Promise<{ success: boolean; events?: any[]; newTokens?: GoogleTokens; error?: string }> {
  try {
    const result = await listCalendarEvents(tokens, timeMin, timeMax);
    return { success: true, events: result.events, newTokens: result.newTokens };
  } catch (error) {
    console.error('Error in listCalendarEventsAction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}