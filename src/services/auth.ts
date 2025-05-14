
import type { CloudAuthInfo, GoogleTokens } from '@/lib/types';
import { DataItemType } from '@/lib/types';

// This function is becoming less relevant as services handle their own token retrieval.
// It can still serve as a quick check for UI purposes if a token *key* exists.
export const getAuthInfo = async (provider: 'onedrive' | 'googledrive'): Promise<CloudAuthInfo | null> => {
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
    // console.warn(`No access token found in localStorage for ${provider}.`);
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
