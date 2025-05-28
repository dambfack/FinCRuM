
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { exchangeCodeForTokens } from '@/services/google-calendar'; // Using this as it contains the server action
import { DataItemType, GoogleTokens } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function GoogleAuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [message, setMessage] = useState('Processing authentication...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const provider = sessionStorage.getItem('googleAuthProvider') as 'googledrive' | 'googlecalendar' | null;

    // Clean up the session storage
    sessionStorage.removeItem('googleAuthProvider');

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
      setMessage(`Error: ${errorParam}. Please try authenticating again.`);
      toast({
        title: `Google ${provider === 'googlecalendar' ? 'Calendar' : 'Drive'} Authentication Failed`,
        description: errorParam,
        variant: 'destructive',
      });
      setTimeout(() => router.push('/'), 3000);
      return;
    }

    if (!code) {
      setError('No authorization code found in callback.');
      setMessage('Authentication callback is missing required information.');
      toast({
        title: 'Google Authentication Error',
        description: 'Authorization code missing from Google callback.',
        variant: 'destructive',
      });
      setTimeout(() => router.push('/'), 3000);
      return;
    }

    // Handle the OAuth callback based on the provider
    const handleOAuthCallback = async () => {
      try {
        const tokens = await exchangeCodeForTokens(code);
        
        if (!tokens.access_token) {
          throw new Error('No access token received from Google');
        }

        // Determine which tokens to save based on the provider
        if (provider === 'googlecalendar') {
          // Save Google Calendar tokens
          localStorage.setItem(DataItemType.GoogleCalendarAccessToken, tokens.access_token);
          if (tokens.refresh_token) {
            localStorage.setItem(DataItemType.GoogleCalendarRefreshToken, tokens.refresh_token);
          }
          if (tokens.expiry_date) {
            localStorage.setItem('googleCalendarTokenExpiry', tokens.expiry_date.toString());
          }
          
          toast({
            title: 'Google Calendar Connected',
            description: 'Successfully connected to Google Calendar!',
          });
        } else {
          // Default to Google Drive for backward compatibility
          localStorage.setItem(DataItemType.GoogleDriveAccessToken, tokens.access_token);
          if (tokens.refresh_token) {
            localStorage.setItem(DataItemType.GoogleDriveRefreshToken, tokens.refresh_token);
          }
          if (tokens.expiry_date) {
            localStorage.setItem('googleDriveTokenExpiry', tokens.expiry_date.toString());
          }
          
          toast({
            title: 'Google Drive Connected',
            description: 'Successfully connected to Google Drive!',
          });
        }

        setMessage('Authentication successful! Redirecting...');
        router.push('/');
      } catch (err: any) {
        console.error('Error processing Google authentication:', err);
        const errorMessage = err.message || 'An unknown error occurred';
        setError(`Failed to process Google authentication: ${errorMessage}`);
        setMessage('Error processing authentication. Please try again.');
        toast({
          title: `Google ${provider === 'googlecalendar' ? 'Calendar' : 'Drive'} Authentication Error`,
          description: `Could not complete authentication: ${errorMessage}`,
          variant: 'destructive',
        });
        setTimeout(() => router.push('/'), 5000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, router, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center justify-center">
            <Loader2 className={`mr-2 h-6 w-6 ${!error ? 'animate-spin' : ''}`} />
            Google Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className={error ? 'text-destructive' : 'text-muted-foreground'}>
            {message}
          </p>
          {error && (
            <button 
              onClick={() => router.push('/')} 
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Return to Dashboard
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
