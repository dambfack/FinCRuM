import { NextResponse } from 'next/server';
import { isGoogleOAuthConfigured } from '@/services/google-oauth';

// Check if Google OAuth is configured
export async function GET() {
  try {
    const isConfigured = isGoogleOAuthConfigured();
    return NextResponse.json({ isConfigured });
  } catch (error) {
    console.error('Error checking Google OAuth configuration:', error);
    return NextResponse.json(
      { isConfigured: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}