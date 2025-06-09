'use server';

import { uploadToGoogleDrive, downloadFromGoogleDrive, fetchFileMetadata } from '@/services/google-drive';
import type { ExcelData, FileMetadata, GoogleTokens } from '@/lib/types';

/**
 * Server action to upload data to Google Drive
 */
export async function uploadToGoogleDriveAction(
  data: ExcelData,
  tokens: GoogleTokens
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const result = await uploadToGoogleDrive(data, tokens);
    return { success: result.success };
  } catch (error: any) {
    console.error('Error in uploadToGoogleDriveAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Server action to download data from Google Drive
 */
export async function downloadFromGoogleDriveAction(
  tokens: GoogleTokens
): Promise<{ success: boolean; data?: ExcelData; error?: string }> {
  try {
    const result = await downloadFromGoogleDrive(tokens);
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Error in downloadFromGoogleDriveAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Server action to fetch file metadata from Google Drive
 */
export async function fetchGoogleDriveFileMetadataAction(
  tokens: GoogleTokens,
  filename?: string
): Promise<{ success: boolean; metadata?: FileMetadata; error?: string }> {
  try {
    const result = await fetchFileMetadata(tokens);
    return { success: true, metadata: result.metadata || undefined };
  } catch (error: any) {
    console.error('Error in fetchGoogleDriveFileMetadataAction:', error);
    return { success: false, error: error.message };
  }
}