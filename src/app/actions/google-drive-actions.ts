'use server';

import { uploadToGoogleDrive, downloadFromGoogleDrive, fetchFileMetadata } from '@/services/google-drive';
import type { ExcelData, FileMetadata, GoogleTokens } from '@/lib/types';

/**
 * Server action to upload data to Google Drive
 */
export async function uploadToGoogleDriveAction(
  data: ExcelData,
  tokens: GoogleTokens,
  filename?: string
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const fileId = await uploadToGoogleDrive(data, tokens, filename);
    return { success: true, fileId };
  } catch (error: any) {
    console.error('Error in uploadToGoogleDriveAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Server action to download data from Google Drive
 */
export async function downloadFromGoogleDriveAction(
  tokens: GoogleTokens,
  filename?: string
): Promise<{ success: boolean; data?: ExcelData; error?: string }> {
  try {
    const data = await downloadFromGoogleDrive(tokens, filename);
    return { success: true, data };
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
    const metadata = await fetchFileMetadata(tokens, filename);
    return { success: true, metadata };
  } catch (error: any) {
    console.error('Error in fetchGoogleDriveFileMetadataAction:', error);
    return { success: false, error: error.message };
  }
}