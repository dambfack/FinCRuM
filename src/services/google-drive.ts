import type { ExcelData, FileMetadata } from '@/lib/types';
import { Buffer } from 'buffer';
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
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error('Google Drive Find File Error:', response.status, errorData);
      throw new Error(`Google Drive find file failed: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    if (result.files && result.files.length > 0) {
      return result.files[0].id;
    }
    return null; // File not found

  } catch (error) {
     console.error('Error during Google Drive find file request:', error);
    throw error; // Re-throw
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
  const fileId = await findFileId(authInfo); // Check if file exists
  const jsonData = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });

  let url: string;
  let method: string;

  if (fileId) {
    // File exists, update it using simple upload (overwrites content)
    url = `${BASE_UPLOAD_URL}/files/${fileId}?uploadType=media`;
    method = 'PATCH'; // Use PATCH for updating content
  } else {
    // File doesn't exist, create it using multipart upload
    url = `${BASE_UPLOAD_URL}/files?uploadType=multipart`;
    method = 'POST';
  }

  try {
    let body: BodyInit;
    const headers: HeadersInit = {
      'Authorization': `Bearer ${authInfo.accessToken}`,
    };

    if (fileId) {
        // Simple upload: Body is just the blob, Content-Type is set automatically for PATCH with media
        body = blob;
        // Google Drive API requires Content-Type for PATCH update
         headers['Content-Type'] = 'application/json';
    } else {
      // Multipart upload: Metadata and media parts
      const metadata = {
        name: CRM_DATA_FILENAME,
        mimeType: 'application/json',
        parents: ['root'], // Place it in the root folder
      };
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', blob);
      body = formData;
      // Content-Type is set by FormData, don't set it manually
    }

    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error('Google Drive Upload Error:', response.status, errorData);
      throw new Error(`Google Drive upload failed: ${errorData.error?.message || errorData.message || response.statusText}`);
    }

    const responseData = await response.json();
    console.log(`Data successfully ${fileId ? 'updated' : 'created'} in Google Drive:`, responseData.name || CRM_DATA_FILENAME);

  } catch (error) {
    console.error('Error during Google Drive upload request:', error);
    throw error; // Re-throw
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
    console.log(`Google Drive file not found (${CRM_DATA_FILENAME}). Returning null.`);
    return null; // File doesn't exist
  }

  // Use alt=media to download file content
  const url = `${BASE_GDRIVE_URL}/files/${fileId}?alt=media`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authInfo.accessToken}`,
      },
    });

    if (!response.ok) {
       // Google Drive API might return 404 even if findFileId worked moments ago (rare edge case)
     if (response.status === 404) {
        console.log(`Google Drive file not found during download (${CRM_DATA_FILENAME}). Returning null.`);
        return null;
     }
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error('Google Drive Download Error:', response.status, errorData);
      throw new Error(`Google Drive download failed: ${errorData.message || response.statusText}`);
    }

    const jsonData = await response.json();

    // Basic validation
    if (jsonData && Array.isArray(jsonData.headers) && Array.isArray(jsonData.rows)) {
      console.log('Data successfully downloaded from Google Drive:', CRM_DATA_FILENAME);
      return jsonData as ExcelData;
    } else {
      console.warn('Downloaded data from Google Drive has unexpected format:', jsonData);
       // Treat unexpected format as potentially empty or invalid
       
      return null;
    }

  } catch (error) {
    console.error('Error during Google Drive download request:', error);
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
        console.log(`Google Drive file not found (${CRM_DATA_FILENAME}). Returning null.`);
        return null;
    }

    const url = `${BASE_GDRIVE_URL}/files/${fileId}?fields=id,name,modifiedTime`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authInfo.accessToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.error('Google Drive Fetch Metadata Error:', response.status, errorData);
            throw new Error(`Google Drive fetch metadata failed: ${errorData.error?.message || errorData.message || response.statusText}`);
        }

        const fileMetadata = await response.json();
        return fileMetadata as FileMetadata;
    } catch (error) {
        console.error('Error during Google Drive fetch metadata request:', error);
        throw error;
    }
}
