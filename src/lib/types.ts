/**
 * Represents data extracted from an Excel or CSV file.
 */
export interface ExcelData {
  /**
   * The headers of the columns in the file.
   */
  headers: string[];
  /**
   * The rows of data in the file, where each row is an array of strings.
   */
  rows: string[][];
}

/**
 * Defines the possible synchronization statuses.
 */
export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'failed' | 'error' | 'conflict';

/**
 * Defines the possible cloud storage providers.
 */
export type CloudProvider = 'onedrive' | 'googledrive';

/**
 * Defines the options for resolving a data conflict.
 */
export type ConflictResolutionOption =
  | 'useLocal'
  | 'useCloud'
  | 'manual';


  /**
 * Represents a contact with details.
 */
export interface Contact {
  id: string; // Unique identifier
  firstName: string;
  lastName: string;
  email: string;
  phone?: string; // Optional
  company?: string; // Optional
  address?: string; // Optional
  notes?: string; // Optional
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Represents a task.
 */
export interface Task {
  id: string; // Unique identifier
  title: string;
  description?: string; // Optional
  dueDate?: Date | string; // Optional
  completed: boolean;
  priority?: 'high' | 'medium' | 'low'; // Optional
  status?: 'todo' | 'in-progress' | 'done'; // Optional
  createdAt: Date | string;
  updatedAt: Date | string;
  googleCalendarEventId?: string; // Optional - Event ID for Google Calendar
}

/**
 * Represents a reminder.
 */
export interface Reminder {
  id: string; // Unique identifier
  title: string;
  description?: string; // Optional
  dateTime: Date | string; // Changed from remindAt for consistency
  completed: boolean;
  associatedContactId?: string; // Optional: ID of the contact this reminder is for
  createdAt: Date | string;
  updatedAt: Date | string;
  googleCalendarEventId?: string; // Optional - Event ID for Google Calendar
  googleCalendarStatus?: 'confirmed' | 'tentative' | 'cancelled'; // Optional
  dismissed?: boolean; // Optional
}

/**
 * Represents an appointment.
 */
export interface Appointment {
  id: string; // Unique identifier
  title: string;
  description?: string; // Optional
  date: Date | string; // Date part
  time: string; // Time part (e.g., "10:00")
  start?: Date | string; // Combined datetime, can be derived or primary
  end?: Date | string;   // Combined datetime, can be derived or primary
  location?: string; // Optional
  invitedContacts?: string[]; // Array of contact IDs
  attendees?: Contact[]; // Optional - link to contacts
  createdAt: Date | string;
  updatedAt: Date | string;
  googleCalendarEventId?: string; // Optional - Event ID for Google Calendar
  googleCalendarStatus?: 'confirmed' | 'tentative' | 'cancelled'; // Optional
}

/**
 * Represents authentication information for cloud storage services.
 */
export interface CloudAuthInfo {
  accessToken: string;
  refreshToken?: string; // Optional refresh token
  provider: 'onedrive' | 'googledrive';
}

/**
 * Represents a data conflict detected during synchronization.
 */
export interface DataConflict {
  rowIndex: number; // Index of the row with conflict
  localValue: string[];
  cloudValue: string[];
  resolvedValue?: string[]; // Optional field for resolved data
  headers?: string[]; // Optional: Include headers for context in UI
}

/**
 * Enum for local storage keys or data types.
 */
export enum DataItemType {
  Contacts = 'contacts',
  Tasks = 'tasks',
  Reminders = 'reminders',
  Appointments = 'appointments',
  CustomerData = 'customerData', // For ExcelData (imported data)
  LocalData = 'localData', // For a monolithic local data object if ever used
  LastSyncTime = 'lastSyncTime',
  OneDriveAccessToken = 'onedriveAccessToken',
  OneDriveRefreshToken = 'onedriveRefreshToken',
  GoogleDriveAccessToken = 'googledriveAccessToken',
  GoogleDriveRefreshToken = 'googledriveRefreshToken',
}

/**
 * Represents the structure of all local data managed by the CRM.
 * This can be used if storing all data under a single key,
 * or as a reference for individual item types.
 */
export interface LocalData {
  contacts?: Contact[];
  tasks?: Task[];
  reminders?: Reminder[];
  appointments?: Appointment[];
  customerData?: ExcelData; // For imported excel data
  lastSyncTime?: string; // ISO string
}

/**
 * Represents metadata for a file in cloud storage.
 */
export interface FileMetadata {
  id?: string;
  name?: string;
  lastModified?: string; // ISO string, or from provider
  modifiedTime?: string; // Specifically for Google Drive
  size?: number;
}

// Credentials structure from google-auth-library
export interface GoogleTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string | null;
  token_type?: string | null;
  expiry_date?: number | null;
}
