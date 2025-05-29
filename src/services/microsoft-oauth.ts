import type { MicrosoftTokens } from '@/lib/types';

// Environment variables for Microsoft OAuth
const CLIENT_ID = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI;
const TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common'; // 'common' allows personal and work accounts

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error("Microsoft OAuth environment variables (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI) are not fully set.");
}

const MICROSOFT_AUTH_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`;
const MICROSOFT_TOKEN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

/**
 * Generates Microsoft OAuth authorization URL
 */
export async function generateMicrosoftAuthUrl(scopes: string[] = [
  'https://graph.microsoft.com/Calendars.ReadWrite',
  'https://graph.microsoft.com/Files.ReadWrite',
  'offline_access'
]): Promise<string> {
  // Generate a unique state parameter to prevent CSRF attacks
  const state = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    response_type: 'code',
    redirect_uri: REDIRECT_URI!,
    scope: scopes.join(' '),
    state: state,
    prompt: 'consent', // Force fresh consent to ensure refresh token
    response_mode: 'query'
  });
  
  const authUrl = `${MICROSOFT_AUTH_URL}?${params.toString()}`;
  
  console.log('Generated Microsoft OAuth URL with state:', state);
  return authUrl;
}

/**
 * Exchanges authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<MicrosoftTokens> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    code: code,
    redirect_uri: REDIRECT_URI!,
    grant_type: 'authorization_code'
  });

  try {
    const response = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Microsoft token exchange failed:', errorData);
      throw new Error(`Failed to exchange code for tokens: ${response.statusText}`);
    }

    const data = await response.json();
    
    const tokens: MicrosoftTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
      expires_at: Date.now() + (data.expires_in * 1000) // Calculate expiration timestamp
    };

    console.log('Successfully exchanged code for Microsoft tokens');
    return tokens;
    
  } catch (error: any) {
    console.error('Error exchanging code for Microsoft tokens:', error);
    throw new Error(`Failed to exchange authorization code: ${error.message}`);
  }
}

/**
 * Refreshes Microsoft access token using refresh token
 */
export async function refreshMicrosoftTokens(refreshToken: string): Promise<MicrosoftTokens> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  try {
    const response = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Microsoft token refresh failed:', errorData);
      throw new Error(`Failed to refresh tokens: ${response.statusText}`);
    }

    const data = await response.json();
    
    const tokens: MicrosoftTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken, // Keep existing refresh token if not provided
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
      expires_at: Date.now() + (data.expires_in * 1000)
    };

    console.log('Successfully refreshed Microsoft tokens');
    return tokens;
    
  } catch (error: any) {
    console.error('Error refreshing Microsoft tokens:', error);
    throw new Error(`Failed to refresh tokens: ${error.message}`);
  }
}

/**
 * Gets a valid access token, refreshing if necessary
 */
export async function getValidMicrosoftToken(tokens: MicrosoftTokens): Promise<{ accessToken: string, newTokens?: MicrosoftTokens }> {
  // Check if token is expired (with 5 minute buffer)
  const now = Date.now();
  const expiresAt = tokens.expires_at || 0;
  const bufferTime = 5 * 60 * 1000; // 5 minutes
  
  if (expiresAt > now + bufferTime && tokens.access_token) {
    // Token is still valid
    return { accessToken: tokens.access_token };
  }
  
  // Token is expired or about to expire, refresh it
  if (!tokens.refresh_token) {
    throw new Error('No refresh token available. User needs to re-authenticate.');
  }
  
  try {
    const newTokens = await refreshMicrosoftTokens(tokens.refresh_token);
    return { 
      accessToken: newTokens.access_token!, 
      newTokens 
    };
  } catch (error: any) {
    console.error('Failed to refresh Microsoft tokens:', error);
    throw new Error('Token refresh failed. User needs to re-authenticate.');
  }
}

/**
 * Makes an authenticated request to Microsoft Graph API
 */
export async function makeAuthenticatedRequest(
  url: string,
  tokens: MicrosoftTokens,
  options: RequestInit = {}
): Promise<{ response: Response, newTokens?: MicrosoftTokens }> {
  const { accessToken, newTokens } = await getValidMicrosoftToken(tokens);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  return { response, newTokens };
}