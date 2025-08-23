'use server';

import { GoogleTokens } from '@/lib/types';

export async function generateGoogleAuthUrlAction(
  scopes?: string[],
  isElectron?: boolean
): Promise<{ success: boolean; authUrl?: string; error?: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    const scopesParam = scopes ? scopes.join(',') : '';
    
    const params = new URLSearchParams();
    if (scopesParam) params.set('scopes', scopesParam);
    if (isElectron) params.set('electron', 'true');
    
    const url = `${baseUrl}/api/auth/google${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      return { success: true, authUrl: data.authUrl };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Error in generateGoogleAuthUrlAction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Track processed codes to prevent duplicate processing
let processedCodes = new Set<string>();

export async function exchangeCodeForTokensAction(
  code: string,
  isElectron?: boolean
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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    
    const response = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, action: 'exchange', isElectron }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true, tokens: data.tokens };
    } else {
      // Remove from processed codes on error so it can be retried
      processedCodes.delete(code);
      return { success: false, error: data.error };
    }
  } catch (error: any) {
     console.error('Error in exchangeCodeForTokensAction:', error);
     // Remove from processed codes on error so it can be retried
     processedCodes.delete(code);
     return { success: false, error: error.message };
   }
 }

export async function revokeGoogleTokensAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
    const response = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'revoke' }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Error in revokeGoogleTokensAction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}