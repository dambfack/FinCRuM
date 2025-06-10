import { NextRequest, NextResponse } from 'next/server';
import { generateGoogleAuthUrl } from '@/services/google-calendar';
import { exchangeCodeForTokens, revokeGoogleTokens } from '@/services/google-oauth';

// Generate Google Auth URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scopesParam = searchParams.get('scopes');
    const scopes = scopesParam ? scopesParam.split(',') : undefined;
    
    const authUrl = await generateGoogleAuthUrl(scopes);
    return NextResponse.json({ success: true, authUrl });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Exchange code for tokens
export async function POST(request: NextRequest) {
  try {
    const { code, action } = await request.json();
    
    if (action === 'exchange') {
      const tokens = await exchangeCodeForTokens(code);
      return NextResponse.json({ success: true, tokens });
    } else if (action === 'revoke') {
      await revokeGoogleTokens();
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in Google auth API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}