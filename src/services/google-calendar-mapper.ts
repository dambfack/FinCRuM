import type { Task, Reminder, Appointment } from '@/lib/types';

/**
 * Maps internal event types to Google Calendar event format
 */
export const mapToGoogleCalendarEvent = (
  item: Reminder | Appointment, // Task removed
  type: 'reminder' | 'appointment' // Task removed
) => {
  let summary = '';
  let descriptionContent = item.description || '';
  let start: any;
  let end: any;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let attendees: { email: string, displayName?: string }[] = [];

  if (type === 'reminder') { // Task block removed
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
        // Create date string using the stored date directly to avoid timezone issues
        const dateString = typeof appointment.date === 'string' ? appointment.date : appointment.date.toISOString();
        const appointmentDateOnly = dateString.split('T')[0]; // Extract YYYY-MM-DD part
        const appointmentDateTimeString = `${appointmentDateOnly}T${appointment.time}:00`;
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

  // Add signature to description
  const finalDescription = descriptionContent.trim() + 
    (descriptionContent.trim() ? '\n\n' : '') + 
    '-added from FinsculptCRM';

  const eventRequest: any = {
    summary,
    description: finalDescription,
    start,
    end,
    reminders: {
      useDefault: true,
    },
  };

  if (attendees.length > 0) {
    eventRequest.attendees = attendees;
  }

  // Add conference data for online appointments
  if (type === 'appointment') {
    const appointment = item as Appointment;
    if ((appointment as any).isOnline) {
      eventRequest.conferenceData = {
        createRequest: {
          requestId: Math.random().toString(36).substring(2, 15),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }
  }

  return eventRequest;
};