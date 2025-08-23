
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
 * Represents a user in the system with cloud-first multi-user support.
 */
export interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: 'admin' | 'partner' | 'employee';
  department?: string;
  phone?: string;
  pin?: string; // Optional 4-digit PIN, stored as string
  profilePictureUrl?: string; // Optional: Stores image as a data URI
  cloudPinHash?: string; // Cloud-stored hashed PIN for multi-device access
  deviceIds?: string[]; // List of authorized device IDs
  permissions?: UserPermissions; // Role-based permissions
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
  lastLoginAt?: string; // ISO date string
  isActive?: boolean; // Account status
  createdByUserId?: string; // ID of admin/partner who created this account
}

/**
 * Defines user permissions based on role.
 */
export interface UserPermissions {
  canCreateUsers: boolean;
  canDeleteUsers: boolean;
  canModifyUsers: boolean;
  canManageUsers: boolean;
  canViewAllContacts: boolean;
  canModifyAllContacts: boolean;
  canDeleteContacts: boolean;
  canApproveChanges: boolean;
  canAccessReports: boolean;
  canManageSettings: boolean;
  canSyncToCloud: boolean;
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
  dueTime?: string; // Optional - Time in HH:MM format, if not set task is all-day
  completed: boolean;
  priority?: 'high' | 'medium' | 'low'; // Optional
  status?: 'todo' | 'in-progress' | 'done'; // Optional
  associatedContactId?: string; // Optional: ID of the contact this task is for
  checklist?: ChecklistItem[]; // Optional: Array of checklist items
  isRepetitive?: boolean; // Optional - Whether this is a repetitive task
  repetitionType?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'; // Optional - Type of repetition
  repetitionDays?: number[]; // Optional - Days of week for weekly repetition (0=Sunday, 1=Monday, etc.)
  repetitionInterval?: number; // Optional - Interval for repetition (e.g., every 2 weeks)
  createdAt: Date | string;
  updatedAt: Date | string;
  googleCalendarEventId?: string; // Optional - Event ID for Google Calendar
  googleTaskId?: string; // ID for Google Tasks (different from calendar events)
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
  id: string; // Unique identifier for the conflict
  dataType: string; // Type of data that has conflict (e.g., 'contacts', 'tasks')
  itemId: string; // ID of the specific item with conflict
  reason: string; // Reason for the conflict
  rowIndex: number; // Index of the row with conflict
  localValue: string[];
  cloudValue: string[];
  resolvedValue?: string[]; // Optional field for resolved data
  headers?: string[]; // Optional: Include headers for context in UI
  status?: 'pending' | 'resolved'; // Status of the conflict
  timestamp?: string; // When the conflict was detected
  resolution?: 'local' | 'remote' | 'merge'; // How the conflict was resolved
  mergedData?: any; // Data used for merge resolution
  resolvedAt?: string; // When the conflict was resolved
  itemType?: string; // Type of item (for compatibility with useConflictResolution)
  localData?: any; // Local data (for compatibility with useConflictResolution)
  remoteData?: any; // Remote data (for compatibility with useConflictResolution)
  conflictType?: 'update' | 'delete' | 'create'; // Type of conflict
}

/**
 * User-specific theme settings.
 */
export type ChartColorKeys = 'open' | 'closed' | 'missed' | 'other';

export interface UserThemeSettings {
  accentColor?: string | null; // Hex string
  chartPieColorOpen?: string | null; // Hex string
  chartPieColorClosed?: string | null; // Hex string
  chartPieColorMissed?: string | null; // Hex string
  chartPieColorOther?: string | null; // Hex string
  chartColors?: Record<ChartColorKeys, string>; // Chart color configuration
}

/**
 * Stores theme preferences for all users.
 * Key is userId, value is UserThemeSettings.
 */
export type UserPreferences = Record<string, UserThemeSettings>;


/**
 * Enum for local storage keys or data types.
 */
export enum DataItemType {
  Contacts = 'contacts',
  Tasks = 'tasks',
  Reminders = 'reminders',
  Appointments = 'appointments',
  Users = 'users',
  Notifications = 'notifications',
  CustomerData = 'customerData',
  CurrentUser = 'currentUser',
  CurrentUserId = 'currentUserId',
  LastSyncTime = 'lastSyncTime',
  ThemePreference = 'themePreference',
  UserThemeSettings = 'userThemeSettings',
  BackgroundImage = 'backgroundImage',
  DefaultBackgroundImage = 'defaultBackgroundImage',
  HeaderLogoDark = 'headerLogoDark',
  HeaderLogoLight = 'headerLogoLight',
  DefaultHeaderLogoDark = 'defaultHeaderLogoDark',
  DefaultHeaderLogoLight = 'defaultHeaderLogoLight',
  ConflictResolutionLog = 'conflictResolutionLog',
  SetupCompleted = 'setup_completed',
  CloudSyncConfig = 'cloud_sync_config',
  RateLimiterConfig = 'rate_limiter_config',
  RateLimiterState = 'rate_limiter_state',
  SyncBuffer = 'sync_buffer',
  SyncConflicts = 'sync_conflicts',
  SyncBufferConfig = 'sync_buffer_config',
  SyncSettings = 'sync_settings',
  GoogleDriveConnected = 'google_drive_connected',
  GoogleLastSync = 'google_last_sync',
  MicrosoftDriveConnected = 'microsoft_drive_connected',
  MicrosoftLastSync = 'microsoft_last_sync',
  UserProfile = 'user_profile',
  // OAuth Token Storage Keys
  GoogleDriveAccessToken = 'google_drive_access_token',
  GoogleDriveRefreshToken = 'google_drive_refresh_token',
  GoogleCalendarAccessToken = 'google_calendar_access_token',
  GoogleCalendarRefreshToken = 'google_calendar_refresh_token',
  OneDriveAccessToken = 'onedrive_access_token',
  OneDriveRefreshToken = 'onedrive_refresh_token',
  MicrosoftAccessToken = 'microsoft_access_token',
  MicrosoftRefreshToken = 'microsoft_refresh_token',
  CloudProvider = 'cloud_provider',
  DeviceRegistration = 'device_registration',
  UserAccountSyncConfig = 'user_account_sync_config',
  UserAccountSyncData = 'user_account_sync_data',
  UserAccountConflicts = 'user_account_conflicts',
  AutoSyncEnabled = 'autoSyncEnabled',
  AutoSyncInterval = 'autoSyncInterval',
  ConflictResolutionStrategy = 'conflictResolutionStrategy',
  DeviceAuthRequests = 'deviceAuthRequests',
  RegisteredDevices = 'registeredDevices',
  DeviceSyncStatuses = 'deviceSyncStatuses',
  SyncQueue = 'syncQueue',
  OptimisticUpdates = 'optimisticUpdates',
  UnresolvedConflicts = 'unresolvedConflicts'
}

/**
 * Represents the structure of all local data managed by the CRM.
 */
export interface LocalData {
  contacts?: Contact[];
  tasks?: Task[];
  reminders?: Reminder[];
  appointments?: Appointment[];
  users?: User[];
  notifications?: Notification[];
  customerData?: ExcelData;
  lastSyncTime?: string;
  headerLogoLight?: string | null;
  headerLogoDark?: string | null;
  defaultHeaderLogoLight?: string | null; // New
  defaultHeaderLogoDark?: string | null;  // New
  backgroundImage?: string | null;
  defaultBackgroundImage?: string | null;
  userThemePreferences?: UserPreferences;
  // Cross-device user account synchronization
  userAccountSyncData?: UserAccountSyncData;
  userAccountSyncConfig?: UserAccountSyncConfig;
  deviceRegistration?: DeviceRegistration;
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

// Microsoft OAuth tokens structure
export interface MicrosoftTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  expires_in?: number | null;
  token_type?: string | null;
  scope?: string | null;
  expires_at?: number | null; // Timestamp when token expires
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

export interface ConflictResolutionEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  dataType: DataItemType;
  itemId: string;
  action: 'manual_override' | 'user_choice' | 'merge_conflict';
  conflictDetails: {
    localVersion: any;
    cloudVersion: any;
    resolvedVersion: any;
    resolutionReason: string;
  };
  description: string;
}

export interface ConflictResolution {
  action: 'keep_local' | 'keep_cloud' | 'merge_manual' | 'skip';
  mergedData?: any;
  reason?: string;
}

export interface DataConflictWithResolution extends Omit<DataConflict, 'resolution'> {
  resolution?: ConflictResolution;
  resolvedAt?: string;
  resolvedBy?: string;
}

/**
 * Detailed conflict tracking for cloud sync operations
 */
export interface SyncConflictDetails {
  id: string;
  timestamp: string;
  dataType: DataItemType;
  itemId: string;
  conflictType: 'timestamp_mismatch' | 'content_difference' | 'deletion_conflict' | 'creation_conflict';
  localData: any;
  cloudData: any;
  resolvedData?: any;
  resolutionMethod: 'local_wins' | 'cloud_wins' | 'manual_merge' | 'auto_merge' | 'pending';
  resolutionReason: string;
  userId?: string;
  deviceId?: string;
}

/**
 * Conflict tracking result for sync operations
 */
export interface ConflictTrackingResult {
  conflicts: SyncConflictDetails[];
  autoResolved: number;
  manualResolutionRequired: number;
  totalConflicts: number;
}

/**
 * Encrypted user account data for cross-device synchronization
 */
export interface EncryptedUserAccount {
  id: string;
  username: string;
  encryptedPassword: {
    encryptedData: string; // Base64 encoded
    salt: string; // Base64 encoded
    iv: string; // Base64 encoded
    algorithm: string;
    keyDerivation: string;
  };
  role: 'admin' | 'partner' | 'employee';
  permissions: UserPermissions;
  profileData: {
    name: string;
    email: string;
    profilePictureUrl?: string;
    createdAt: string;
    lastLoginAt?: string;
    isActive: boolean;
    createdByUserId?: string;
  };
  deviceOrigin: string; // Device ID where account was created/last modified
  lastModified: string; // ISO timestamp
  syncVersion: number; // Version for conflict resolution
}

/**
 * Device registration and trust information
 */
export interface DeviceRegistration {
  deviceId: string;
  deviceName: string;
  deviceFingerprint: {
    userAgent: string;
    screenResolution: string;
    timezone: string;
    language: string;
    platform: string;
  };
  registrationToken: string;
  registeredAt: string; // ISO timestamp
  lastActiveAt: string; // ISO timestamp
  isActive: boolean;
  cloudProvider: CloudProvider;
  encryptionKeyVersion: number;
}

/**
 * Cross-device user account synchronization data
 */
export interface UserAccountSyncData {
  encryptedAccounts: EncryptedUserAccount[];
  deviceRegistrations: DeviceRegistration[];
  masterDeviceId?: string; // First device that set up encryption
  syncVersion: number;
  lastSyncAt: string; // ISO timestamp
  conflictResolutionLog: UserAccountConflict[];
}

/**
 * User account conflict information
 */
export interface UserAccountConflict {
  id: string;
  timestamp: string;
  username: string;
  conflictType: 'password_mismatch' | 'permission_difference' | 'profile_difference' | 'device_conflict';
  localAccount: EncryptedUserAccount;
  cloudAccount: EncryptedUserAccount;
  resolvedAccount?: EncryptedUserAccount;
  resolutionMethod: 'local_wins' | 'cloud_wins' | 'manual_merge' | 'user_choice' | 'pending';
  resolutionReason: string;
  deviceId: string;
  requiresUserInput: boolean;
}

/**
 * User account sync configuration
 */
export interface UserAccountSyncConfig {
  enabled: boolean;
  autoResolveConflicts: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  encryptionEnabled: boolean;
  deviceTrustRequired: boolean;
  maxDevices: number;
  passwordExpiryDays: number;
}
