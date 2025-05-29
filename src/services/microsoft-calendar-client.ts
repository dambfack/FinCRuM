import type { MicrosoftTokens } from '@/lib/types';
import { makeAuthenticatedRequest } from './microsoft-oauth';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

/**
 * Microsoft Graph Calendar Event interface
 */
export interface MicrosoftCalendarEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: 'HTML' | 'Text';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type: 'required' | 'optional' | 'resource';
  }>;
  isAllDay?: boolean;
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
  categories?: string[];
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: 'teamsForBusiness' | 'skypeForBusiness' | 'skypeForConsumer';
}

/**
 * Creates a new event in Microsoft Outlook Calendar
 */
export async function createMicrosoftCalendarEvent(
  event: MicrosoftCalendarEvent,
  tokens: MicrosoftTokens
): Promise<{ event: MicrosoftCalendarEvent, newTokens?: MicrosoftTokens }> {
  const url = `${GRAPH_BASE_URL}/me/events`;
  
  try {
    const { response, newTokens } = await makeAuthenticatedRequest(url, tokens, {
      method: 'POST',
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Failed to create Microsoft Calendar event:', errorData);
      throw new Error(`Failed to create calendar event: ${response.statusText}`);
    }

    const createdEvent = await response.json();
    console.log('Successfully created Microsoft Calendar event:', createdEvent.id);
    
    return {
      event: createdEvent,
      newTokens
    };
    
  } catch (error: any) {
    console.error('Error creating Microsoft Calendar event:', error);
    throw new Error(`Failed to create calendar event: ${error.message}`);
  }
}

/**
 * Updates an existing event in Microsoft Outlook Calendar
 */
export async function updateMicrosoftCalendarEvent(
  eventId: string,
  event: Partial<MicrosoftCalendarEvent>,
  tokens: MicrosoftTokens
): Promise<{ event: MicrosoftCalendarEvent, newTokens?: MicrosoftTokens }> {
  const url = `${GRAPH_BASE_URL}/me/events/${eventId}`;
  
  try {
    const { response, newTokens } = await makeAuthenticatedRequest(url, tokens, {
      method: 'PATCH',
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Failed to update Microsoft Calendar event:', errorData);
      throw new Error(`Failed to update calendar event: ${response.statusText}`);
    }

    const updatedEvent = await response.json();
    console.log('Successfully updated Microsoft Calendar event:', updatedEvent.id);
    
    return {
      event: updatedEvent,
      newTokens
    };
    
  } catch (error: any) {
    console.error('Error updating Microsoft Calendar event:', error);
    throw new Error(`Failed to update calendar event: ${error.message}`);
  }
}

/**
 * Deletes an event from Microsoft Outlook Calendar
 */
export async function deleteMicrosoftCalendarEvent(
  eventId: string,
  tokens: MicrosoftTokens
): Promise<{ success: boolean, newTokens?: MicrosoftTokens }> {
  const url = `${GRAPH_BASE_URL}/me/events/${eventId}`;
  
  try {
    const { response, newTokens } = await makeAuthenticatedRequest(url, tokens, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Failed to delete Microsoft Calendar event:', errorData);
      throw new Error(`Failed to delete calendar event: ${response.statusText}`);
    }

    console.log('Successfully deleted Microsoft Calendar event:', eventId);
    
    return {
      success: true,
      newTokens
    };
    
  } catch (error: any) {
    console.error('Error deleting Microsoft Calendar event:', error);
    throw new Error(`Failed to delete calendar event: ${error.message}`);
  }
}

/**
 * Gets events from Microsoft Outlook Calendar
 */
export async function getMicrosoftCalendarEvents(
  tokens: MicrosoftTokens,
  startTime?: string,
  endTime?: string,
  maxResults: number = 50
): Promise<{ events: MicrosoftCalendarEvent[], newTokens?: MicrosoftTokens }> {
  let url = `${GRAPH_BASE_URL}/me/events?$top=${maxResults}&$orderby=start/dateTime`;
  
  // Add time filters if provided
  const filters: string[] = [];
  if (startTime) {
    filters.push(`start/dateTime ge '${startTime}'`);
  }
  if (endTime) {
    filters.push(`end/dateTime le '${endTime}'`);
  }
  
  if (filters.length > 0) {
    url += `&$filter=${filters.join(' and ')}`;
  }
  
  try {
    const { response, newTokens } = await makeAuthenticatedRequest(url, tokens);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Failed to get Microsoft Calendar events:', errorData);
      throw new Error(`Failed to get calendar events: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Successfully retrieved ${data.value.length} Microsoft Calendar events`);
    
    return {
      events: data.value,
      newTokens
    };
    
  } catch (error: any) {
    console.error('Error getting Microsoft Calendar events:', error);
    throw new Error(`Failed to get calendar events: ${error.message}`);
  }
}

/**
 * Searches for existing events by subject to prevent duplicates
 */
export async function findMicrosoftCalendarEventBySubject(
  subject: string,
  tokens: MicrosoftTokens,
  startTime?: string,
  endTime?: string
): Promise<{ event: MicrosoftCalendarEvent | null, newTokens?: MicrosoftTokens }> {
  let url = `${GRAPH_BASE_URL}/me/events?$filter=subject eq '${encodeURIComponent(subject)}'&$top=1`;
  
  // Add time filters if provided for more precise duplicate detection
  const filters = [`subject eq '${encodeURIComponent(subject)}'`];
  if (startTime) {
    filters.push(`start/dateTime ge '${startTime}'`);
  }
  if (endTime) {
    filters.push(`end/dateTime le '${endTime}'`);
  }
  
  url = `${GRAPH_BASE_URL}/me/events?$filter=${filters.join(' and ')}&$top=1`;
  
  try {
    const { response, newTokens } = await makeAuthenticatedRequest(url, tokens);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Failed to search Microsoft Calendar events:', errorData);
      throw new Error(`Failed to search calendar events: ${response.statusText}`);
    }

    const data = await response.json();
    const event = data.value.length > 0 ? data.value[0] : null;
    
    if (event) {
      console.log('Found existing Microsoft Calendar event:', event.id);
    }
    
    return {
      event,
      newTokens
    };
    
  } catch (error: any) {
    console.error('Error searching Microsoft Calendar events:', error);
    throw new Error(`Failed to search calendar events: ${error.message}`);
  }
}