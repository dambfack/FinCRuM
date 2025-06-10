'use server';

import { createGoogleTask as createTask, updateGoogleTask as updateTask, deleteGoogleTask as deleteTask } from '@/services/google-tasks';
import type { Task, GoogleTokens } from '@/lib/types';

/**
 * Server action to create a Google Task
 */
export async function createGoogleTaskAction(
  task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
  tokens: GoogleTokens
): Promise<{ success: boolean; task?: Task; error?: string }> {
  try {
    const result = await createTask(task, tokens);
    return { success: true, task: result };
  } catch (error) {
    console.error('Error creating Google task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Google task'
    };
  }
}

/**
 * Server action to update a Google Task
 */
export async function updateGoogleTaskAction(
  task: Task,
  tokens: GoogleTokens
): Promise<{ success: boolean; task?: Task; error?: string }> {
  try {
    const result = await updateTask(task, tokens);
    return { success: true, task: result };
  } catch (error) {
    console.error('Error updating Google task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update Google task'
    };
  }
}

/**
 * Server action to delete a Google Task
 */
export async function deleteGoogleTaskAction(
  taskId: string,
  tokens: GoogleTokens
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteTask(taskId, tokens);
    return { success: true };
  } catch (error) {
    console.error('Error deleting Google task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete Google task'
    };
  }
}