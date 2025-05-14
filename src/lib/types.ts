
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
 * Represents metadata for a file attached to a contact.
 */
export interface FileAttachmentMeta {
  id: string; // Unique identifier for the attachment (and key for IndexedDB)
  name: string; // Original name of the file
  type: string; // MIME type of the file
  size: number; // Size of the file in bytes
  contactId: string; // ID of the contact this file is attached to
  createdAt: string; // ISO date string of when it was attached
  encrypted: boolean; // Flag indicating if the file is (intended to be) encrypted
}

/**
 * Represents a user in the system.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'partner' | 'employee';
  pin?: string; // Optional 4-digit PIN, stored as string
  profilePictureUrl?: string; // Optional: Stores image as a data URI
}

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
  status?: 'open' | 'closed' | 'missed' | 'other'; // Deal status
  createdAt: Date | string;
  updatedAt: Date | string;
  attachments?: FileAttachmentMeta[]; // Array of file attachment metadata
  assignedToUserId?: string; // ID of the user this contact is assigned to
  contactStatus?: 'approved' | 'pending_approval' | 'pending_deletion'; // Approval status of the contact record itself
  changeProposal?: Partial<Contact>; // Stores proposed changes by an employee, awaiting approval
  lastModifiedByRole?: 'partner' | 'employee'; // Role of the user who last modified/proposed changes
  profilePictureUrl?: string; // Optional: Stores image as a data URI
}

/**
 * Represents a single item in a task's checklist.
 */
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
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
  associatedContactId?: string; // Optional: ID of the contact this task is for
  checklist?: ChecklistItem[]; // Optional: Array of checklist items
  createdAt: Date | string;
  updatedAt: Date | string;
  googleCalendarEventId?: string; // Optional - Event ID for Google Calendar
  assignedToUserId?: string; // ID of the user this task is assigned to
}

/**
 * Represents a reminder.
 */
export interface Reminder {
  id: string; // Unique identifier
  title: string;
  description?: string; // Optional
  dateTime: Date | string;
  completed: boolean;
  associatedContactId?: string; // Optional: ID of the contact this reminder is for
  createdAt: Date | string;
  updatedAt: Date | string;
  googleCalendarEventId?: string; // Optional - Event ID for Google Calendar
  googleCalendarStatus?: 'confirmed' | 'tentative' | 'cancelled'; // Optional
  dismissed?: boolean; // Optional
  assignedToUserId?: string; // ID of the user this reminder is assigned to
}

/**
 * Represents an attendee for an appointment.
 */
export interface AppointmentAttendee {
  email: string;
  displayName?: string; // Optional, could be contact's name or the typed email/name
  contactId?: string; // If this attendee is an existing contact
}


/**
 * Represents an appointment.
 */
export interface Appointment {
  id: string; // Unique identifier
  title: string;
  description?: string; // Optional
  date: Date | string;
  time: string;
  start?: Date | string;
  end?: Date | string;
  location?: string; // Optional
  invitedContacts?: string[]; // Array of contact IDs (can be derived from attendeesList or kept for legacy)
  attendeesList?: AppointmentAttendee[]; // New field to store detailed attendees
  createdAt: Date | string;
  updatedAt: Date | string;
  googleCalendarEventId?: string; // Optional - Event ID for Google Calendar
  googleCalendarStatus?: 'confirmed' | 'tentative' | 'cancelled'; // Optional
  assignedToUserId?: string; // ID of the user this appointment is assigned to
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
  Users = 'users',
  CurrentUserId = 'currentUserId', // Added for storing logged-in user ID
  Notifications = 'notifications', // For notifications
  AppLogo = 'appLogo', // For storing custom app logo data URI (current override) - DEPRECATED
  DefaultAppLogo = 'defaultAppLogo', // For storing the user-set default app logo - DEPRECATED
  HeaderLogo = 'headerLogo', // For storing custom header text logo - DEPRECATED
  AppLogoLight = 'appLogoLight',
  AppLogoDark = 'appLogoDark',
  DefaultAppLogoLight = 'defaultAppLogoLight',
  DefaultAppLogoDark = 'defaultAppLogoDark',
  HeaderLogoLight = 'headerLogoLight',
  HeaderLogoDark = 'headerLogoDark',
  BackgroundImage = 'backgroundImage', // For current custom background override
  DefaultBackgroundImage = 'defaultBackgroundImage', // For user-set default background
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
  users?: User[]; // Added users
  notifications?: Notification[]; // Added notifications
  customerData?: ExcelData; // For imported excel data
  lastSyncTime?: string; // ISO string
  appLogoLight?: string;
  appLogoDark?: string;
  defaultAppLogoLight?: string;
  defaultAppLogoDark?: string;
  headerLogoLight?: string;
  headerLogoDark?: string;
  backgroundImage?: string; // Data URI for current custom background
  defaultBackgroundImage?: string; // Data URI for user-set default background
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

// Notification type
export interface Notification {
  id: string;
  recipientUserId: string; // The user who should see this notification
  type: 'assignment' | 'approval_request' | 'info';
  title: string;
  message: string;
  relatedItemId?: string; // ID of the Contact, Task, etc.
  relatedItemType?: DataItemType; // e.g., DataItemType.Contacts
  createdAt: string; // ISO date string
  read: boolean;
  payload?: any; // For approval_request, might contain proposed changes or original item details
}
