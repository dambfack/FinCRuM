// Removed direct import of googleapis to avoid client-side bundling issues
import type { Reminder, Appointment, GoogleTokens } from '@/lib/types';
import { getAuthenticatedClient } from './google-oauth';
import { mapToGoogleCalendarEvent } from './google-calendar-mapper';

/**
 * Creates a new event in the user's Google Calendar
 */
export async function createCalendarEvent(
  item: Reminder | Appointment,
  type: 'reminder' | 'appointment',
  tokens: GoogleTokens
): Promise<{ event: any, newTokens?: GoogleTokens }> {
  try {
    // Get authenticated client (will refresh tokens if needed)
    const client = await getAuthenticatedClient(tokens);
    const { google } = await import('googleapis');
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
    console.error(`Error creating ${type} in Google Calendar:`, error);
    
    const errorToThrow = new Error(`Failed to create ${type} in Google Calendar: ${error.message}`);
    
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
  item: Reminder | Appointment,
  type: 'reminder' | 'appointment',
  tokens: GoogleTokens
): Promise<{ event: any, newTokens?: GoogleTokens }> {
  try {
    // Get authenticated client (will refresh tokens if needed)
    const client = await getAuthenticatedClient(tokens);
    const { google } = await import('googleapis');
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

    console.log(`Successfully updated ${type} in Google Calendar:`, response.data.id);
    
    return {
      event: response.data,
      newTokens
    };
    
  } catch (error: any) {
    console.error(`Error updating ${type} in Google Calendar:`, error);
    
    const errorToThrow = new Error(`Failed to update ${type} in Google Calendar: ${error.message}`);
    
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
    const { google } = await import('googleapis');
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
    console.error('Error deleting event from Google Calendar:', error);
    
    const errorToThrow = new Error(`Failed to delete event from Google Calendar: ${error.message}`);
    
    if (error.response?.status) {
      (errorToThrow as any).statusCode = error.response.status;
    }
    
    throw errorToThrow;
  }
}

/**
 * Lists calendar events from Google Calendar
 */
export async function listCalendarEvents(
  tokens: GoogleTokens,
  timeMin?: string,
  timeMax?: string
): Promise<{ events: any[], newTokens?: GoogleTokens }> {
  try {
    // Get authenticated client (will refresh tokens if needed)
    const client = await getAuthenticatedClient(tokens);
    const { google } = await import('googleapis');
    const calendar = google.calendar({ version: 'v3', auth: client });
    
    // Set default time range if not provided
    const now = new Date();
    const defaultTimeMin = timeMin || now.toISOString();
    const defaultTimeMax = timeMax || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log(`Listing calendar events from ${defaultTimeMin} to ${defaultTimeMax}`);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: defaultTimeMin,
      timeMax: defaultTimeMax,
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime',
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

    console.log(`Successfully listed ${response.data.items?.length || 0} calendar events`);
    
    return {
      events: response.data.items || [],
      newTokens
    };
    
  } catch (error: any) {
    console.error('Error listing calendar events:', error);
    
    const errorToThrow = new Error(`Failed to list calendar events: ${error.message}`);
    
    if (error.response?.status) {
      (errorToThrow as any).statusCode = error.response.status;
    }
    
    throw errorToThrow;
  }
}