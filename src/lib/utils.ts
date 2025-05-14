
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { DataItemType, type Notification } from "./types"; // Added Notification type
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Retrieves data from localStorage.
 * @param key The DataItemType key for the data.
 * @returns The parsed data or null if not found or error.
 */
export function getData<T>(key: DataItemType): T | null {
  if (typeof window !== 'undefined') {
    const storedData = localStorage.getItem(key);
    try {
      return storedData ? JSON.parse(storedData) : null;
    } catch (e) {
      console.error(`Failed to parse local data for ${key}:`, e);
      return null;
    }
  }
  return null;
}

/**
 * Saves data to localStorage and dispatches a 'dataChanged' event.
 * @param key The DataItemType key for the data.
 * @param data The data to save.
 */
export function saveData<T>(key: DataItemType, data: T): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      // Dispatch custom event to notify components of data change
      window.dispatchEvent(new CustomEvent('dataChanged', { detail: { type: key, data } }));
    } catch (e) {
      console.error(`Failed to save local data for ${key}:`, e);
    }
  }
}

/**
 * Deletes an item from an array in localStorage by its ID.
 * Assumes the data stored at the key is an array of objects, each with an 'id' property.
 * @param key The DataItemType key for the array.
 * @param itemId The ID of the item to delete.
 * @returns The updated array after deletion, or null if the key doesn't exist or data is not an array.
 */
export function deleteItemById<T extends { id: string }>(key: DataItemType, itemId: string): T[] | null {
  if (typeof window !== 'undefined') {
    const currentArray = getData<T[]>(key);
    if (Array.isArray(currentArray)) {
      const updatedArray = currentArray.filter(item => item.id !== itemId);
      saveData<T[]>(key, updatedArray); // saveData will now dispatch 'dataChanged'
      return updatedArray;
    } else {
      console.warn(`Data for key ${key} is not an array or does not exist. Cannot delete item ${itemId}.`);
      return null;
    }
  }
  return null;
}

/**
 * Deletes an entire data collection from localStorage.
 * @param key The DataItemType key for the collection to delete.
 */
export function deleteDataCollection(key: DataItemType): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(key);
      // Dispatch custom event to notify components of data change
      window.dispatchEvent(new CustomEvent('dataChanged', { detail: { type: key, data: null } }));
    } catch (e) {
      console.error(`Failed to delete local data for ${key}:`, e);
    }
  }
}


/**
 * Formats a date into a string 'MM/dd/yyyy, HH:mm'.
 * @param date The date to format (Date object, ISO string, or timestamp).
 * @returns Formatted date string or 'Invalid Date' if formatting fails.
 */
export function formatDateTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return 'N/A';
  try {
    const dateObj = new Date(dateInput);
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return format(dateObj, 'MM/dd/yyyy, HH:mm');
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'Invalid Date';
  }
}


/**
 * Parses a date string into a Date object.
 * @param dateString The date string to parse.
 * @returns A Date object or null if the string is invalid or null/undefined.
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) {
    return null;
  }
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Creates and saves a notification.
 * @param notificationData Data for the notification, excluding id, createdAt, and read.
 */
export function createNotification(notificationData: Omit<Notification, 'id' | 'createdAt' | 'read'>): void {
  const newNotification: Notification = {
    ...notificationData,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };

  const notifications = getData<Notification[]>(DataItemType.Notifications) || [];
  notifications.push(newNotification);
  saveData<Notification[]>(DataItemType.Notifications, notifications.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  console.log("Notification created:", newNotification);
}

/**
 * Gets the first initial of a name.
 * @param name The name string.
 * @param fallback The fallback character if name is empty.
 * @returns The capitalized first initial or the fallback.
 */
export function getFirstInitial(name?: string, fallback: string = '?'): string {
  if (!name || name.trim() === '') return fallback;
  return name.trim().charAt(0).toUpperCase();
}
