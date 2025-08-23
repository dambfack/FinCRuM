/**
 * Electron environment detection and utilities
 */

/**
 * Checks if the application is running in an Electron environment
 * @returns {boolean} True if running in Electron, false otherwise
 */
export function isElectron(): boolean {
  // Check if we're in a renderer process
  if (typeof window !== 'undefined' && (window as any).process && (window as any).process.type === 'renderer') {
    return true;
  }

  // Check if we're in the main process
  if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
    return true;
  }

  // Check for electron in user agent
  if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron')) {
    return true;
  }

  return false;
}

/**
 * Checks if Electron IPC is available
 * @returns {boolean} True if IPC is available, false otherwise
 */
export function isElectronIPCAvailable(): boolean {
  return typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
}

/**
 * Type definitions for Electron IPC API
 */
export interface ElectronAPI {
  openOAuthUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
  onOAuthCallback: (callback: (code: string) => void) => void;
  onOAuthError?: (callback: (error: string) => void) => void;
  removeOAuthListener: (callback: (code: string) => void) => void;
}

/**
 * Gets the Electron API if available
 * @returns {ElectronAPI | null} The Electron API or null if not available
 */
export function getElectronAPI(): ElectronAPI | null {
  if (isElectronIPCAvailable()) {
    return (window as any).electronAPI;
  }
  return null;
}