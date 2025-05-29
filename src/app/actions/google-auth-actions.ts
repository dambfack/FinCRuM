'use server';

import { generateGoogleAuthUrl } from '@/services/google-calendar';
import { exchangeCodeForTokens } from '@/services/google-oauth';
import { revokeGoogleTokens } from '@/services/google-oauth';
import { GoogleTokens } from '@/lib/types';

export async function generateGoogleAuthUrlAction(
  scopes?: string[]
): Promise<{ success: boolean; authUrl?: string; error?: string }> {
  try {
    const authUrl = await generateGoogleAuthUrl(scopes);
    return { success: true, authUrl };
  } catch (error) {
    console.error('Error in generateGoogleAuthUrlAction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Track processed codes to prevent duplicate processing
const processedCodes = new Set<string>();

export async function exchangeCodeForTokensAction(
  code: string
): Promise<{ success: boolean; tokens?: GoogleTokens; error?: string }> {
  // Prevent processing the same code multiple times
  if (processedCodes.has(code)) {
    console.log('Authorization code already processed, skipping...');
    return { success: false, error: 'Authorization code has already been processed' };
  }
  
  // Mark code as being processed
  processedCodes.add(code);
  
  // Clean up processed codes after 5 minutes
  setTimeout(() => {
    processedCodes.delete(code);
  }, 5 * 60 * 1000);
  
  try {
    const tokens = await exchangeCodeForTokens(code);
    return { success: true, tokens };
  } catch (error: any) {
     console.error('Error in exchangeCodeForTokensAction:', error);
     // Remove from processed codes on error so it can be retried
     processedCodes.delete(code);
     return { success: false, error: error.message };
   }
 }

export async function revokeGoogleTokensAction(
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await revokeGoogleTokens(accessToken);
    return { success: true };
  } catch (error) {
    console.error('Error in revokeGoogleTokensAction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}