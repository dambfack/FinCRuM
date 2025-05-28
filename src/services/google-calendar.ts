'use server';

import { google, calendar_v3, Auth } from 'googleapis';
import type { Task, Reminder, Appointment, GoogleTokens, AppointmentAttendee, ChecklistItem } from '@/lib/types';
import { DataItemType } from '@/lib/types';

type OAuth2Client = Auth.OAuth2Client;
type Credentials = Auth.Credentials;
type CalendarEvent = calendar_v3.Schema$Event;

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

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error("Google OAuth environment variables (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI) are not fully set.");
}

/**
 * Gets a new OAuth2 client instance
 */
export function getOAuth2Client(): OAuth2Client {
  const { OAuth2Client: Client } = require('google-auth-library');
  return new Client({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI
  });
}

/**
 * Gets the Google Calendar API client with the provided tokens
 */
export function getCalendarClient(tokens: GoogleTokens) {
  const client = getOAuth2Client();
  client.setCredentials(tokens);
  return google.calendar({ version: 'v3', auth: client });
}

export async function generateGoogleAuthUrl(scopes: string[] = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
]): Promise<string> {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

export async function exchangeCodeForTokens(code: string): Promise<Credentials> {
  const client = getOAuth2Client();
  try {
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token) {
      throw new Error('Failed to retrieve access token from Google.');
    }
    return tokens;
  } catch (error: any) {
    console.error('Error exchanging code for tokens:', error.response?.data || error.message);
    throw new Error(`Failed to exchange authorization code for tokens: ${error.message}`);
  }
}

/**
 * Gets an authenticated OAuth2 client, refreshing tokens if necessary
 */
async function getAuthenticatedClient(passedTokens: GoogleTokens): Promise<OAuth2Client> {
  const client = getOAuth2Client();
  client.setCredentials(passedTokens);

  // Check if token is expired or about to expire (within 1 minute)
  const isTokenExpired = passedTokens.expiry_date && passedTokens.expiry_date < Date.now() + 60000;
  
  if (isTokenExpired) {
    if (!passedTokens.refresh_token) {
      console.warn('Google Calendar access token expired, but no refresh token available. User needs to re-authenticate.');
      const error = new Error('Google Calendar access token expired and no refresh token is available. Please re-authenticate.');
      (error as any).statusCode = 401;
      throw error;
    }

    try {
      console.log('Google Calendar access token expired or expiring soon, attempting to refresh...');
      const { credentials } = await client.refreshAccessToken();
      
      // Update the tokens with the new credentials
      const updatedTokens: GoogleTokens = {
        ...passedTokens,
        access_token: credentials.access_token || undefined,
        expiry_date: credentials.expiry_date || undefined,
        // Keep the original refresh_token if a new one wasn't provided
        refresh_token: credentials.refresh_token || passedTokens.refresh_token
      };
      
      client.setCredentials(updatedTokens);
      console.log('Google Calendar access token refreshed successfully');
      
      // Return the updated tokens in the client for potential storage
      return client;
      
    } catch (error: any) {
      console.error('Error refreshing Google Calendar access token:', error.response?.data || error.message);
      const err = new Error(
        `Failed to refresh Google Calendar access token: ${error.message || 'Unknown error'}. Please re-authenticate.`
      );
      (err as any).statusCode = error.response?.status || 500;
      throw err;
    }
  }
  
  return client;
}


const mapToGoogleCalendarEvent = (
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment'
) => {
  let summary = '';
  let descriptionContent = item.description || '';
  let start: any;
  let end: any;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let attendees: { email: string, displayName?: string }[] = [];

  if (type === 'task') {
    const task = item as Task;
    summary = `Task: ${task.title}`;
    if (task.checklist && task.checklist.length > 0) {
      const checklistString = task.checklist.map(ci => `${ci.completed ? '[x]' : '[ ]'} ${ci.text}`).join('\n');
      descriptionContent += `\n\nChecklist:\n${checklistString}`;
    }
    if (task.dueDate) {
      const dueDateObj = new Date(task.dueDate as string);
      if (!isNaN(dueDateObj.getTime())) {
        start = { dateTime: dueDateObj.toISOString(), timeZone };
        end = { dateTime: new Date(dueDateObj.getTime() + 60 * 60 * 1000).toISOString(), timeZone }; // 1 hour duration for tasks
      }
    }
  } else if (type === 'reminder') {
    const reminder = item as Reminder;
    summary = `Reminder: ${reminder.title}`;
    const remindAtObj = new Date(reminder.dateTime as string);
    if (!isNaN(remindAtObj.getTime())) {
      start = { dateTime: remindAtObj.toISOString(), timeZone };
      end = { dateTime: new Date(remindAtObj.getTime() + 30 * 60 * 1000).toISOString(), timeZone }; // 30 min duration for reminders
    }
  } else if (type === 'appointment') {
    const appointment = item as Appointment;
    summary = appointment.title;
    if (appointment.start && appointment.end) {
        const startObj = new Date(appointment.start as string);
        const endObj = new Date(appointment.end as string);
        if (!isNaN(startObj.getTime()) && !isNaN(endObj.getTime())) {
        start = { dateTime: startObj.toISOString(), timeZone };
        end = { dateTime: endObj.toISOString(), timeZone };
        }
    } else if (appointment.date && appointment.time) {
        const appointmentDateTimeString = `${new Date(appointment.date as string).toISOString().split('T')[0]}T${appointment.time}:00`;
        const appointmentDateTime = new Date(appointmentDateTimeString);
        if (!isNaN(appointmentDateTime.getTime())) {
            start = { dateTime: appointmentDateTime.toISOString(), timeZone };
            // Default to 1 hour duration if only start is derived this way
            end = { dateTime: new Date(appointmentDateTime.getTime() + 60 * 60 * 1000).toISOString(), timeZone }; 
        }
    }
    if (appointment.attendeesList) {
        attendees = appointment.attendeesList
            .filter(att => att.email) 
            .map(att => ({ email: att.email, displayName: att.displayName }));
    }
  }

  if (!start || !end) {
    console.warn("Could not determine start/end for calendar event, using default.", item);
    const now = new Date();
    start = { dateTime: now.toISOString(), timeZone };
    end = { dateTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), timeZone };
    if (!summary) summary = "Untitled Event";
  }

  const eventRequest: any = {
    summary,
    description: descriptionContent.trim(),
    start,
    end,
    reminders: {
      useDefault: true,
    },
  };

  if (attendees.length > 0) {
    eventRequest.attendees = attendees;
  }

  return eventRequest;
};

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

/**
 * Lists events from the user's Google Calendar within the specified time range
 */
export async function listCalendarEvents(
  tokens: GoogleTokens,
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 250
): Promise<{ events: any[], newTokens?: GoogleTokens }> {
  try {
    // Get authenticated client (will refresh tokens if needed)
    const client = await getAuthenticatedClient(tokens);
    const calendar = google.calendar({ version: 'v3', auth: client });
    
    const listParams: any = {
      calendarId: 'primary',
      singleEvents: true, // Expand recurring events into instances
      orderBy: 'startTime',
      maxResults: Math.min(Math.max(1, maxResults), 2500), // Enforce API limits (1-2500)
      showDeleted: false, // Don't include deleted events
    };
    
    // Add time range filters if provided
    if (timeMin) listParams.timeMin = timeMin;
    if (timeMax) listParams.timeMax = timeMax;
    
    console.log('Listing Google Calendar events with params:', {
      timeMin: listParams.timeMin,
      timeMax: listParams.timeMax,
      maxResults: listParams.maxResults
    });
    
    const response = await calendar.events.list(listParams);
    
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
    
    const events = response.data.items || [];
    console.log(`Retrieved ${events.length} events from Google Calendar`);
    
    return { 
      events,
      newTokens 
    };
    
  } catch (error: any) {
    console.error('Error listing Google Calendar events:', {
      error: error.response?.data || error.message,
      timeMin,
      timeMax
    });
    
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
    const errorToThrow = new Error(`Failed to list Google Calendar events: ${errorMessage}`);
    
    // Preserve the original error status code if available
    if (error.response?.status) {
      (errorToThrow as any).statusCode = error.response.status;
    }
    
    throw errorToThrow;
  }
}
