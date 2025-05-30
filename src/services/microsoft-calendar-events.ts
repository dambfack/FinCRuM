import type { Task, Reminder, Appointment, MicrosoftTokens } from '@/lib/types';
import { 
  createMicrosoftCalendarEvent as createMicrosoftEventClient,
  updateMicrosoftCalendarEvent as updateMicrosoftEventClient,
  deleteMicrosoftCalendarEvent as deleteMicrosoftEventClient,
  findMicrosoftCalendarEventBySubject
} from './microsoft-calendar-client';
import { mapToMicrosoftCalendarEvent, extractItemIdFromMicrosoftEvent } from './microsoft-calendar-mapper';

/**
 * Creates a new event in the user's Microsoft Outlook Calendar
 */
export async function createMicrosoftCalendarEvent(
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment',
  tokens: MicrosoftTokens
): Promise<{ event: any, newTokens?: MicrosoftTokens }> {
  try {
    // Convert our internal event format to Microsoft Calendar event format
    const event = mapToMicrosoftCalendarEvent(item, type);

    console.log(`Creating ${type} in Microsoft Calendar:`, event.subject);
    
    // Check for existing event to prevent duplicates
    const { event: existingEvent, newTokens: searchTokens } = await findMicrosoftCalendarEventBySubject(
      event.subject,
      tokens,
      event.start.dateTime,
      event.end.dateTime
    );
    
    if (existingEvent) {
      console.log(`${type} already exists in Microsoft Calendar:`, existingEvent.id);
      return {
        event: existingEvent,
        newTokens: searchTokens
      };
    }
    
    const { event: createdEvent, newTokens } = await createMicrosoftEventClient(event, searchTokens || tokens);

    console.log(`Successfully created ${type} in Microsoft Calendar:`, createdEvent.id);
    
    return {
      event: createdEvent,
      newTokens
    };
    
  } catch (error: any) {
    console.error(`Error creating ${type} in Microsoft Calendar:`, error);
    
    // Handle specific Microsoft Graph API errors
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      throw new Error('Microsoft authentication failed. Please re-authenticate.');
    }
    
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      throw new Error('Insufficient permissions to access Microsoft Calendar. Please check your permissions.');
    }
    
    if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
      throw new Error('Microsoft API rate limit exceeded. Please try again later.');
    }
    
    throw new Error(`Failed to create ${type} in Microsoft Calendar: ${error.message}`);
  }
}

/**
 * Updates an existing event in the user's Microsoft Outlook Calendar
 */
export async function updateMicrosoftCalendarEvent(
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment',
  eventId: string,
  tokens: MicrosoftTokens
): Promise<{ event: any, newTokens?: MicrosoftTokens }> {
  try {
    // Convert our internal event format to Microsoft Calendar event format
    const eventUpdate = mapToMicrosoftCalendarEvent(item, type);

    console.log(`Updating ${type} in Microsoft Calendar:`, eventId);
    
    const { event: updatedEvent, newTokens } = await updateMicrosoftEventClient(
      eventId,
      eventUpdate,
      tokens
    );

    console.log(`Successfully updated ${type} in Microsoft Calendar:`, updatedEvent.id);
    
    return {
      event: updatedEvent,
      newTokens
    };
    
  } catch (error: any) {
    console.error(`Error updating ${type} in Microsoft Calendar:`, error);
    
    // Handle specific Microsoft Graph API errors
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      throw new Error('Microsoft authentication failed. Please re-authenticate.');
    }
    
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      throw new Error('Insufficient permissions to access Microsoft Calendar. Please check your permissions.');
    }
    
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      throw new Error('Calendar event not found. It may have been deleted.');
    }
    
    throw new Error(`Failed to update ${type} in Microsoft Calendar: ${error.message}`);
  }
}

/**
 * Deletes an event from the user's Microsoft Outlook Calendar
 */
export async function deleteMicrosoftCalendarEvent(
  eventId: string,
  tokens: MicrosoftTokens
): Promise<{ success: boolean, newTokens?: MicrosoftTokens }> {
  try {
    console.log('Deleting event from Microsoft Calendar:', eventId);
    
    const { success, newTokens } = await deleteMicrosoftEventClient(eventId, tokens);

    console.log('Successfully deleted event from Microsoft Calendar:', eventId);
    
    return {
      success,
      newTokens
    };
    
  } catch (error: any) {
    console.error('Error deleting event from Microsoft Calendar:', error);
    
    // Handle specific Microsoft Graph API errors
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      throw new Error('Microsoft authentication failed. Please re-authenticate.');
    }
    
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      throw new Error('Insufficient permissions to access Microsoft Calendar. Please check your permissions.');
    }
    
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      // Event already deleted or doesn't exist - consider this a success
      console.log('Event not found in Microsoft Calendar (may already be deleted):', eventId);
      return { success: true };
    }
    
    throw new Error(`Failed to delete event from Microsoft Calendar: ${error.message}`);
  }
}

/**
 * Syncs an item to Microsoft Calendar (create or update)
 */
export async function syncToMicrosoftCalendar(
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment',
  tokens: MicrosoftTokens,
  existingEventId?: string
): Promise<{ event: any, newTokens?: MicrosoftTokens, action: 'created' | 'updated' }> {
  try {
    if (existingEventId) {
      // Update existing event
      const result = await updateMicrosoftCalendarEvent(item, type, existingEventId, tokens);
      return {
        ...result,
        action: 'updated'
      };
    } else {
      // Create new event
      const result = await createMicrosoftCalendarEvent(item, type, tokens);
      return {
        ...result,
        action: 'created'
      };
    }
  } catch (error: any) {
    console.error(`Error syncing ${type} to Microsoft Calendar:`, error);
    throw error;
  }
}

/**
 * Batch sync multiple items to Microsoft Calendar
 */
export async function batchSyncToMicrosoftCalendar(
  items: Array<{
    item: Task | Reminder | Appointment;
    type: 'task' | 'reminder' | 'appointment';
    existingEventId?: string;
  }>,
  tokens: MicrosoftTokens
): Promise<{
  results: Array<{
    success: boolean;
    event?: any;
    error?: string;
    action?: 'created' | 'updated';
  }>;
  newTokens?: MicrosoftTokens;
}> {
  const results: Array<{
    success: boolean;
    event?: any;
    error?: string;
    action?: 'created' | 'updated';
  }> = [];
  
  let currentTokens = tokens;
  
  for (const { item, type, existingEventId } of items) {
    try {
      const result = await syncToMicrosoftCalendar(item, type, currentTokens, existingEventId);
      
      // Update tokens if they were refreshed
      if (result.newTokens) {
        currentTokens = result.newTokens;
      }
      
      results.push({
        success: true,
        event: result.event,
        action: result.action
      });
      
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      console.error(`Failed to sync ${type} to Microsoft Calendar:`, error);
      results.push({
        success: false,
        error: error.message
      });
    }
  }
  
  return {
    results,
    newTokens: currentTokens !== tokens ? currentTokens : undefined
  };
}