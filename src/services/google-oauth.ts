import { Auth } from 'googleapis';
import type { GoogleTokens } from '@/lib/types';

type OAuth2Client = Auth.OAuth2Client;
type Credentials = Auth.Credentials;

// Environment variables
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

/**
 * Checks if Google OAuth is properly configured
 */
export function isGoogleOAuthConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}

/**
 * Throws a configuration error for Google OAuth
 */
function throwConfigurationError(): never {
  throw new Error(
    'Google OAuth is not properly configured. Please set the following environment variables: ' +
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_GOOGLE_REDIRECT_URI'
  );
}

/**
 * Gets a new OAuth2 client instance
 */
export async function getOAuth2Client(): Promise<OAuth2Client> {
  if (!isGoogleOAuthConfigured()) {
    throwConfigurationError();
  }
  
  const { OAuth2Client: Client } = await import('google-auth-library');
  return new Client({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI
  });
}

/**
 * Generates Google OAuth authorization URL
 */
export async function generateGoogleAuthUrl(scopes: string[] = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/drive.file'
]): Promise<string> {
  if (!isGoogleOAuthConfigured()) {
    throwConfigurationError();
  }
  
  const client = await getOAuth2Client();
  
  // Generate a unique state parameter to prevent CSRF attacks and ensure fresh requests
  const state = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // This forces fresh consent and ensures refresh token
    include_granted_scopes: true,
    state: state
  });
  
  console.log('Generated OAuth URL with state:', state);
  return authUrl;
}

/**
 * Exchanges authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<Credentials> {
  if (!isGoogleOAuthConfigured()) {
    throwConfigurationError();
  }
  
  const client = await getOAuth2Client();
  
  console.log('Debug - Authorization code length:', code.length);
  console.log('Debug - Authorization code preview:', code.substring(0, 20) + '...');
  console.log('Debug - Client ID configured:', !!CLIENT_ID);
  console.log('Debug - Client Secret configured:', !!CLIENT_SECRET);
  console.log('Debug - Redirect URI:', REDIRECT_URI);
  
  try {
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token) {
      throw new Error('Failed to retrieve access token from Google.');
    }
    console.log('Token exchange successful, access token received');
    return tokens;
  } catch (error: any) {
    console.error('Error exchanging code for tokens:');
    console.error('- Error message:', error.message);
    console.error('- Error response data:', error.response?.data);
    console.error('- Error status:', error.response?.status);
    console.error('- Full error:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.message?.includes('invalid_grant')) {
      errorMessage = 'Authorization code has expired or been used already. Please try authenticating again.';
    } else if (error.message?.includes('redirect_uri_mismatch')) {
      errorMessage = 'OAuth redirect URI mismatch. Please check your Google OAuth configuration.';
    } else if (error.message?.includes('invalid_client')) {
      errorMessage = 'Invalid OAuth client configuration. Please check your Google OAuth credentials.';
    }
    
    throw new Error(`Failed to exchange authorization code for tokens: ${errorMessage}`);
  }
}

/**
 * Gets an authenticated OAuth2 client, refreshing tokens if necessary
 */
export async function getAuthenticatedClient(passedTokens: GoogleTokens): Promise<OAuth2Client> {
  if (!isGoogleOAuthConfigured()) {
    throwConfigurationError();
  }
  
  const client = await getOAuth2Client();
  client.setCredentials(passedTokens);

  // Check if token is expired or about to expire (within 1 minute)
  const isTokenExpired = passedTokens.expiry_date && passedTokens.expiry_date < Date.now() + 60000;
  
  if (isTokenExpired) {
    if (!passedTokens.refresh_token) {
      console.warn('Google access token expired, but no refresh token available. User needs to re-authenticate.');
      const error = new Error('Google access token expired and no refresh token is available. Please re-authenticate.');
      (error as any).statusCode = 401;
      throw error;
    }

    try {
      console.log('Google access token expired or expiring soon, attempting to refresh...');
      const { credentials } = await client.refreshAccessToken();
      
      // Update the tokens with the new credentials
      const updatedTokens: GoogleTokens = {
        ...passedTokens,
        access_token: credentials.access_token || undefined,
        expiry_date: credentials.expiry_date || undefined,
        // Keep the original refresh_token if a new one wasn't provided
        refresh_token: credentials.refresh_token || passedTokens.refresh_token
      };
      
      client.setCredentials(updatedTokens);
      console.log('Google access token refreshed successfully');
      
      return client;
      
    } catch (error: any) {
      console.error('Error refreshing Google access token:', error.response?.data || error.message);
      const err = new Error(
        `Failed to refresh Google access token: ${error.message || 'Unknown error'}. Please re-authenticate.`
      );
      (err as any).statusCode = error.response?.status || 500;
      throw err;
    }
  }
  
  return client;
}

/**
 * Revokes Google OAuth tokens
 */
export async function revokeGoogleTokens(accessToken: string): Promise<void> {
  if (!isGoogleOAuthConfigured()) {
    throwConfigurationError();
  }
  
  try {
    // Use the correct revocation endpoint with token as query parameter
    const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token revocation failed:', response.status, response.statusText, errorText);
      throw new Error(`Failed to revoke token: ${response.status} ${response.statusText}`);
    }

    console.log('Google OAuth tokens revoked successfully');
  } catch (error: any) {
    console.error('Error revoking Google OAuth tokens:', error.message);
    throw new Error(`Failed to revoke Google OAuth tokens: ${error.message}`);
  }
}