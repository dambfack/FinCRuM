
'use server';

import { google } from 'googleapis';
import type { Credentials } from 'google-auth-library';
import type { Task, Reminder, Appointment, GoogleTokens, AppointmentAttendee } from '@/lib/types'; // Added AppointmentAttendee
import { DataItemType } from '@/lib/types';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error("Google OAuth environment variables (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI) are not fully set.");
}

function getOAuth2Client() {
  const { OAuth2Client: Client } = require('google-auth-library');
  return new Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export async function generateGoogleAuthUrl(): Promise<string> {
  const client = getOAuth2Client();
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive.file' // For Google Drive backup/sync
  ];
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

async function getAuthenticatedClient(passedTokens: GoogleTokens): Promise<import('google-auth-library').OAuth2Client> {
  const client = getOAuth2Client();
  client.setCredentials(passedTokens);

  if (passedTokens.expiry_date && passedTokens.expiry_date < Date.now() + 60000) {
    if (passedTokens.refresh_token) {
      try {
        console.log('Google Calendar access token expired or expiring soon, attempting to refresh...');
        const { credentials } = await client.refreshAccessToken();
        client.setCredentials(credentials);
        console.log('Google Calendar access token refreshed.');
      } catch (refreshError: any) {
        console.error('Error refreshing Google Calendar access token:', refreshError.response?.data || refreshError.message, 'Status Code:', refreshError.response?.status);
        const err = new Error(`Failed to refresh Google Calendar access token. Please re-authenticate. Details: ${refreshError.message}`);
        (err as any).statusCode = refreshError.response?.status || 500;
        throw err;
      }
    } else {
      console.warn('Google Calendar access token expired, but no refresh token available. User may need to re-authenticate.');
      const err = new Error('Google Calendar access token expired and no refresh token is available. Please re-authenticate.');
      (err as any).statusCode = 401;
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
  let description = item.description || '';
  let start: any;
  let end: any;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let attendees: { email: string, displayName?: string }[] = [];

  if (type === 'task') {
    const task = item as Task;
    summary = `Task: ${task.title}`;
    if (task.dueDate) {
      const dueDateObj = new Date(task.dueDate);
      if (!isNaN(dueDateObj.getTime())) {
        start = { dateTime: dueDateObj.toISOString(), timeZone };
        end = { dateTime: new Date(dueDateObj.getTime() + 60 * 60 * 1000).toISOString(), timeZone };
      }
    }
  } else if (type === 'reminder') {
    const reminder = item as Reminder;
    summary = `Reminder: ${reminder.title}`;
    const remindAtObj = new Date(reminder.dateTime);
    if (!isNaN(remindAtObj.getTime())) {
      start = { dateTime: remindAtObj.toISOString(), timeZone };
      end = { dateTime: new Date(remindAtObj.getTime() + 30 * 60 * 1000).toISOString(), timeZone };
    }
  } else if (type === 'appointment') {
    const appointment = item as Appointment;
    summary = appointment.title;
    if (appointment.start && appointment.end) {
        const startObj = new Date(appointment.start);
        const endObj = new Date(appointment.end);
        if (!isNaN(startObj.getTime()) && !isNaN(endObj.getTime())) {
        start = { dateTime: startObj.toISOString(), timeZone };
        end = { dateTime: endObj.toISOString(), timeZone };
        }
    } else if (appointment.date && appointment.time) {
        const appointmentDateTimeString = `${new Date(appointment.date).toISOString().split('T')[0]}T${appointment.time}:00`;
        const appointmentDateTime = new Date(appointmentDateTimeString);
        if (!isNaN(appointmentDateTime.getTime())) {
            start = { dateTime: appointmentDateTime.toISOString(), timeZone };
            end = { dateTime: new Date(appointmentDateTime.getTime() + 60 * 60 * 1000).toISOString(), timeZone };
        }
    }
    // Map attendeesList for Google Calendar
    if (appointment.attendeesList) {
        attendees = appointment.attendeesList
            .filter(att => att.email) // Ensure email exists
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
    description,
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

export async function createCalendarEvent(
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment',
  tokens: GoogleTokens
): Promise<{ event: any, newTokens?: Credentials }> {
  const client = await getAuthenticatedClient(tokens);
  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const event = mapToGoogleCalendarEvent(item, type);
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendNotifications: true, // Send notifications to attendees
    });
    return { event: res.data, newTokens: client.credentials };
  } catch (error: any) {
    console.error('Error creating Google Calendar event:', error.response?.data || error.message);
    if (error.message.includes('re-authenticate') || (error as any).statusCode === 401 || (error as any).statusCode === 403) throw error;
    const newError = new Error(`Failed to create Google Calendar event: ${error.message}`);
    (newError as any).statusCode = (error as any).statusCode || error.response?.status || 500;
    throw newError;
  }
}

export async function updateCalendarEvent(
  eventId: string,
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment',
  tokens: GoogleTokens
): Promise<{ event: any, newTokens?: Credentials }> {
  const client = await getAuthenticatedClient(tokens);
  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const event = mapToGoogleCalendarEvent(item, type);
    const res = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: event,
      sendNotifications: true, // Send notifications to attendees
    });
    return { event: res.data, newTokens: client.credentials };
  } catch (error: any) {
    console.error('Error updating Google Calendar event:', error.response?.data || error.message);
    if (error.message.includes('re-authenticate') || (error as any).statusCode === 401 || (error as any).statusCode === 403) throw error;
    const newError = new Error(`Failed to update Google Calendar event: ${error.message}`);
    (newError as any).statusCode = (error as any).statusCode || error.response?.status || 500;
    throw newError;
  }
}

export async function deleteCalendarEvent(eventId: string, tokens: GoogleTokens): Promise<{ success: boolean, newTokens?: Credentials }> {
  const client = await getAuthenticatedClient(tokens);
  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
      sendNotifications: true, // Send notifications to attendees
    });
    return { success: true, newTokens: client.credentials };
  } catch (error: any) {
    console.error('Error deleting Google Calendar event:', error.response?.data || error.message);
    if (error.message.includes('re-authenticate') || (error as any).statusCode === 401 || (error as any).statusCode === 403) throw error;
    const newError = new Error(`Failed to delete Google Calendar event: ${error.message}`);
    (newError as any).statusCode = (error as any).statusCode || error.response?.status || 500;
    throw newError;
  }
}

export async function listCalendarEvents(
  tokens: GoogleTokens,
  timeMin?: string,
  timeMax?: string
): Promise<{ events: any[], newTokens?: Credentials }> {
  const client = await getAuthenticatedClient(tokens);
  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const listParams: any = {
      calendarId: 'primary',
      singleEvents: true,
      orderBy: 'startTime',
    };
    if (timeMin) listParams.timeMin = timeMin;
    if (timeMax) listParams.timeMax = timeMax;

    const res = await calendar.events.list(listParams);
    return { events: res.data.items || [], newTokens: client.credentials };
  } catch (error: any) {
    console.error('Error listing Google Calendar events:', error.response?.data || error.message);
    if (error.message.includes('re-authenticate') || (error as any).statusCode === 401 || (error as any).statusCode === 403) throw error;
    const newError = new Error(`Failed to list Google Calendar events: ${error.message}`);
    (newError as any).statusCode = (error as any).statusCode || error.response?.status || 500;
    throw newError;
  }
}
