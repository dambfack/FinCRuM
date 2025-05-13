import type { ExcelData, FileMetadata } from '@/lib/types';
// Buffer import is not typically needed in modern Node.js/browser environments for string to Blob conversion.
// If it were for specific Buffer operations, ensure it's correctly polyfilled or handled for the target environment.
// For this context, it seems unused.

/** 
 * Represents the authentication information for Google Drive.
 */
export interface GoogleDriveAuthInfo {
  accessToken: string;
}

// Use a consistent filename for storing the CRM data on Google Drive
const CRM_DATA_FILENAME = 'finsculpt_crm_data.json';
const BASE_GDRIVE_URL = 'https://www.googleapis.com/drive/v3';
const BASE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

/**
 * Handles API errors from Google Drive, parsing the response and throwing a standardized error.
 * @param response The fetch Response object.
 * @param operationName The name of the operation being performed (e.g., "find file", "upload").
 * @param requestUrl The URL that was requested.
 * @throws Will throw an error with a detailed message.
 */
async function handleGoogleDriveError(response: Response, operationName: string, requestUrl: string): Promise<never> {
  let apiMessage = response.statusText;
  let parsedErrorBody: any = null;
  try {
    parsedErrorBody = await response.json();
    if (parsedErrorBody && parsedErrorBody.error && parsedErrorBody.error.message) {
      apiMessage = parsedErrorBody.error.message;
    } else if (parsedErrorBody && parsedErrorBody.message) {
      apiMessage = parsedErrorBody.message;
    }
  } catch (e) {
    // console.warn(`Could not parse error response body as JSON for Google Drive API ${operationName} error.`);
  }

  console.error(
    `Received API Error from Google Drive during ${operationName}: Status ${response.status} for ${requestUrl}. API Message: ${apiMessage}. Response body:`,
    parsedErrorBody || '<empty or non-JSON response>'
  );

  let userFriendlyMessage = `Google Drive ${operationName} failed: ${apiMessage} (Status ${response.status})`;
  if (response.status === 401 || response.status === 403) {
    userFriendlyMessage = `Google Drive authentication failed during ${operationName} (Status ${response.status}): ${apiMessage}. Please try reconnecting Google Drive.`;
  }
  
  throw new Error(userFriendlyMessage);
}


/**
 * Finds the file ID of the CRM data file in Google Drive.
 *
 * @param authInfo The authentication information for Google Drive.
 * @returns A promise that resolves to the file ID string or null if not found.
 * @throws Will throw an error if the API request fails.
 */
async function findFileId(authInfo: GoogleDriveAuthInfo): Promise<string | null> {
  const query = `name='${CRM_DATA_FILENAME}' and 'root' in parents and trashed=false`;
  const url = `${BASE_GDRIVE_URL}/files?q=${encodeURIComponent(query)}&fields=files(id)`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authInfo.accessToken}`,
      },
    });

    if (!response.ok) {
      // This will throw an error, so the function execution stops here.
      await handleGoogleDriveError(response, "find file ID", url);
    }

    const result = await response.json();
    if (result.files && result.files.length > 0) {
      return result.files[0].id;
    }
    return null; // File not found

  } catch (error) {
     // If handleGoogleDriveError threw, or fetch itself threw, re-throw.
     // console.error('Error during Google Drive find file request:', error);
    throw error;
  }
}

/**
 * Asynchronously uploads CRM data (as JSON) to a specific file in Google Drive.
 * Creates the file if it doesn't exist, otherwise updates it.
 *
 * @param data The ExcelData object to upload.
 * @param authInfo The authentication information for Google Drive.
 * @returns A promise that resolves when the data is uploaded successfully.
 * @throws Will throw an error if the upload fails.
 */
export async function uploadToGoogleDrive(data: ExcelData, authInfo: GoogleDriveAuthInfo): Promise<void> {
  const fileId = await findFileId(authInfo); 
  const jsonData = JSON.stringify(data, null, 2);
  // Using Blob for consistent body creation
  const fileContentBlob = new Blob([jsonData], { type: 'application/json' });

  let url: string;
  let method: string;
  let body: BodyInit;
  const headers: HeadersInit = {
    'Authorization': `Bearer ${authInfo.accessToken}`,
  };

  if (fileId) {
    url = `${BASE_UPLOAD_URL}/files/${fileId}?uploadType=media`;
    method = 'PATCH';
    body = fileContentBlob; 
    headers['Content-Type'] = 'application/json'; // Required for PATCH media upload by some Drive API versions/setups
  } else {
    url = `${BASE_UPLOAD_URL}/files?uploadType=multipart`;
    method = 'POST';
    const metadata = {
      name: CRM_DATA_FILENAME,
      mimeType: 'application/json',
      parents: ['root'],
    };
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', fileContentBlob, CRM_DATA_FILENAME); // Added filename to blob part
    body = formData;
    // For FormData, Content-Type is set by browser/fetch with boundary.
  }

  try {
    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: body,
    });

    if (!response.ok) {
      await handleGoogleDriveError(response, fileId ? "update file" : "create file", url);
    }

    const responseData = await response.json();
    console.log(`Data successfully ${fileId ? 'updated' : 'created'} in Google Drive:`, responseData.name || CRM_DATA_FILENAME);

  } catch (error) {
    // console.error('Error during Google Drive upload request:', error);
    throw error; 
  }
}

/**
 * Asynchronously downloads CRM data (as JSON) from a specific file in Google Drive.
 *
 * @param authInfo The authentication information for Google Drive.
 * @returns A promise that resolves to the parsed ExcelData object or null if the file doesn't exist or is empty.
 * @throws Will throw an error if the download fails for reasons other than not found.
 */
export async function downloadFromGoogleDrive(authInfo: GoogleDriveAuthInfo): Promise<ExcelData | null> {
  const fileId = await findFileId(authInfo);

  if (!fileId) {
    console.log(`Google Drive file '${CRM_DATA_FILENAME}' not found. This may be the first sync.`);
    return null;
  }

  const url = `${BASE_GDRIVE_URL}/files/${fileId}?alt=media`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authInfo.accessToken}`,
      },
    });

    if (response.status === 404) { // Double check for 404, though findFileId should catch it
        console.log(`Google Drive file '${CRM_DATA_FILENAME}' not found during download attempt. Returning null.`);
        return null;
    }

    if (!response.ok) {
       await handleGoogleDriveError(response, "download file", url);
    }
    
    const textData = await response.text();
    if (!textData) {
        console.warn(`Google Drive file '${CRM_DATA_FILENAME}' is empty. Returning null.`);
        return null;
    }

    const jsonData = JSON.parse(textData);

    if (jsonData && Array.isArray(jsonData.headers) && Array.isArray(jsonData.rows)) {
      console.log('Data successfully downloaded from Google Drive:', CRM_DATA_FILENAME);
      return jsonData as ExcelData;
    } else {
      console.warn(`Downloaded data from Google Drive ('${CRM_DATA_FILENAME}') has unexpected format. Returning null. Content:`, jsonData);
      return null;
    }

  } catch (error) {
    // If error is already from handleGoogleDriveError, or JSON.parse fails
    // console.error('Error during Google Drive download request:', error);
    if (error instanceof SyntaxError) { // JSON.parse error
        console.error(`Failed to parse JSON from Google Drive file '${CRM_DATA_FILENAME}': ${error.message}`);
        throw new Error(`Invalid JSON format in Google Drive file '${CRM_DATA_FILENAME}'.`);
    }
    throw error;
  }
}


/**
 * Fetches metadata for the CRM data file from Google Drive.
 *
 * @param authInfo The authentication information for Google Drive.
 * @returns A promise that resolves to the file metadata or null if the file doesn't exist.
 * @throws Will throw an error if the API request fails.
 */
export async function fetchFileMetadata(authInfo: GoogleDriveAuthInfo): Promise<FileMetadata | null> {
    const fileId = await findFileId(authInfo);
    if (!fileId) {
        console.log(`Google Drive file metadata for '${CRM_DATA_FILENAME}' not found.`);
        return null;
    }

    const url = `${BASE_GDRIVE_URL}/files/${fileId}?fields=id,name,modifiedTime,size`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authInfo.accessToken}`,
            },
        });

        if (!response.ok) {
            await handleGoogleDriveError(response, "fetch file metadata", url);
        }

        const fileMetadata = await response.json();
        return {
            id: fileMetadata.id,
            name: fileMetadata.name,
            lastModified: fileMetadata.modifiedTime, // Google Drive uses modifiedTime
            size: fileMetadata.size ? parseInt(fileMetadata.size, 10) : undefined,
        } as FileMetadata;
    } catch (error) {
        // console.error('Error during Google Drive fetch metadata request:', error);
        throw error;
    }
}
