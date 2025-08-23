import type { Task } from '@/lib/types';
import { format } from 'date-fns';

/**
 * Maps an internal Task object to the Google Tasks API format.
 * @param task The internal Task object.
 * @returns The Google Task object.
 */
export const mapToGoogleTask = (task: Task): any => {
  const googleTask: any = {
    title: task.title,
    status: task.status === 'done' ? 'completed' : 'needsAction',
  };

  let notesContent = task.description || '';

  if (task.checklist && task.checklist.length > 0) {
    const checklistString = task.checklist
      .map((ci) => `${ci.completed ? '[x]' : '[ ]'} ${ci.text}`)
      .join('\n');
    notesContent += `\n\nChecklist:\n${checklistString}`;
  }

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
    notesContent += repetitionText;
  }

  if (notesContent.trim()) {
    googleTask.notes = notesContent.trim();
  }

  if (task.dueDate) {
    const dueDateObj = new Date(task.dueDate as string);
    if (!isNaN(dueDateObj.getTime())) {
      if (task.dueTime) {
        const [hours, minutes] = task.dueTime.split(':').map(Number);
        dueDateObj.setHours(hours, minutes, 0, 0);
        googleTask.due = dueDateObj.toISOString();
      } else {
        // For all-day tasks, Google Tasks API expects a date string in YYYY-MM-DD format,
        // and then it's treated as due at the end of that day in UTC.
        // To be more precise and align with how Calendar API handles all-day events (which is start of day),
        // we'll set it to the start of the day in UTC.
        // However, the Google Tasks API specifically wants the 'due' field to be an RFC3339 timestamp.
        // Let's set it to the beginning of the day in UTC.
        const utcDueDate = new Date(Date.UTC(dueDateObj.getUTCFullYear(), dueDateObj.getUTCMonth(), dueDateObj.getUTCDate()));
        googleTask.due = utcDueDate.toISOString();
      }
    }
  }

  return googleTask;
};