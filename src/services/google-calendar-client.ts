import { google } from 'googleapis';
import type { GoogleTokens } from '@/lib/types';
import { getOAuth2Client } from './google-oauth';

/**
 * Gets the Google Calendar API client with the provided tokens
 */
export async function getCalendarClient(tokens: GoogleTokens) {
  const client = await getOAuth2Client();
  client.setCredentials(tokens);
  return google.calendar({ version: 'v3', auth: client });
}