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
export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'failed';

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
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a task.
 */
export interface Task {
  id: string; // Unique identifier
  title: string;
  description?: string; // Optional
  dueDate: Date;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low'; // Optional
  createdAt: Date;
  googleCalendarEventId?: string; // Optional - Event ID for Google Calendar
  updatedAt: Date;
}

/**
 * Represents a reminder.
 */
export interface Reminder {
  id: string; // Unique identifier
  title: string;
  description?: string; // Optional
  remindAt: Date;
  completed: boolean;
  createdAt: Date;
    googleCalendarEventId?: string; // Optional - Event ID for Google Calendar
    googleCalendarStatus?: 'confirmed' | 'tentative' | 'cancelled';
  updatedAt: Date;
}

/**
 * Represents an appointment.
 */
export interface Appointment {
  id: string; // Unique identifier
  title: string;
  description?: string; // Optional
  start: Date;
  end: Date;
  location?: string; // Optional
  attendees?: Contact[]; // Optional - link to contacts
  createdAt: Date;
    googleCalendarEventId?: string; // Optional - Event ID for Google Calendar
    googleCalendarStatus?: 'confirmed' | 'tentative' | 'cancelled';
  updatedAt: Date;
}





/**
 * Represents authentication information for cloud storage services.
 * Represents authentication information for cloud storage services.
 */
export interface CloudAuthInfo {
  accessToken: string;
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
