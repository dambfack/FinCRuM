
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

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
      setMessage(`Error: ${errorParam}. Please try authenticating again.`);
      toast({
        title: 'Google Authentication Failed',
        description: errorParam,
        variant: 'destructive',
      });
      // Optionally redirect after a delay
      // setTimeout(() => router.push('/'), 5000);
      return;
    }

    if (code) {
      exchangeCodeForTokens(code)
        .then((tokens: GoogleTokens) => {
          if (tokens.access_token) {
            localStorage.setItem(DataItemType.GoogleDriveAccessToken, tokens.access_token);
          }
          if (tokens.refresh_token) {
            localStorage.setItem(DataItemType.GoogleDriveRefreshToken, tokens.refresh_token);
          }
          // Store other token info if needed, e.g., expiry_date
           if (tokens.expiry_date) {
             localStorage.setItem('googleDriveTokenExpiry', tokens.expiry_date.toString());
           }


          toast({
            title: 'Google Authentication Successful',
            description: 'You are now connected to Google services.',
          });
          setMessage('Authentication successful! Redirecting...');
          // Redirect to dashboard or a page that initiated the auth
          router.push('/');
        })
        .catch((err) => {
          console.error('Error exchanging code for tokens:', err);
          setError(`Failed to process Google authentication: ${err.message}`);
          setMessage(`Error processing authentication. Please try again.`);
          toast({
            title: 'Google Authentication Error',
            description: `Could not finalize authentication: ${err.message}`,
            variant: 'destructive',
          });
        });
    } else {
      setError('No authorization code found in callback.');
      setMessage('Authentication callback is missing required information.');
      toast({
        title: 'Google Authentication Error',
        description: 'Authorization code missing from Google callback.',
        variant: 'destructive',
      });
    }
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
