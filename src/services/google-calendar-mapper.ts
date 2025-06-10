import type { Task, Reminder, Appointment } from '@/lib/types';

/**
 * Maps internal event types to Google Calendar event format
 */
export const mapToGoogleCalendarEvent = (
  item: Task | Reminder | Appointment,
  type: 'task' | 'reminder' | 'appointment'
) => {
  let summary = '';
  let descriptionContent = item.description || '';
  let start: any;
  let end: any;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let attendees: { email: string, displayName?: string }[] = [];

  if (type === 'task') {
    const task = item as Task;
    summary = `Task: ${task.title}`;
    if (task.checklist && task.checklist.length > 0) {
      const checklistString = task.checklist.map(ci => `${ci.completed ? '[x]' : '[ ]'} ${ci.text}`).join('\n');
      descriptionContent += `\n\nChecklist:\n${checklistString}`;
    }
    
    // Add repetition info to description
    if (task.isRepetitive && task.repetitionType) {
      let repetitionText = `\n\nRepetition: ${task.repetitionType}`;
      if (task.repetitionInterval && task.repetitionInterval > 1) {
        repetitionText += ` (every ${task.repetitionInterval} ${task.repetitionType}s)`;
      }
      if (task.repetitionType === 'weekly' && task.repetitionDays && task.repetitionDays.length > 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const selectedDays = task.repetitionDays.map(day => dayNames[day]).join(', ');
        repetitionText += ` on ${selectedDays}`;
      }
      descriptionContent += repetitionText;
    }
    
    if (task.dueDate) {
      const dueDateObj = new Date(task.dueDate as string);
      if (!isNaN(dueDateObj.getTime())) {
        if (task.dueTime) {
          // Task has specific time
          const year = dueDateObj.getFullYear();
          const month = String(dueDateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dueDateObj.getDate()).padStart(2, '0');
          const dateTimeString = `${year}-${month}-${day}T${task.dueTime}:00`;
          const taskDateTime = new Date(dateTimeString);
          
          start = { dateTime: taskDateTime.toISOString(), timeZone };
          end = { dateTime: new Date(taskDateTime.getTime() + 60 * 60 * 1000).toISOString(), timeZone }; // 1 hour duration
        } else {
          // All-day task
          const year = dueDateObj.getFullYear();
          const month = String(dueDateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dueDateObj.getDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`;
          
          start = { date: dateString };
          end = { date: dateString };
        }
      }
    }
  } else if (type === 'reminder') {
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
        const appointmentDateOnly = appointment.date.split('T')[0]; // Extract YYYY-MM-DD part
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

  return eventRequest;
};