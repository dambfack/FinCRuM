'use server';

import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/services/google-calendar';
import type { Task, Reminder, Appointment, GoogleTokens } from '@/lib/types';

/**
 * Server action to create a calendar event
 */
export async function createCalendarEventAction(
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment',
  tokens: GoogleTokens
) {
  try {
    const result = await createCalendarEvent(item, type, tokens);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error in createCalendarEventAction:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create calendar event'
    };
  }
}

/**
 * Server action to update a calendar event
 */
export async function updateCalendarEventAction(
  eventId: string,
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment',
  tokens: GoogleTokens
) {
  try {
    const result = await updateCalendarEvent(eventId, item, type, tokens);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error in updateCalendarEventAction:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update calendar event'
    };
  }
}

/**
 * Server action to delete a calendar event
 */
export async function deleteCalendarEventAction(
  eventId: string,
  tokens: GoogleTokens
) {
  try {
    const result = await deleteCalendarEvent(eventId, tokens);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error in deleteCalendarEventAction:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to delete calendar event'
    };
  }
}