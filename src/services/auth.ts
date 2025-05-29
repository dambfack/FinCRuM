
import type { CloudAuthInfo, GoogleTokens, MicrosoftTokens } from '@/lib/types';
import { DataItemType } from '@/lib/types';

// Enhanced auth info structure for multiple providers
interface AuthInfo {
  googleTokens?: GoogleTokens;
  microsoftTokens?: MicrosoftTokens;
}

// Get comprehensive auth info for all providers
export const getAuthInfo = async (): Promise<AuthInfo | null> => {
  if (typeof window !== 'undefined') {
    const googleTokens = getGoogleTokens();
    const microsoftTokens = getMicrosoftTokens();
    
    if (googleTokens || microsoftTokens) {
      return { googleTokens: googleTokens || undefined, microsoftTokens: microsoftTokens || undefined };
    }
    return null;
  }
  return null;
};

// Legacy function for backward compatibility
export const getLegacyAuthInfo = async (provider: 'onedrive' | 'googledrive'): Promise<CloudAuthInfo | null> => {
  if (typeof window !== 'undefined') {
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    if (provider === 'googledrive') {
      accessToken = localStorage.getItem(DataItemType.GoogleDriveAccessToken);
      refreshToken = localStorage.getItem(DataItemType.GoogleDriveRefreshToken);
    } else if (provider === 'onedrive') {
      accessToken = localStorage.getItem(DataItemType.OneDriveAccessToken);
      // refreshToken = localStorage.getItem(DataItemType.OneDriveRefreshToken); // If you add OneDrive refresh tokens
    }

    if (accessToken) {
      return { accessToken, refreshToken: refreshToken || undefined, provider };
    }
    return null;
  }
  return null;
};

// Helper to get GoogleTokens specifically, might be used by client before calling server actions
export const getGoogleTokens = (): GoogleTokens | null => {
  if (typeof window === 'undefined') return null;
  const access_token = localStorage.getItem(DataItemType.GoogleDriveAccessToken);
  const refresh_token = localStorage.getItem(DataItemType.GoogleDriveRefreshToken);
  const expiry_date_str = localStorage.getItem('googleDriveTokenExpiry');
  const expiry_date = expiry_date_str ? parseInt(expiry_date_str, 10) : null;

  if (access_token) {
    return { access_token, refresh_token, expiry_date };
  }
  return null;
};

// Helper to get MicrosoftTokens specifically
export const getMicrosoftTokens = (): MicrosoftTokens | null => {
  if (typeof window === 'undefined') return null;
  const access_token = localStorage.getItem('microsoftAccessToken');
  const refresh_token = localStorage.getItem('microsoftRefreshToken');
  const expires_at_str = localStorage.getItem('microsoftTokenExpiry');
  const expires_at = expires_at_str ? parseInt(expires_at_str, 10) : null;
  const token_type = localStorage.getItem('microsoftTokenType') || 'Bearer';
  const scope = localStorage.getItem('microsoftTokenScope');

  if (access_token) {
    return { access_token, refresh_token, expires_at, token_type, scope };
  }
  return null;
};

// Update auth info (for server actions to save refreshed tokens)
export const updateAuthInfo = async (authInfo: Partial<AuthInfo>): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  // Update Google tokens if provided
  if (authInfo.googleTokens) {
    const tokens = authInfo.googleTokens;
    if (tokens.access_token) {
      localStorage.setItem(DataItemType.GoogleDriveAccessToken, tokens.access_token);
    }
    if (tokens.refresh_token) {
      localStorage.setItem(DataItemType.GoogleDriveRefreshToken, tokens.refresh_token);
    }
    if (tokens.expiry_date) {
      localStorage.setItem('googleDriveTokenExpiry', tokens.expiry_date.toString());
    }
  }
  
  // Update Microsoft tokens if provided
  if (authInfo.microsoftTokens) {
    const tokens = authInfo.microsoftTokens;
    if (tokens.access_token) {
      localStorage.setItem('microsoftAccessToken', tokens.access_token);
    }
    if (tokens.refresh_token) {
      localStorage.setItem('microsoftRefreshToken', tokens.refresh_token);
    }
    if (tokens.expires_at) {
      localStorage.setItem('microsoftTokenExpiry', tokens.expires_at.toString());
    }
    if (tokens.token_type) {
      localStorage.setItem('microsoftTokenType', tokens.token_type);
    }
    if (tokens.scope) {
      localStorage.setItem('microsoftTokenScope', tokens.scope);
    }
  }
};

// Save Microsoft tokens to localStorage
export const saveMicrosoftTokens = (tokens: MicrosoftTokens): void => {
  if (typeof window === 'undefined') return;
  
  if (tokens.access_token) {
    localStorage.setItem('microsoftAccessToken', tokens.access_token);
  }
  if (tokens.refresh_token) {
    localStorage.setItem('microsoftRefreshToken', tokens.refresh_token);
  }
  if (tokens.expires_at) {
    localStorage.setItem('microsoftTokenExpiry', tokens.expires_at.toString());
  }
  if (tokens.token_type) {
    localStorage.setItem('microsoftTokenType', tokens.token_type);
  }
  if (tokens.scope) {
    localStorage.setItem('microsoftTokenScope', tokens.scope);
  }
};

// Clear Microsoft tokens from localStorage
export const clearMicrosoftTokens = (): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('microsoftAccessToken');
  localStorage.removeItem('microsoftRefreshToken');
  localStorage.removeItem('microsoftTokenExpiry');
  localStorage.removeItem('microsoftTokenType');
  localStorage.removeItem('microsoftTokenScope');
};

// Check if Microsoft is authenticated
export const isMicrosoftAuthenticated = (): boolean => {
  const tokens = getMicrosoftTokens();
  return !!(tokens?.access_token);
};

// Check if Google is authenticated
export const isGoogleAuthenticated = (): boolean => {
  const tokens = getGoogleTokens();
  return !!(tokens?.access_token);
};
