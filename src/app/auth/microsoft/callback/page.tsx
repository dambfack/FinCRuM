'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { exchangeCodeForTokens } from '@/services/microsoft-oauth';
import { saveMicrosoftTokens } from '@/services/auth';

export default function MicrosoftCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Check for OAuth errors
        if (error) {
          console.error('Microsoft OAuth error:', error, errorDescription);
          setError(`Authentication failed: ${errorDescription || error}`);
          setStatus('error');
          return;
        }

        // Check for authorization code
        if (!code) {
          setError('No authorization code received from Microsoft');
          setStatus('error');
          return;
        }

        // Verify state parameter (optional but recommended for security)
        const storedState = sessionStorage.getItem('microsoftOAuthState');
        if (state && storedState && state !== storedState) {
          setError('Invalid state parameter - possible CSRF attack');
          setStatus('error');
          return;
        }

        // Exchange code for tokens
        console.log('Exchanging Microsoft authorization code for tokens...');
        const tokens = await exchangeCodeForTokens(code);
        
        if (!tokens.access_token) {
          throw new Error('No access token received from Microsoft');
        }

        // Save tokens to localStorage
        saveMicrosoftTokens(tokens);
        
        console.log('Microsoft authentication successful!');
        setStatus('success');
        
        // Clean up stored state
        sessionStorage.removeItem('microsoftOAuthState');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard?auth=microsoft-success');
        }, 2000);
        
      } catch (error: any) {
        console.error('Microsoft OAuth callback error:', error);
        setError(error.message || 'Failed to complete Microsoft authentication');
        setStatus('error');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Microsoft Authentication
          </h2>
          
          {status === 'loading' && (
            <div className="mt-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">
                Processing your Microsoft authentication...
              </p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="mt-8">
              <div className="rounded-full h-12 w-12 bg-green-100 mx-auto flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="mt-4 text-sm text-green-600">
                Microsoft authentication successful! Redirecting to dashboard...
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-8">
              <div className="rounded-full h-12 w-12 bg-red-100 mx-auto flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="mt-4 text-sm text-red-600">
                {error}
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}