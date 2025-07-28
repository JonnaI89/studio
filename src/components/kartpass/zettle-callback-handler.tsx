
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { exchangeCodeForToken } from '@/services/zettle-service';
import { ZETTLE_LS_STATE_KEY, ZETTLE_LS_VERIFIER_KEY } from './site-settings-editor';
import { LoaderCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '../ui/button';

export function ZettleCallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      
      const storedState = localStorage.getItem(ZETTLE_LS_STATE_KEY);
      const codeVerifier = localStorage.getItem(ZETTLE_LS_VERIFIER_KEY);

      // Clean up local storage immediately
      localStorage.removeItem(ZETTLE_LS_STATE_KEY);
      localStorage.removeItem(ZETTLE_LS_VERIFIER_KEY);

      if (errorParam) {
        setError(`Zettle-feil: ${errorParam}. Prøv igjen fra innstillingssiden.`);
        setStatus('error');
        return;
      }

      if (!code || !state || !storedState || !codeVerifier) {
        setError("Ugyldig callback-forespørsel. Mangler nødvendig informasjon.");
        setStatus('error');
        return;
      }

      if (state !== storedState) {
        setError("Ugyldig 'state'. Forespørselen kan ha blitt tuklet med. Prøv på nytt.");
        setStatus('error');
        return;
      }

      try {
        await exchangeCodeForToken(code, codeVerifier);
        setStatus('success');
        // Redirect back to settings page after a short delay
        setTimeout(() => {
          router.push('/admin/site-settings');
        }, 2000);
      } catch (e) {
        setError((e as Error).message || "En ukjent feil oppsto under utveksling av token.");
        setStatus('error');
      }
    };

    processCallback();
  }, [searchParams, router]);

  const renderContent = () => {
    switch(status) {
      case 'processing':
        return (
          <>
            <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
            <CardTitle>Behandler Zettle-tilkobling...</CardTitle>
            <CardDescription>Dette kan ta et øyeblikk. Vennligst ikke lukk vinduet.</CardDescription>
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="h-12 w-12 text-green-600" />
            <CardTitle>Tilkobling Vellykket!</CardTitle>
            <CardDescription>Du blir nå sendt tilbake til innstillingssiden.</CardDescription>
          </>
        );
      case 'error':
        return (
          <>
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <CardTitle>Tilkobling Feilet</CardTitle>
            <CardDescription className="text-destructive">{error}</CardDescription>
          </>
        );
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/40">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
            {renderContent()}
        </CardHeader>
        {status === 'error' && (
            <CardContent className="flex justify-center">
                <Button onClick={() => router.push('/admin/site-settings')}>Tilbake til Innstillinger</Button>
            </CardContent>
        )}
      </Card>
    </main>
  );
}
