

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { DataItemType, type Notification } from "./types"; // Added Notification type
import { format } from 'date-fns';
import { getCloudDatabase } from '@/services/shared-cloud-database';

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
    if (!storedData) {
      return null;
    }
    
    try {
      // Check if the stored data is valid JSON before parsing
      if (storedData.trim().length === 0) {
        console.warn(`Empty data found for ${key}, removing from localStorage`);
        localStorage.removeItem(key);
        return null;
      }
      
      // Validate that the string starts with valid JSON characters
      const firstChar = storedData.trim().charAt(0);
      if (firstChar !== '{' && firstChar !== '[' && firstChar !== '"' && firstChar !== 'n' && firstChar !== 't' && firstChar !== 'f' && !(/^-?\d/.test(firstChar))) {
        console.warn(`Invalid JSON format detected for ${key}, removing corrupted data`);
        localStorage.removeItem(key);
        return null;
      }
      
      return JSON.parse(storedData);
    } catch (e) {
      console.error(`Failed to parse local data for ${key}:`, e);
      console.warn(`Removing corrupted data for ${key}`);
      // Remove corrupted data from localStorage
      localStorage.removeItem(key);
      return null;
    }
  }
  return null;
}

/**
 * Saves data to localStorage and dispatches a 'dataChanged' event.
 * @param key The DataItemType key for the data.
 * @param data The data to save.
 * @param skipCloudSync Optional flag to skip cloud synchronization.
 * @returns True if successful, false otherwise.
 */
export function saveData<T>(key: DataItemType, data: T, skipCloudSync: boolean = false): boolean {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('dataChanged', { detail: { type: key, data, skipCloudSync } }));
      return true;
    } catch (e) {
      console.error(`Failed to save local data for ${key}:`, e);
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.error("LocalStorage quota exceeded when trying to save:", key);
      }
      return false;
    }
  }
  return false;
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
 * Formats a date into a string 'dd/MM/yyyy, HH:mm'.
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
    return format(dateObj, 'dd/MM/yyyy, HH:mm');
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
  saveData<Notification[]>(DataItemType.Notifications, notifications
    .filter(n => n.createdAt) // Filter out notifications without createdAt
    .sort((a,b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
  );
  console.log("Notification created:", newNotification);
}

/**
 * Saves data with automatic cloud synchronization.
 * @param key The DataItemType key for the data.
 * @param data The data to save.
 * @returns Promise that resolves to true if successful, false otherwise.
 */
export async function saveDataWithCloudSync<T>(key: DataItemType, data: T): Promise<boolean> {
  // Save locally first
  const localSaveSuccess = saveData(key, data, true); // Skip cloud sync in saveData
  
  if (!localSaveSuccess) {
    return false;
  }

  // Attempt cloud sync
  try {
    const provider = getCloudDatabase().getPreferredProvider();
  if (provider) {
    await getCloudDatabase().syncWithCloud(provider);
    }
    return true;
  } catch (error) {
    console.warn('Cloud sync failed, but local save succeeded:', error);
    return true; // Return true since local save succeeded
  }
}

/**
 * Adds or updates an item with automatic cloud synchronization.
 * @param key The DataItemType key for the data.
 * @param item The item to add or update (must have an id property).
 * @returns Promise that resolves to true if successful, false otherwise.
 */
export async function addOrUpdateItemWithCloudSync<T extends { id: string; updatedAt?: Date | string }>(
  key: DataItemType,
  item: T
): Promise<boolean> {
  try {
    // Add updatedAt timestamp
    const updatedItem = {
      ...item,
      updatedAt: new Date().toISOString()
    };

    // Update local storage
    const currentData = getData<T[]>(key) || [];
    const existingIndex = currentData.findIndex(existing => existing.id === item.id);
    
    if (existingIndex >= 0) {
      currentData[existingIndex] = updatedItem;
    } else {
      currentData.push(updatedItem);
    }
    
    // Save with cloud sync
    return await saveDataWithCloudSync(key, currentData);
  } catch (error) {
    console.error('Failed to add/update item with cloud sync:', error);
    return false;
  }
}

/**
 * Deletes an item with automatic cloud synchronization.
 * @param key The DataItemType key for the array.
 * @param itemId The ID of the item to delete.
 * @returns Promise that resolves to the updated array or null if failed.
 */
export async function deleteItemByIdWithCloudSync<T extends { id: string }>(
  key: DataItemType,
  itemId: string
): Promise<T[] | null> {
  try {
    const currentArray = getData<T[]>(key);
    if (Array.isArray(currentArray)) {
      const updatedArray = currentArray.filter(item => item.id !== itemId);
      const success = await saveDataWithCloudSync(key, updatedArray);
      return success ? updatedArray : null;
    } else {
      console.warn(`Data for key ${key} is not an array or does not exist. Cannot delete item ${itemId}.`);
      return null;
    }
  } catch (error) {
    console.error('Failed to delete item with cloud sync:', error);
    return null;
  }
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

/**
 * Converts a HEX color string to an HSL string "H S% L%".
 * @param hex The hex color string (e.g., "#RRGGBB" or "#RGB").
 * @returns HSL string or null if conversion fails.
 */
export function hexToHslString(hex: string): string | null {
  if (!hex) return null;

  let r = 0, g = 0, b = 0;
  if (hex.length === 4) { // #RGB
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) { // #RRGGBB
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  } else {
    return null; // Invalid hex format
  }

  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hDisplay = Math.round(h * 360);
  const sDisplay = Math.round(s * 100);
  const lDisplay = Math.round(l * 100);

  return `${hDisplay} ${sDisplay}% ${lDisplay}%`;
}
