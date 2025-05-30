import type { Task, Reminder, Appointment } from '@/lib/types';
import type { MicrosoftCalendarEvent } from './microsoft-calendar-client';

/**
 * Maps our internal data types to Microsoft Calendar event format
 */
export function mapToMicrosoftCalendarEvent(
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment'
): MicrosoftCalendarEvent {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  
  // Base event structure
  const event: MicrosoftCalendarEvent = {
    subject: getEventSubject(item, type),
    body: {
      contentType: 'Text',
      content: getEventDescription(item, type)
    },
    start: {
      dateTime: '',
      timeZone
    },
    end: {
      dateTime: '',
      timeZone
    },
    showAs: 'busy',
    sensitivity: 'normal',
    categories: [getEventCategory(type)]
  };

  // Set dates based on item type
  switch (type) {
    case 'task':
      const task = item as Task;
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        event.start.dateTime = dueDate.toISOString();
        // Tasks get 1 hour duration by default
        const endDate = new Date(dueDate.getTime() + 60 * 60 * 1000);
        event.end.dateTime = endDate.toISOString();
      } else {
        // If no due date, schedule for tomorrow at 9 AM
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        event.start.dateTime = tomorrow.toISOString();
        const endDate = new Date(tomorrow.getTime() + 60 * 60 * 1000);
        event.end.dateTime = endDate.toISOString();
      }
      event.showAs = 'tentative';
      break;

    case 'reminder':
      const reminder = item as Reminder;
      const reminderDate = new Date(reminder.dateTime);
      event.start.dateTime = reminderDate.toISOString();
      // Reminders get 30 minutes duration by default
      const reminderEndDate = new Date(reminderDate.getTime() + 30 * 60 * 1000);
      event.end.dateTime = reminderEndDate.toISOString();
      event.showAs = 'free'; // Reminders don't block time
      break;

    case 'appointment':
      const appointment = item as Appointment;
      const startDate = new Date(appointment.date);
      event.start.dateTime = startDate.toISOString();
      
      // Calculate end time based on end property or default to 1 hour
      let endDate: Date;
      if (appointment.end) {
        endDate = new Date(appointment.end);
      } else {
        // Default to 1 hour duration
        endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      }
      event.end.dateTime = endDate.toISOString();
      
      // Add location if provided
      if (appointment.location) {
        event.location = {
          displayName: appointment.location
        };
      }
      
      // Add attendees if provided
      if (appointment.attendeesList && appointment.attendeesList.length > 0) {
        event.attendees = appointment.attendeesList.map(attendee => ({
          emailAddress: {
            address: attendee.email,
            name: attendee.displayName || attendee.email
          },
          type: 'required' as const
        }));
      }
      
      // Enable online meeting for appointments
      event.isOnlineMeeting = true;
      event.onlineMeetingProvider = 'teamsForBusiness';
      event.showAs = 'busy';
      break;
  }

  return event;
}

/**
 * Generates appropriate subject/title for the calendar event
 */
function getEventSubject(item: Task | Reminder | Appointment, type: string): string {
  const prefix = getEventPrefix(type);
  
  switch (type) {
    case 'task':
      return `${prefix}: ${(item as Task).title}`;
    case 'reminder':
      return `${prefix}: ${(item as Reminder).title}`;
    case 'appointment':
      const appointment = item as Appointment;
      const contactName = appointment.invitedContacts && appointment.invitedContacts.length > 0 ? `with ${appointment.invitedContacts.length} contact(s)` : '';
      return `${prefix}: ${appointment.title} ${contactName}`.trim();
    default:
      return `${prefix}: ${(item as any).title || 'Untitled'}`;
  }
}

/**
 * Generates appropriate description for the calendar event
 */
function getEventDescription(item: Task | Reminder | Appointment, type: string): string {
  const lines: string[] = [];
  
  // Add type-specific information
  switch (type) {
    case 'task':
      const task = item as Task;
      lines.push(`Task: ${task.title}`);
      if (task.description) {
        lines.push(`Description: ${task.description}`);
      }
      if (task.priority) {
        lines.push(`Priority: ${task.priority}`);
      }
      if (task.checklist && task.checklist.length > 0) {
        lines.push('Checklist:');
        task.checklist.forEach(item => {
          const status = item.completed ? '✓' : '☐';
          lines.push(`  ${status} ${item.text}`);
        });
      }
      break;

    case 'reminder':
      const reminder = item as Reminder;
      lines.push(`Reminder: ${reminder.title}`);
      if (reminder.description) {
        lines.push(`Description: ${reminder.description}`);
      }
      break;

    case 'appointment':
      const appointment = item as Appointment;
      lines.push(`Appointment: ${appointment.title}`);
      if (appointment.description) {
        lines.push(`Description: ${appointment.description}`);
      }
      if (appointment.invitedContacts && appointment.invitedContacts.length > 0) {
        lines.push(`Invited Contacts: ${appointment.invitedContacts.length} contact(s)`);
      }
      if (appointment.location) {
        lines.push(`Location: ${appointment.location}`);
      }
      if (appointment.attendeesList && appointment.attendeesList.length > 0) {
        lines.push(`Attendees: ${appointment.attendeesList.map(a => a.displayName || a.email).join(', ')}`);
      }
      break;
  }
  
  // Add common footer
  lines.push('');
  lines.push('Created by FinCRuM - Financial CRM System');
  lines.push(`Item ID: ${item.id}`);
  
  return lines.join('\n');
}

/**
 * Gets the appropriate prefix for the event title
 */
function getEventPrefix(type: string): string {
  switch (type) {
    case 'task':
      return '📋 Task';
    case 'reminder':
      return '⏰ Reminder';
    case 'appointment':
      return '📅 Appointment';
    default:
      return '📌 Event';
  }
}

/**
 * Gets the appropriate category for the event
 */
function getEventCategory(type: string): string {
  switch (type) {
    case 'task':
      return 'FinCRuM Tasks';
    case 'reminder':
      return 'FinCRuM Reminders';
    case 'appointment':
      return 'FinCRuM Appointments';
    default:
      return 'FinCRuM';
  }
}

/**
 * Extracts our internal item ID from a Microsoft Calendar event
 * This helps us identify which internal item corresponds to which calendar event
 */
export function extractItemIdFromMicrosoftEvent(event: MicrosoftCalendarEvent): string | null {
  if (!event.body?.content) {
    return null;
  }
  
  const match = event.body.content.match(/Item ID: ([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

/**
 * Checks if a Microsoft Calendar event was created by FinCRuM
 */
export function isMicrosoftEventFromFinCRuM(event: MicrosoftCalendarEvent): boolean {
  return event.body?.content?.includes('Created by FinCRuM') || 
         event.categories?.some(cat => cat.startsWith('FinCRuM')) ||
         false;
}