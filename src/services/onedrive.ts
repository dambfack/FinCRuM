import type { ExcelData, Contact } from '@/lib/types'; // Import ExcelData type
import { getAuthInfo } from './auth';

/**
 * Represents the authentication information for OneDrive.
 */
export interface OneDriveAuthInfo {
  accessToken: string;
}

// Use a consistent filename for storing the CRM data on OneDrive
const CRM_DATA_FILENAME = 'finsculpt_crm_data.json';
const CRM_METADATA_FILENAME = 'finsculpt_crm_metadata.json'

interface FileMetadata {
  lastModified: string;
  size: number;
}

/**
 * Asynchronously fetches metadata for a specific file in OneDrive.
 *
 * @param authInfo The authentication information for OneDrive.
 * @param filename The name of the file to fetch metadata for.
 * @returns A promise that resolves to the FileMetadata object or null if the file doesn't exist.
 * @throws Will throw an error if the request fails for reasons other than not found.
 */
export async function fetchOneDriveFileMetadata(authInfo: OneDriveAuthInfo, filename: string): Promise<FileMetadata | null> {
  const url = `${BASE_GRAPH_URL}/me/drive/root:/${filename}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authInfo.accessToken}`,
      },
    });

    if (response.status === 404) {
      console.log('File metadata not found in OneDrive:', filename);
      return null; // File not found, return null
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata for file ${filename}: ${response.statusText}`);
    }

    const fileData = await response.json();
    return { lastModified: fileData.lastModifiedDateTime, size: fileData.size };
  } catch (error) {
    throw new Error(`Error fetching file metadata: ${error}`);
  }
}
const BASE_GRAPH_URL = 'https://graph.microsoft.com/v1.0';

/**
 * Asynchronously uploads CRM data (as JSON) to a specific file in OneDrive.
 *
 * @param data The ExcelData object to upload.
 * @param authInfo The authentication information for OneDrive.
 * @returns A promise that resolves when the data is uploaded successfully.
 * @throws Will throw an error if the upload fails.
 */
export async function uploadToOneDrive(data: ExcelData, authInfo: OneDriveAuthInfo): Promise<void> {
  const url = `${BASE_GRAPH_URL}/me/drive/root:/${CRM_DATA_FILENAME}:/content`;
  const jsonData = JSON.stringify(data, null, 2); // Stringify the data with formatting

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authInfo.accessToken}`,
        'Content-Type': 'application/json', // Upload as JSON
      },
      body: jsonData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error('OneDrive Upload Error:', response.status, errorData);
      throw new Error(`OneDrive upload failed: ${errorData.message || response.statusText}`);
    }

    // After successful upload, fetch and log the new metadata
    const newMetadata = await fetchOneDriveFileMetadata(authInfo, CRM_DATA_FILENAME);
    if (newMetadata) {
        console.log('New metadata after upload:', newMetadata);
    }

    console.log('Data successfully uploaded to OneDrive:', CRM_DATA_FILENAME);

  } catch (error) {
    console.error('Error during OneDrive upload request:', error);
    // Re-throw the error to be caught by the calling function (useDataSync)
    throw error;
  }
}

/**
 * Asynchronously downloads CRM data (as JSON) from a specific file in OneDrive.
 *
 * @param authInfo The authentication information for OneDrive.
 * @returns A promise that resolves to the parsed ExcelData object or null if the file doesn't exist or is empty.
 * @throws Will throw an error if the download fails for reasons other than not found.
 */
export async function downloadFromOneDrive(authInfo: OneDriveAuthInfo): Promise<ExcelData | null> {
  const url = `${BASE_GRAPH_URL}/me/drive/root:/${CRM_DATA_FILENAME}:/content`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authInfo.accessToken}`,
      },
    });

    if (response.status === 404) {
      console.log(`OneDrive file not found (${CRM_DATA_FILENAME}). Returning null.`);
      return null; // File doesn't exist, which is a valid state (e.g., first sync)
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error('OneDrive Download Error:', response.status, errorData);
      throw new Error(`OneDrive download failed: ${errorData.message || response.statusText}`);
    }

    const responseText = await response.text(); // Get response as text

    if (!responseText || responseText.trim() === "") {
      console.warn(`OneDrive file '${CRM_DATA_FILENAME}' was empty or contained only whitespace.`);
      return null;
    }

    const parsedData = JSON.parse(responseText); // Parse the JSON string

    // Basic validation: Check if it looks like our ExcelData structure
    if (parsedData && Array.isArray(parsedData.headers) && Array.isArray(parsedData.rows)) {
      console.log('Data successfully downloaded from OneDrive:', CRM_DATA_FILENAME);
      return parsedData as ExcelData;
    } else {
      console.warn('Downloaded data from OneDrive has unexpected format:', parsedData);
      // Treat unexpected format as potentially empty or invalid
      return null;
    }

  } catch (error) {
    console.error('Error during OneDrive download request:', error);
     // Re-throw the error to be caught by the calling function (useDataSync)
    throw error;
  }
}

/**
 * Initiates the OneDrive authentication flow.
 * @returns {Promise<OneDriveAuthInfo>} The authentication info from OneDrive.
 */
export async function authenticateWithOneDrive(): Promise<OneDriveAuthInfo> {
    const authInfo = await getAuthInfo();
    return authInfo as OneDriveAuthInfo;
  }


/**
 * Asynchronously uploads file metadata to a specific file in OneDrive.
 *
 * @param metadata The metadata object to upload.
 * @param authInfo The authentication information for OneDrive.
 * @returns A promise that resolves when the metadata is uploaded successfully.
 * @throws Will throw an error if the upload fails.
 */
export async function uploadMetadataToOneDrive(metadata: FileMetadata, authInfo: OneDriveAuthInfo): Promise<void> {
  const url = `${BASE_GRAPH_URL}/me/drive/root:/${CRM_METADATA_FILENAME}:/content`;
  const jsonData = JSON.stringify(metadata);
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authInfo.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: jsonData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error('OneDrive Metadata Upload Error:', response.status, errorData);
      throw new Error(`Failed to upload metadata: ${errorData.message || response.statusText}`);
    }

    console.log('Metadata successfully uploaded to OneDrive:', CRM_METADATA_FILENAME);

  } catch (error) {
    console.error('Error during OneDrive metadata upload request:', error);
    throw error;
  }
}
