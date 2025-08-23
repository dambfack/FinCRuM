// Removed direct import of googleapis to avoid client-side bundling issues
import type { Task, GoogleTokens } from '@/lib/types';
import { getAuthenticatedClient } from './google-oauth';

/**
 * Creates a new task in the user's Google Tasks
 */
export async function createGoogleTask(
  task: Task,
  tokens: GoogleTokens
): Promise<{ task: any, newTokens?: GoogleTokens }> {
  try {
    // Get authenticated client (will refresh tokens if needed)
    const client = await getAuthenticatedClient(tokens);
    const { google } = await import('googleapis');
    const tasks = google.tasks({ version: 'v1', auth: client });
    
    // First, get the default task list
    const taskLists = await tasks.tasklists.list();
    const defaultTaskList = taskLists.data.items?.[0];
    
    if (!defaultTaskList?.id) {
      throw new Error('No task list found');
    }

    // Prepare task data for Google Tasks API
    const taskData: any = {
      title: task.title,
      notes: task.description || '',
    };

    // Add due date if specified
    if (task.dueDate) {
      const dueDateObj = new Date(task.dueDate as string);
      if (!isNaN(dueDateObj.getTime())) {
        if (task.dueTime) {
          // Task has specific time - combine date and time
          const year = dueDateObj.getFullYear();
          const month = String(dueDateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dueDateObj.getDate()).padStart(2, '0');
          const dateTimeString = `${year}-${month}-${day}T${task.dueTime}:00.000Z`;
          taskData.due = dateTimeString;
        } else {
          // All-day task - use date only
          const year = dueDateObj.getFullYear();
          const month = String(dueDateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dueDateObj.getDate()).padStart(2, '0');
          taskData.due = `${year}-${month}-${day}T00:00:00.000Z`;
        }
      }
    }

    // Add repetition info to notes if task is repetitive
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
      taskData.notes += repetitionText;
    }

    // Add checklist to notes if present
    if (task.checklist && task.checklist.length > 0) {
      const checklistString = task.checklist.map(ci => `${ci.completed ? '[x]' : '[ ]'} ${ci.text}`).join('\n');
      taskData.notes += `\n\nChecklist:\n${checklistString}`;
    }

    // Add signature to notes
    taskData.notes = taskData.notes.trim() + 
      (taskData.notes.trim() ? '\n\n' : '') + 
      '-added from FinsculptCRM';

    console.log(`Creating task in Google Tasks:`, taskData.title);
    
    const response = await tasks.tasks.insert({
      tasklist: defaultTaskList.id,
      requestBody: taskData,
    });

    // Extract new tokens if they were refreshed
    const credentials = client.credentials;
    const newTokens: GoogleTokens | undefined = credentials.access_token 
      ? {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || tokens.refresh_token,
          expiry_date: credentials.expiry_date,
          token_type: credentials.token_type,
          scope: credentials.scope,
        }
      : undefined;

    console.log(`Successfully created task in Google Tasks:`, response.data.id);
    
    return {
      task: response.data,
      newTokens
    };
    
  } catch (error: any) {
    console.error('Error creating Google Task:', error);
    throw new Error(`Failed to create Google Task: ${error.message}`);
  }
}

/**
 * Updates an existing task in Google Tasks
 */
export async function updateGoogleTask(
  taskId: string,
  task: Task,
  tokens: GoogleTokens
): Promise<{ task: any, newTokens?: GoogleTokens }> {
  try {
    const client = await getAuthenticatedClient(tokens);
    const { google } = await import('googleapis');
    const tasks = google.tasks({ version: 'v1', auth: client });
    
    // Get the default task list
    const taskLists = await tasks.tasklists.list();
    const defaultTaskList = taskLists.data.items?.[0];
    
    if (!defaultTaskList?.id) {
      throw new Error('No task list found');
    }

    // Prepare updated task data
    const taskData: any = {
      id: taskId,
      title: task.title,
      notes: task.description || '',
      status: task.completed ? 'completed' : 'needsAction',
    };

    // Add due date if specified
    if (task.dueDate) {
      const dueDateObj = new Date(task.dueDate as string);
      if (!isNaN(dueDateObj.getTime())) {
        if (task.dueTime) {
          const year = dueDateObj.getFullYear();
          const month = String(dueDateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dueDateObj.getDate()).padStart(2, '0');
          const dateTimeString = `${year}-${month}-${day}T${task.dueTime}:00.000Z`;
          taskData.due = dateTimeString;
        } else {
          const year = dueDateObj.getFullYear();
          const month = String(dueDateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dueDateObj.getDate()).padStart(2, '0');
          taskData.due = `${year}-${month}-${day}T00:00:00.000Z`;
        }
      }
    }

    // Add repetition info to notes if task is repetitive
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
      taskData.notes += repetitionText;
    }

    // Add checklist to notes if present
    if (task.checklist && task.checklist.length > 0) {
      const checklistString = task.checklist.map(ci => `${ci.completed ? '[x]' : '[ ]'} ${ci.text}`).join('\n');
      taskData.notes += `\n\nChecklist:\n${checklistString}`;
    }

    // Add signature to notes
    taskData.notes = taskData.notes.trim() + 
      (taskData.notes.trim() ? '\n\n' : '') + 
      '-added from FinsculptCRM';

    console.log(`Updating task in Google Tasks:`, taskData.title);
    
    const response = await tasks.tasks.update({
      tasklist: defaultTaskList.id,
      task: taskId,
      requestBody: taskData,
    });

    // Extract new tokens if they were refreshed
    const credentials = client.credentials;
    const newTokens: GoogleTokens | undefined = credentials.access_token 
      ? {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || tokens.refresh_token,
          expiry_date: credentials.expiry_date,
          token_type: credentials.token_type,
          scope: credentials.scope,
        }
      : undefined;

    console.log(`Successfully updated task in Google Tasks:`, response.data.id);
    
    return {
      task: response.data,
      newTokens
    };
    
  } catch (error: any) {
    console.error('Error updating Google Task:', error);
    throw new Error(`Failed to update Google Task: ${error.message}`);
  }
}

/**
 * Deletes a task from Google Tasks
 */
export async function deleteGoogleTask(
  taskId: string,
  tokens: GoogleTokens
): Promise<{ success: boolean, newTokens?: GoogleTokens }> {
  try {
    const client = await getAuthenticatedClient(tokens);
    const { google } = await import('googleapis');
    const tasks = google.tasks({ version: 'v1', auth: client });
    
    // Get the default task list
    const taskLists = await tasks.tasklists.list();
    const defaultTaskList = taskLists.data.items?.[0];
    
    if (!defaultTaskList?.id) {
      throw new Error('No task list found');
    }

    console.log(`Deleting task from Google Tasks:`, taskId);
    
    await tasks.tasks.delete({
      tasklist: defaultTaskList.id,
      task: taskId,
    });

    // Extract new tokens if they were refreshed
    const credentials = client.credentials;
    const newTokens: GoogleTokens | undefined = credentials.access_token 
      ? {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || tokens.refresh_token,
          expiry_date: credentials.expiry_date,
          token_type: credentials.token_type,
          scope: credentials.scope,
        }
      : undefined;

    console.log(`Successfully deleted task from Google Tasks:`, taskId);
    
    return {
      success: true,
      newTokens
    };
    
  } catch (error: any) {
    console.error('Error deleting Google Task:', error);
    throw new Error(`Failed to delete Google Task: ${error.message}`);
  }
}