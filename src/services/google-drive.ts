
'use server';

import type { ExcelData, FileMetadata, GoogleTokens } from '@/lib/types';
import { google } from 'googleapis'; // For types if needed, direct fetch for API calls

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;


const CRM_DATA_FILENAME = 'finsculpt_crm_data.json';
const BASE_GDRIVE_URL = 'https://www.googleapis.com/drive/v3';
const BASE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';


async function getAuthenticatedClient(passedTokens: GoogleTokens): Promise<import('google-auth-library').OAuth2Client> {
  // Dynamically import to avoid issues in environments where 'google-auth-library' might not be fully tree-shaken or polyfilled for client
  const { OAuth2Client: Client } = await import('google-auth-library');
  const client = new Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  client.setCredentials(passedTokens);

  if (passedTokens.expiry_date && passedTokens.expiry_date < Date.now() + 60000) { // Refresh if expiring soon (60 seconds buffer)
    if (passedTokens.refresh_token) {
      try {
        console.log('Google Drive access token expired or expiring soon, attempting to refresh...');
        const { credentials } = await client.refreshAccessToken();
        client.setCredentials(credentials); 
        console.log('Google Drive access token refreshed.');
      } catch (refreshError: any) {
        console.error('Error refreshing Google Drive access token:', refreshError.response?.data || refreshError.message, 'Status Code:', refreshError.response?.status);
        const err = new Error(`Failed to refresh Google Drive access token. Please re-authenticate. Details: ${refreshError.message}`);
        (err as any).statusCode = refreshError.response?.status || 500; 
        throw err;
      }
    } else {
      console.warn('Google Drive access token expired, but no refresh token available. User may need to re-authenticate.');
      const err = new Error('Google Drive access token expired and no refresh token is available. Please re-authenticate.');
      (err as any).statusCode = 401; 
      throw err;
    }
  }
  return client;
}


async function handleGoogleDriveError(response: Response, operationName: string, requestUrl: string): Promise<never> {
  let apiMessage = response.statusText;
  let parsedErrorBody: any = null;
  let rawErrorText = '';

  try {
    rawErrorText = await response.text(); // Get raw text first
    if (rawErrorText) {
      try {
        parsedErrorBody = JSON.parse(rawErrorText);
        if (parsedErrorBody && parsedErrorBody.error && parsedErrorBody.error.message) {
          apiMessage = parsedErrorBody.error.message;
        } else if (parsedErrorBody && parsedErrorBody.message) {
          apiMessage = parsedErrorBody.message;
        } else if (parsedErrorBody && typeof parsedErrorBody === 'object' && Object.keys(parsedErrorBody).length > 0) {
          // Fallback if no standard error.message, but there's some JSON content
          apiMessage = `Received non-standard error object (Status ${response.status})`;
        } else {
          // If JSON is empty or not an error structure, use raw text if it's not too long
          apiMessage = rawErrorText.length < 200 ? rawErrorText : response.statusText;
        }
      } catch (jsonError) {
        // console.warn(`Could not parse error response body as JSON for Google Drive API ${operationName}. Raw text: ${rawErrorText}`);
        // Use raw text if JSON parsing fails and it's not too long, otherwise default to statusText
        apiMessage = rawErrorText.length < 200 && rawErrorText.trim().length > 0 ? rawErrorText : response.statusText;
      }
    }
  } catch (textError) {
    console.warn(`Could not read error response body as text for Google Drive API ${operationName} error:`, textError);
    // apiMessage remains response.statusText from initialization
  }

  const fullMessageForConsole = `Received API Error from Google Drive during ${operationName}: Status ${response.status} for ${requestUrl}. API Message: ${apiMessage}. Response body:`;
  console.error(
    fullMessageForConsole,
    parsedErrorBody || (rawErrorText ? `<Raw Text: ${rawErrorText.substring(0, 500)}...>` : '<empty or non-JSON response>')
  );

  let userFriendlyMessage = `Google Drive ${operationName} failed: ${apiMessage} (Status ${response.status})`;
  if (response.status === 401 || response.status === 403) {
    userFriendlyMessage = `Google Drive authentication failed during ${operationName} (Status ${response.status}): ${apiMessage}. Please try reconnecting Google Drive.`;
  }
  
  const error = new Error(userFriendlyMessage);
  (error as any).statusCode = response.status;
  (error as any).originalError = parsedErrorBody || rawErrorText; // Attach parsed body or raw text
  throw error;
}

async function findFileId(accessToken: string): Promise<string | null> {
  const query = `name='${CRM_DATA_FILENAME}' and 'root' in parents and trashed=false`;
  const url = `${BASE_GDRIVE_URL}/files?q=${encodeURIComponent(query)}&fields=files(id)`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      // This will throw, and the error will be caught by the calling function's try...catch
      await handleGoogleDriveError(response, "find file ID", url); 
    }

    const result = await response.json();
    return (result.files && result.files.length > 0) ? result.files[0].id : null;

  } catch (error) { 
    throw error; // Re-throw to be caught by caller (e.g., downloadFromGoogleDrive)
  }
}

export async function uploadToGoogleDrive(
  data: ExcelData,
  tokens: GoogleTokens
): Promise<{ success: boolean, newTokens?: GoogleTokens }> {
  if (!tokens.access_token && !tokens.refresh_token) throw new Error("Either access or refresh token is required for Google Drive upload.");
  
  const client = await getAuthenticatedClient(tokens);
  const currentAccessToken = client.credentials.access_token;
  if (!currentAccessToken) throw new Error("Failed to obtain a valid access token after potential refresh.");

  const fileId = await findFileId(currentAccessToken);
  const jsonData = JSON.stringify(data, null, 2);
  const fileContentBlob = new Blob([jsonData], { type: 'application/json' });

  let url: string;
  let method: string;
  let body: BodyInit;
  const headers: HeadersInit = { 'Authorization': `Bearer ${currentAccessToken}` };

  if (fileId) {
    url = `${BASE_UPLOAD_URL}/files/${fileId}?uploadType=media`;
    method = 'PATCH';
    body = fileContentBlob;
    headers['Content-Type'] = 'application/json';
  } else {
    url = `${BASE_UPLOAD_URL}/files?uploadType=multipart`;
    method = 'POST';
    const metadata = { name: CRM_DATA_FILENAME, mimeType: 'application/json', parents: ['root'] };
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', fileContentBlob, CRM_DATA_FILENAME);
    body = formData;
    // For multipart, Content-Type is set by FormData, do not set manually.
  }

  try {
    const response = await fetch(url, { method, headers, body });
    if (!response.ok) {
      await handleGoogleDriveError(response, fileId ? "update file" : "create file", url);
    }
    const responseData = await response.json();
    console.log(`Data successfully ${fileId ? 'updated' : 'created'} in Google Drive:`, responseData.name || CRM_DATA_FILENAME);
    return { success: true, newTokens: client.credentials };
  } catch (error) {
    throw error;
  }
}

export async function downloadFromGoogleDrive(
  tokens: GoogleTokens
): Promise<{ data: ExcelData | null, newTokens?: GoogleTokens }> {
  if (!tokens.access_token && !tokens.refresh_token) throw new Error("Either access or refresh token is required for Google Drive download.");

  const client = await getAuthenticatedClient(tokens);
  const currentAccessToken = client.credentials.access_token;
   if (!currentAccessToken) throw new Error("Failed to obtain a valid access token after potential refresh for download.");

  const fileId = await findFileId(currentAccessToken);
  if (!fileId) {
    console.log(`Google Drive file '${CRM_DATA_FILENAME}' not found.`);
    return { data: null, newTokens: client.credentials };
  }

  const url = `${BASE_GDRIVE_URL}/files/${fileId}?alt=media`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${currentAccessToken}` },
    });

    if (response.status === 404) { // Should ideally be caught by findFileId, but good to double check
      console.log(`Google Drive file '${CRM_DATA_FILENAME}' (ID: ${fileId}) not found during download attempt.`);
      return { data: null, newTokens: client.credentials };
    }
    if (!response.ok) {
      await handleGoogleDriveError(response, "download file", url);
    }
    
    const textData = await response.text();
    if (!textData) {
      console.warn(`Google Drive file '${CRM_DATA_FILENAME}' (ID: ${fileId}) was empty.`);
      return { data: null, newTokens: client.credentials };
    }

    const jsonData = JSON.parse(textData);
    // Basic validation for ExcelData structure
    if (jsonData && Array.isArray(jsonData.headers) && Array.isArray(jsonData.rows) && jsonData.rows.every((r: any) => Array.isArray(r))) {
      return { data: jsonData as ExcelData, newTokens: client.credentials };
    } else {
      console.warn(`Downloaded data from Google Drive ('${CRM_DATA_FILENAME}') has unexpected format. Raw data:`, textData.substring(0,500));
      const err = new Error(`Invalid data format in Google Drive file '${CRM_DATA_FILENAME}'.`);
      (err as any).statusCode = 500; 
      throw err;
    }
  } catch (error) {
    if (error instanceof SyntaxError) { // From JSON.parse(textData)
      const err = new Error(`Invalid JSON format in Google Drive file '${CRM_DATA_FILENAME}'.`);
      (err as any).statusCode = 500; 
      throw err;
    }
    throw error; // Re-throw other errors (like those from handleGoogleDriveError or getAuthenticatedClient)
  }
}

export async function fetchFileMetadata(
  tokens: GoogleTokens
): Promise<{ metadata: FileMetadata | null, newTokens?: GoogleTokens }> {
  if (!tokens.access_token && !tokens.refresh_token) throw new Error("Either access or refresh token is required for fetching Google Drive metadata.");

  const client = await getAuthenticatedClient(tokens);
  const currentAccessToken = client.credentials.access_token;
  if (!currentAccessToken) throw new Error("Failed to obtain a valid access token after potential refresh for metadata fetch.");

  const fileId = await findFileId(currentAccessToken);
  if (!fileId) {
    return { metadata: null, newTokens: client.credentials };
  }

  const url = `${BASE_GDRIVE_URL}/files/${fileId}?fields=id,name,modifiedTime,size`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${currentAccessToken}` },
    });
    if (!response.ok) {
      await handleGoogleDriveError(response, "fetch file metadata", url);
    }
    const fileMetadata = await response.json();
    return {
        metadata: {
            id: fileMetadata.id,
            name: fileMetadata.name,
            lastModified: fileMetadata.modifiedTime, // Google Drive uses modifiedTime
            modifiedTime: fileMetadata.modifiedTime, // Explicitly add this as per type
            size: fileMetadata.size ? parseInt(fileMetadata.size, 10) : undefined,
        } as FileMetadata,
        newTokens: client.credentials
    };
  } catch (error) {
    throw error;
  }
}

