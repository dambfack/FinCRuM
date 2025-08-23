// Removed direct import of googleapis to avoid client-side bundling issues
import type { GoogleTokens } from '@/lib/types';
import { getOAuth2Client } from './google-oauth';

/**
 * Gets the Google Calendar API client with the provided tokens
 */
export async function getCalendarClient(tokens: GoogleTokens) {
  const client = await getOAuth2Client();
  client.setCredentials(tokens);
  const { google } = await import('googleapis');
  return google.calendar({ version: 'v3', auth: client });
}