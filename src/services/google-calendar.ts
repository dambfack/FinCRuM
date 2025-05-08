import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import {
  Task,
  Reminder,
  Appointment,
  CalendarEventStatus,
} from './types'; // Assuming types.ts is in the same directory

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET; // Keep server-side
const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Function to generate authentication URL
export const generateAuthUrl = () => {
  const scopes = ['https://www.googleapis.com/auth/calendar'];
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Ensure refresh token is obtained
  });
};

// Function to get tokens after authorization
export const getTokens = async (code: string) => {
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  return tokens;
};

// Function to set credentials (use stored tokens)
export const setCredentials = (tokens: any) => {
  oAuth2Client.setCredentials(tokens);
};

// Helper function to create a Google Calendar event from app data
const createGoogleCalendarEvent = (
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment'
) => {
  let summary = '';
  let description = '';
  let start: any;
  let end: any;

  if (type === 'task') {
    const task = item as Task;
    summary = task.title;
    description = task.description || '';
    // Tasks in Google Calendar can be all-day events or have specific times
    if (task.dueDate) {
      if (task.dueTime) {
        const [hours, minutes] = task.dueTime.split(':').map(Number);
        const date = new Date(task.dueDate);
        date.setHours(hours, minutes, 0, 0);
        start = { dateTime: date.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
        end = { dateTime: new Date(date.getTime() + 60 * 60 * 1000).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }; // Default to 1 hour duration
      } else {
        start = { date: task.dueDate };
        end = { date: new Date(new Date(task.dueDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] };
      }
    } else {
        // If no due date, create an event for today or a placeholder
         start = { date: new Date().toISOString().split('T')[0] };
         end = { date: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] };
    }

  } else if (type === 'reminder') {
    const reminder = item as Reminder;
    summary = reminder.title;
    description = reminder.description || '';
    // Reminders in Google Calendar are time-based events
     if (reminder.dateTime) {
        start = { dateTime: new Date(reminder.dateTime).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
        end = { dateTime: new Date(new Date(reminder.dateTime).getTime() + 30 * 60 * 1000).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }; // Default to 30 minutes duration
     } else {
        // If no date/time, create an event for now
         start = { dateTime: new Date().toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
         end = { dateTime: new Date(new Date().getTime() + 30 * 60 * 1000).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
     }


  } else if (type === 'appointment') {
    const appointment = item as Appointment;
    summary = appointment.title;
    description = appointment.description || '';
     if (appointment.start && appointment.end) {
        start = { dateTime: new Date(appointment.start).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
        end = { dateTime: new Date(appointment.end).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
     } else {
        // If no start/end time, create an event for now
         start = { dateTime: new Date().toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
         end = { dateTime: new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
     }
  } else {
    throw new Error('Invalid item type for Google Calendar event');
  }

  return {
    summary: summary,
    description: description,
    start: start,
    end: end,
    reminders: {
        useDefault: false,
        overrides: [
            { method: 'email', minutes: 24 * 60 },
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
  try {
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const event = createGoogleCalendarEvent(item, type);
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
    return res.data;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw error;
  }
};

// Function to update an event in Google Calendar
export const updateCalendarEvent = async (
  eventId: string,
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment'
) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    const event = createGoogleCalendarEvent(item, type);
    const res = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: event,
    });
    return res.data;
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    throw error;
  }
};

// Function to delete an event from Google Calendar
export const deleteCalendarEvent = async (eventId: string) => {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
    return true;
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    throw error;
  }
};

// Function to fetch events from Google Calendar (optional, for syncing)
export const listCalendarEvents = async (
  timeMin: string,
  timeMax: string
) => {
    try {
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        const res = await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin,
            timeMax: timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return res.data.items;
    } catch (error) {
        console.error('Error listing Google Calendar events:', error);
        throw error;
    }
};