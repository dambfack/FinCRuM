import { google } from 'googleapis';
import type { Task, Reminder, Appointment, GoogleTokens } from '@/lib/types';
import { getAuthenticatedClient } from './google-oauth';
import { mapToGoogleCalendarEvent } from './google-calendar-mapper';

/**
 * Creates a new event in the user's Google Calendar
 */
export async function createCalendarEvent(
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment',
  tokens: GoogleTokens
): Promise<{ event: any, newTokens?: GoogleTokens }> {
  try {
    // Get authenticated client (will refresh tokens if needed)
    const client = await getAuthenticatedClient(tokens);
    const calendar = google.calendar({ version: 'v3', auth: client });
    
    // Convert our internal event format to Google Calendar event format
    const event = mapToGoogleCalendarEvent(item, type);

    console.log(`Creating ${type} in Google Calendar:`, event.summary);
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: type === 'appointment' ? 1 : 0, // Only create meeting for appointments
      sendUpdates: 'all', // Notify attendees of the new event
    });

    // Extract new tokens if they were refreshed
    const credentials = client.credentials;
    const newTokens: GoogleTokens | undefined = credentials.access_token 
      ? {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || tokens.refresh_token, // Keep existing refresh token if not provided
          expiry_date: credentials.expiry_date,
          token_type: credentials.token_type,
          scope: credentials.scope,
        }
      : undefined;

    console.log(`Successfully created ${type} in Google Calendar:`, response.data.id);
    
    return {
      event: response.data,
      newTokens
    };
    
  } catch (error: any) {
    console.error('Error creating Google Calendar event:', {
      error: error.response?.data || error.message,
      type,
      itemId: item.id,
      itemTitle: 'title' in item ? item.title : 'reminder'
    });
    
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
    const errorToThrow = new Error(`Failed to create Google Calendar event: ${errorMessage}`);
    
    // Preserve the original error status code if available
    if (error.response?.status) {
      (errorToThrow as any).statusCode = error.response.status;
    }
    
    throw errorToThrow;
  }
}

/**
 * Updates an existing event in the user's Google Calendar
 */
export async function updateCalendarEvent(
  eventId: string,
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment',
  tokens: GoogleTokens
): Promise<{ event: any, newTokens?: GoogleTokens }> {
  try {
    // Get authenticated client (will refresh tokens if needed)
    const client = await getAuthenticatedClient(tokens);
    const calendar = google.calendar({ version: 'v3', auth: client });
    
    // Convert our internal event format to Google Calendar event format
    const event = mapToGoogleCalendarEvent(item, type);
    
    console.log(`Updating ${type} in Google Calendar (${eventId}):`, event.summary);
    
    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: event,
      conferenceDataVersion: type === 'appointment' ? 1 : 0,
      sendUpdates: 'all', // Notify attendees of the update
    });

    // Extract new tokens if they were refreshed
    const credentials = client.credentials;
    const newTokens: GoogleTokens | undefined = credentials.access_token 
      ? {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || tokens.refresh_token,
          expiry_date: credentials.expiry_date,
          token_type: credentials.token_type,
          scope: credentials.scope,
        }
      : undefined;

    console.log(`Successfully updated ${type} in Google Calendar:`, eventId);
    
    return {
      event: response.data,
      newTokens
    };
    
  } catch (error: any) {
    console.error('Error updating Google Calendar event:', {
      error: error.response?.data || error.message,
      eventId,
      type,
      itemId: item.id
    });
    
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
    const errorToThrow = new Error(`Failed to update Google Calendar event: ${errorMessage}`);
    
    // Preserve the original error status code if available
    if (error.response?.status) {
      (errorToThrow as any).statusCode = error.response.status;
    }
    
    throw errorToThrow;
  }
}

/**
 * Deletes an event from the user's Google Calendar
 */
export async function deleteCalendarEvent(
  eventId: string, 
  tokens: GoogleTokens
): Promise<{ success: boolean, newTokens?: GoogleTokens }> {
  try {
    // Get authenticated client (will refresh tokens if needed)
    const client = await getAuthenticatedClient(tokens);
    const calendar = google.calendar({ version: 'v3', auth: client });
    
    console.log(`Deleting event from Google Calendar:`, eventId);
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
      sendUpdates: 'all', // Notify attendees that the event was cancelled
    });

    // Extract new tokens if they were refreshed
    const credentials = client.credentials;
    const newTokens: GoogleTokens | undefined = credentials.access_token 
      ? {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || tokens.refresh_token,
          expiry_date: credentials.expiry_date,
          token_type: credentials.token_type,
          scope: credentials.scope,
        }
      : undefined;

    console.log(`Successfully deleted event from Google Calendar:`, eventId);
    
    return { 
      success: true, 
      newTokens 
    };
    
  } catch (error: any) {
    // Handle 404 (Not Found) as a success case since the event is already deleted
    if (error.response?.status === 404) {
      console.log(`Event ${eventId} not found in Google Calendar (may have been already deleted)`);
      return { success: true };
    }
    
    console.error('Error deleting Google Calendar event:', {
      error: error.response?.data || error.message,
      eventId
    });
    
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
    const errorToThrow = new Error(`Failed to delete Google Calendar event: ${errorMessage}`);
    
    // Preserve the original error status code if available
    if (error.response?.status) {
      (errorToThrow as any).statusCode = error.response.status;
    }
    
    throw errorToThrow;
  }
}