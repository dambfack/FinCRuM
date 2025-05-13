'use server';

import { google } from 'googleapis';
import type { OAuth2Client, Credentials } from 'google-auth-library'; // Import type

import type { Task, Reminder, Appointment } from '@/lib/types';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

// Store oAuth2Client in a way that it's initialized once per server instance if possible,
// or recreate as needed. For 'use server' modules, top-level variables are fine.
let oAuth2ClientInstance: OAuth2Client | null = null;

function getOAuth2Client(): OAuth2Client {
  if (!oAuth2ClientInstance) {
    // Dynamically import OAuth2Client only when needed on the server
    const { OAuth2Client: Client } = require('google-auth-library');
    oAuth2ClientInstance = new Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  }
  return oAuth2ClientInstance;
}

// Function to generate authentication URL
export const generateAuthUrl = async () => {
  const client = getOAuth2Client();
  const scopes = ['https://www.googleapis.com/auth/calendar'];
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent screen to ensure refresh token is sent
  });
};

// Function to get tokens after authorization
export const getTokens = async (code: string): Promise<Credentials> => {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  // Store tokens securely (e.g., in session, database, or httpOnly cookie)
  // For this example, we're just returning them.
  // It's crucial that refresh_token is present if you want long-term access.
  if (!tokens.refresh_token) {
    console.warn('Refresh token not received. User may need to re-authenticate periodically.');
  }
  return tokens;
};

// Function to set credentials (use stored tokens)
export const setCredentials = async (tokens: Credentials | null) => {
  const client = getOAuth2Client();
  if (tokens) {
    client.setCredentials(tokens);
    // Attempt to refresh if access token is expired (optional, Google client library might handle this)
    // This is a simplified check; the library often handles refreshing automatically if a refresh token is present.
    if (tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
      try {
        console.log('Access token expired, attempting to refresh...');
        const { credentials } = await client.refreshAccessToken();
        client.setCredentials(credentials);
        console.log('Access token refreshed.');
        // Optionally, notify the client to update stored tokens if they've changed
        return credentials; // Return new tokens
      } catch (error) {
        console.error('Error refreshing access token:', error);
        // If refresh fails, the user might need to re-authenticate.
        // Clear credentials or handle appropriately.
        client.setCredentials(null); // Clear invalid credentials
        throw new Error('Failed to refresh access token. Please re-authenticate.');
      }
    }
  } else {
    client.setCredentials(null); // Clear credentials if null is passed
  }
  return client.credentials; // Return current credentials
};


// Helper function to create a Google Calendar event from app data
const mapToGoogleCalendarEvent = (
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment'
) => {
  let summary = '';
  let description = item.description || ''; // Ensure description is always a string
  let start: any; // googleapis.calendar_v3.Schema$EventDateTime
  let end: any; // googleapis.calendar_v3.Schema$EventDateTime
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (type === 'task') {
    const task = item as Task;
    summary = task.title;
    if (task.dueDate) {
      const dueDateObj = new Date(task.dueDate);
      if (!isNaN(dueDateObj.getTime())) {
        const dueDateString = typeof task.dueDate === 'string' ? task.dueDate : task.dueDate.toISOString();
        if (dueDateString.length === 10 || (dueDateString.includes('T00:00:00.000Z') && dueDateObj.getUTCHours() === 0 && dueDateObj.getUTCMinutes() === 0)) { // YYYY-MM-DD or Date obj representing midnight UTC
           start = { date: dueDateString.split('T')[0] };
           const endDate = new Date(dueDateObj);
           endDate.setDate(dueDateObj.getDate() + 1);
           end = { date: endDate.toISOString().split('T')[0] };
        } else {
          start = { dateTime: dueDateObj.toISOString(), timeZone };
          end = { dateTime: new Date(dueDateObj.getTime() + 60 * 60 * 1000).toISOString(), timeZone }; // Default 1 hour duration
        }
      }
    }
  } else if (type === 'reminder') {
    const reminder = item as Reminder;
    summary = reminder.title;
    const remindAtObj = new Date(reminder.remindAt);
    if (!isNaN(remindAtObj.getTime())) {
      start = { dateTime: remindAtObj.toISOString(), timeZone };
      end = { dateTime: new Date(remindAtObj.getTime() + 30 * 60 * 1000).toISOString(), timeZone }; // Default 30 mins
    }
  } else if (type === 'appointment') {
    const appointment = item as Appointment;
    summary = appointment.title;
    const startObj = new Date(appointment.start);
    const endObj = new Date(appointment.end);
    if (!isNaN(startObj.getTime()) && !isNaN(endObj.getTime())) {
      start = { dateTime: startObj.toISOString(), timeZone };
      end = { dateTime: endObj.toISOString(), timeZone };
    }
  }

  if (!start || !end) {
    const now = new Date();
    start = { dateTime: now.toISOString(), timeZone };
    end = { dateTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), timeZone };
    if (!summary) summary = "Untitled Event";
  }

  return {
    summary,
    description,
    start,
    end,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 10 },
      ],
    },
  };
};


// Function to create an event in Google Calendar
export const createCalendarEvent = async (
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment'
) => {
  const client = getOAuth2Client();
  if (!client.credentials || !client.credentials.access_token) {
    console.error('Google Calendar: No access token. Please authenticate.');
    // Potentially try to use a stored refresh token here if available and not handled by setCredentials
    throw new Error('Authentication required for Google Calendar.');
  }
  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const event = mapToGoogleCalendarEvent(item, type);
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
    return res.data;
  } catch (error: any) {
    console.error('Error creating Google Calendar event:', error.message);
    if (error.code === 401) { // Unauthorized
        // Clear potentially stale tokens if refresh fails or isn't attempted by client lib
        // await setCredentials(null); // This might cause issues if called from client without proper refresh token handling
        throw new Error('Google Calendar authentication failed. Please re-authenticate.');
    }
    throw error;
  }
};

// Function to update an event in Google Calendar
export const updateCalendarEvent = async (
  eventId: string,
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment'
) => {
  const client = getOAuth2Client();
  if (!client.credentials || !client.credentials.access_token) {
    console.error('Google Calendar: No access token. Please authenticate.');
    throw new Error('Authentication required for Google Calendar.');
  }
  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const event = mapToGoogleCalendarEvent(item, type);
    const res = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: event,
    });
    return res.data;
  } catch (error: any) {
    console.error('Error updating Google Calendar event:', error.message);
    if (error.code === 401) {
        throw new Error('Google Calendar authentication failed. Please re-authenticate.');
    }
    throw error;
  }
};

// Function to delete an event from Google Calendar
export const deleteCalendarEvent = async (eventId: string) => {
  const client = getOAuth2Client();
   if (!client.credentials || !client.credentials.access_token) {
    console.error('Google Calendar: No access token. Please authenticate.');
    throw new Error('Authentication required for Google Calendar.');
  }
  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
    return true;
  } catch (error: any) {
    console.error('Error deleting Google Calendar event:', error.message);
     if (error.code === 401) {
        throw new Error('Google Calendar authentication failed. Please re-authenticate.');
    }
    throw error;
  }
};

// Function to fetch events from Google Calendar
export const listCalendarEvents = async (
  timeMin?: string, // Optional: ISO string
  timeMax?: string  // Optional: ISO string
) => {
  const client = getOAuth2Client();
  if (!client.credentials || !client.credentials.access_token) {
    console.error('Google Calendar: No access token. Please authenticate.');
    throw new Error('Authentication required for Google Calendar.');
  }
    try {
        const calendar = google.calendar({ version: 'v3', auth: client });
        const listParams: any = { // googleapis.calendar_v3.Params$Resource$Events$List
            calendarId: 'primary',
            singleEvents: true,
            orderBy: 'startTime',
        };
        if (timeMin) listParams.timeMin = timeMin;
        if (timeMax) listParams.timeMax = timeMax;

        const res = await calendar.events.list(listParams);
        return res.data.items;
    } catch (error: any) {
        console.error('Error listing Google Calendar events:', error.message);
        if (error.code === 401) {
            throw new Error('Google Calendar authentication failed. Please re-authenticate.');
        }
        throw error;
    }
};


// Functions for specific item types, wrapping generic ones
export const addReminderToGoogleCalendar = async (reminder: Reminder) => {
    return createCalendarEvent(reminder, 'reminder');
};

export const updateReminderInGoogleCalendar = async (reminder: Reminder) => {
    if (!reminder.googleCalendarEventId) {
        // If no ID, create it instead of trying to update.
        // This handles cases where sync might have failed previously.
        console.warn("Reminder does not have a Google Calendar event ID. Creating new event.");
        const newEvent = await createCalendarEvent(reminder, 'reminder');
        // The calling function should handle updating the local reminder with the new ID.
        return newEvent;
    }
    return updateCalendarEvent(reminder.googleCalendarEventId, reminder, 'reminder');
};

export const syncWithGoogleCalendar = async (appointments: Appointment[]) => {
    console.warn("Full syncWithGoogleCalendar is not implemented. Individual operations are available.");
    const results = [];
    for (const appt of appointments) {
        try {
            if (appt.googleCalendarEventId) {
                results.push(await updateCalendarEvent(appt.googleCalendarEventId, appt, 'appointment'));
            } else {
                const newEvent = await createCalendarEvent(appt, 'appointment');
                // The calling function should handle updating the local appointment with newEvent.id here
                console.log("Created new event:", newEvent?.id);
                results.push(newEvent);
            }
        } catch (error) {
            console.error(`Error syncing appointment ${appt.title} with Google Calendar:`, error);
            // Continue syncing other appointments
        }
    }
    return results;
};

// Function to create a Google Calendar event for an Appointment
export const createGoogleCalendarEvent = async (appointment: Appointment) => {
    return createCalendarEvent(appointment, 'appointment');
};

// Function to update a Google Calendar event for an Appointment
export const updateGoogleCalendarEvent = async (appointment: Appointment) => {
    if (!appointment.googleCalendarEventId) {
        console.warn("Appointment does not have a Google Calendar event ID. Creating new event.");
        const newEvent = await createCalendarEvent(appointment, 'appointment');
        return newEvent;
    }
    return updateCalendarEvent(appointment.googleCalendarEventId, appointment, 'appointment');
};
