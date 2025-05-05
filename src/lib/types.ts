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
}
