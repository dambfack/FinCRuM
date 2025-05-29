'use server';

import type { Task, Reminder, Appointment, MicrosoftTokens } from '@/lib/types';
import {
  createMicrosoftCalendarEvent,
  updateMicrosoftCalendarEvent,
  deleteMicrosoftCalendarEvent,
  syncToMicrosoftCalendar,
  batchSyncToMicrosoftCalendar
} from '@/services/microsoft-calendar-events';
import { getAuthInfo, updateAuthInfo } from '@/services/auth';

/**
 * Server action to create a calendar event in Microsoft Outlook
 */
export async function createMicrosoftCalendarEventAction(
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment'
): Promise<{
  success: boolean;
  event?: any;
  error?: string;
  tokensUpdated?: boolean;
}> {
  try {
    // Get Microsoft tokens from auth storage
    const authInfo = await getAuthInfo();
    const microsoftTokens = authInfo?.microsoftTokens;
    
    if (!microsoftTokens?.access_token) {
      return {
        success: false,
        error: 'Microsoft authentication required. Please connect your Microsoft account.'
      };
    }
    
    const result = await createMicrosoftCalendarEvent(item, type, microsoftTokens);
    
    // Update tokens if they were refreshed
    let tokensUpdated = false;
    if (result.newTokens) {
      await updateAuthInfo({ microsoftTokens: result.newTokens });
      tokensUpdated = true;
    }
    
    return {
      success: true,
      event: result.event,
      tokensUpdated
    };
    
  } catch (error: any) {
    console.error('Microsoft Calendar event creation failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to create Microsoft Calendar event'
    };
  }
}

/**
 * Server action to update a calendar event in Microsoft Outlook
 */
export async function updateMicrosoftCalendarEventAction(
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment',
  eventId: string
): Promise<{
  success: boolean;
  event?: any;
  error?: string;
  tokensUpdated?: boolean;
}> {
  try {
    // Get Microsoft tokens from auth storage
    const authInfo = await getAuthInfo();
    const microsoftTokens = authInfo?.microsoftTokens;
    
    if (!microsoftTokens?.access_token) {
      return {
        success: false,
        error: 'Microsoft authentication required. Please connect your Microsoft account.'
      };
    }
    
    const result = await updateMicrosoftCalendarEvent(item, type, eventId, microsoftTokens);
    
    // Update tokens if they were refreshed
    let tokensUpdated = false;
    if (result.newTokens) {
      await updateAuthInfo({ microsoftTokens: result.newTokens });
      tokensUpdated = true;
    }
    
    return {
      success: true,
      event: result.event,
      tokensUpdated
    };
    
  } catch (error: any) {
    console.error('Microsoft Calendar event update failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to update Microsoft Calendar event'
    };
  }
}

/**
 * Server action to delete a calendar event from Microsoft Outlook
 */
export async function deleteMicrosoftCalendarEventAction(
  eventId: string
): Promise<{
  success: boolean;
  error?: string;
  tokensUpdated?: boolean;
}> {
  try {
    // Get Microsoft tokens from auth storage
    const authInfo = await getAuthInfo();
    const microsoftTokens = authInfo?.microsoftTokens;
    
    if (!microsoftTokens?.access_token) {
      return {
        success: false,
        error: 'Microsoft authentication required. Please connect your Microsoft account.'
      };
    }
    
    const result = await deleteMicrosoftCalendarEvent(eventId, microsoftTokens);
    
    // Update tokens if they were refreshed
    let tokensUpdated = false;
    if (result.newTokens) {
      await updateAuthInfo({ microsoftTokens: result.newTokens });
      tokensUpdated = true;
    }
    
    return {
      success: result.success,
      tokensUpdated
    };
    
  } catch (error: any) {
    console.error('Microsoft Calendar event deletion failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete Microsoft Calendar event'
    };
  }
}

/**
 * Server action to sync an item to Microsoft Calendar (create or update)
 */
export async function syncToMicrosoftCalendarAction(
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment',
  existingEventId?: string
): Promise<{
  success: boolean;
  event?: any;
  action?: 'created' | 'updated';
  error?: string;
  tokensUpdated?: boolean;
}> {
  try {
    // Get Microsoft tokens from auth storage
    const authInfo = await getAuthInfo();
    const microsoftTokens = authInfo?.microsoftTokens;
    
    if (!microsoftTokens?.access_token) {
      return {
        success: false,
        error: 'Microsoft authentication required. Please connect your Microsoft account.'
      };
    }
    
    const result = await syncToMicrosoftCalendar(item, type, microsoftTokens, existingEventId);
    
    // Update tokens if they were refreshed
    let tokensUpdated = false;
    if (result.newTokens) {
      await updateAuthInfo({ microsoftTokens: result.newTokens });
      tokensUpdated = true;
    }
    
    return {
      success: true,
      event: result.event,
      action: result.action,
      tokensUpdated
    };
    
  } catch (error: any) {
    console.error('Microsoft Calendar sync failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to sync to Microsoft Calendar'
    };
  }
}

/**
 * Server action to batch sync multiple items to Microsoft Calendar
 */
export async function batchSyncToMicrosoftCalendarAction(
  items: Array<{
    item: Task | Reminder | Appointment;
    type: 'task' | 'reminder' | 'appointment';
    existingEventId?: string;
  }>
): Promise<{
  success: boolean;
  results: Array<{
    success: boolean;
    event?: any;
    error?: string;
    action?: 'created' | 'updated';
  }>;
  tokensUpdated?: boolean;
  error?: string;
}> {
  try {
    // Get Microsoft tokens from auth storage
    const authInfo = await getAuthInfo();
    const microsoftTokens = authInfo?.microsoftTokens;
    
    if (!microsoftTokens?.access_token) {
      return {
        success: false,
        results: [],
        error: 'Microsoft authentication required. Please connect your Microsoft account.'
      };
    }
    
    const result = await batchSyncToMicrosoftCalendar(items, microsoftTokens);
    
    // Update tokens if they were refreshed
    let tokensUpdated = false;
    if (result.newTokens) {
      await updateAuthInfo({ microsoftTokens: result.newTokens });
      tokensUpdated = true;
    }
    
    const overallSuccess = result.results.every(r => r.success);
    
    return {
      success: overallSuccess,
      results: result.results,
      tokensUpdated
    };
    
  } catch (error: any) {
    console.error('Microsoft Calendar batch sync failed:', error);
    return {
      success: false,
      results: [],
      error: error.message || 'Failed to batch sync to Microsoft Calendar'
    };
  }
}