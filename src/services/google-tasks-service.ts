// Removed direct import of googleapis to avoid client-side bundling issues
import type { Task, GoogleTokens } from '@/lib/types';
import { getAuthenticatedClient } from './google-oauth';
import { mapToGoogleTask } from './google-tasks-mapper';

// Use dynamic imports for googleapis types
type tasks_v1 = any; // Will be properly typed when dynamically imported

const TASK_LIST_ID = '@default'; // Using the default task list

/**
 * Creates a new task in Google Tasks.
 * @param task The internal Task object.
 * @param tokens Google OAuth tokens.
 * @returns The created Google Task object and potentially new tokens.
 */
export async function createGoogleTask(
  task: Task,
  tokens: GoogleTokens
): Promise<{ task: any, newTokens?: GoogleTokens }> {
  const client = await getAuthenticatedClient(tokens);
  const { google } = await import('googleapis');
  const tasksService = google.tasks({ version: 'v1', auth: client });
  const googleTaskPayload = mapToGoogleTask(task);

  try {
    const response = await tasksService.tasks.insert({
      tasklist: TASK_LIST_ID,
      requestBody: googleTaskPayload,
    });
    return { task: response.data };
  } catch (error: any) {
    console.error('Error creating Google Task:', error.message);
    if (error.response && error.response.data) {
      console.error('Google API Error Details:', error.response.data.error);
    }
    throw new Error(`Failed to create Google Task: ${error.message}`);
  }
}

/**
 * Updates an existing task in Google Tasks.
 * @param taskId The ID of the Google Task to update.
 * @param task The internal Task object with updates.
 * @param tokens Google OAuth tokens.
 * @returns The updated Google Task object and potentially new tokens.
 */
export async function updateGoogleTask(
  taskId: string,
  task: Task,
  tokens: GoogleTokens
): Promise<{ task: any, newTokens?: GoogleTokens }> {
  const client = await getAuthenticatedClient(tokens);
  const { google } = await import('googleapis');
  const tasksService = google.tasks({ version: 'v1', auth: client });
  const googleTaskPayload = mapToGoogleTask(task);

  // The Google Tasks API requires the task ID in the request body for updates.
  // It also doesn't support partial updates well for all fields, so we send the whole mapped object.
  const payloadForUpdate = {
    ...googleTaskPayload,
    id: taskId, // Ensure ID is part of the payload for update
  };

  try {
    const response = await tasksService.tasks.update({
      tasklist: TASK_LIST_ID,
      task: taskId,
      requestBody: payloadForUpdate,
    });
    return { task: response.data };
  } catch (error: any) {
    console.error('Error updating Google Task:', error.message);
    if (error.response && error.response.data) {
      console.error('Google API Error Details:', error.response.data.error);
    }
    throw new Error(`Failed to update Google Task: ${error.message}`);
  }
}

/**
 * Deletes a task from Google Tasks.
 * @param taskId The ID of the Google Task to delete.
 * @param tokens Google OAuth tokens.
 * @returns Potentially new tokens.
 */
export async function deleteGoogleTask(
  taskId: string,
  tokens: GoogleTokens
): Promise<{ newTokens?: GoogleTokens }> {
  const client = await getAuthenticatedClient(tokens);
  const { google } = await import('googleapis');
  const tasksService = google.tasks({ version: 'v1', auth: client });

  try {
    await tasksService.tasks.delete({
      tasklist: TASK_LIST_ID,
      task: taskId,
    });
    return {};
  } catch (error: any) {
    console.error('Error deleting Google Task:', error.message);
    if (error.response && error.response.data) {
      console.error('Google API Error Details:', error.response.data.error);
    }
    throw new Error(`Failed to delete Google Task: ${error.message}`);
  }
}

/**
 * Gets a specific task from Google Tasks.
 * @param taskId The ID of the Google Task to retrieve.
 * @param tokens Google OAuth tokens.
 * @returns The Google Task object and potentially new tokens.
 */
export async function getGoogleTask(
  taskId: string,
  tokens: GoogleTokens
): Promise<{ task: any, newTokens?: GoogleTokens }> {
  const client = await getAuthenticatedClient(tokens);
  const { google } = await import('googleapis');
  const tasksService = google.tasks({ version: 'v1', auth: client });

  try {
    const response = await tasksService.tasks.get({
      tasklist: TASK_LIST_ID,
      task: taskId,
    });
    return { task: response.data };
  } catch (error: any) {
    console.error('Error getting Google Task:', error.message);
    if (error.response && error.response.data) {
      console.error('Google API Error Details:', error.response.data.error);
    }
    throw new Error(`Failed to get Google Task: ${error.message}`);
  }
}

/**
 * Lists tasks from the default Google Tasks list.
 * @param tokens Google OAuth tokens.
 * @param options Optional parameters for listing tasks (e.g., showCompleted, dueMax).
 * @returns A list of Google Task objects and potentially new tokens.
 */
export async function listGoogleTasks(
  tokens: GoogleTokens,
  options?: {
    showCompleted?: boolean;
    showHidden?: boolean;
    dueMin?: string; // RFC 3339 timestamp
    dueMax?: string; // RFC 3339 timestamp
    updatedMin?: string; // RFC 3339 timestamp
  }
): Promise<{ tasks: any[], newTokens?: GoogleTokens }> {
  const client = await getAuthenticatedClient(tokens);
  const { google } = await import('googleapis');
  const tasksService = google.tasks({ version: 'v1', auth: client });

  try {
    const response = await tasksService.tasks.list({
      tasklist: TASK_LIST_ID,
      ...options,
    });
    return { tasks: response.data.items || [] };
  } catch (error: any) {
    console.error('Error listing Google Tasks:', error.message);
    if (error.response && error.response.data) {
      console.error('Google API Error Details:', error.response.data.error);
    }
    throw new Error(`Failed to list Google Tasks: ${error.message}`);
  }
}