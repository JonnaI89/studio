
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { exchangeCodeForTokens } from '@/services/zettle-service';
import { LoaderCircle, CheckCircle, XCircle } from 'lucide-react';

function ZettleCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const returnedState = searchParams.get('state');
      // In a real app, you'd verify the 'state' parameter against a stored value to prevent CSRF attacks.

      const codeVerifier = sessionStorage.getItem('zettle_code_verifier');
      
      if (!code || !codeVerifier) {
        setError('Mangler autorisasjonskode eller verifiseringsdata. Prøv å koble til på nytt.');
        setStatus('error');
        return;
      }
      
      try {
        const redirectUri = `${window.location.origin}/zettle/callback`;
        await exchangeCodeForTokens(code, codeVerifier, redirectUri);
        setStatus('success');
        
        // Clean up the verifier from session storage
        sessionStorage.removeItem('zettle_code_verifier');

        setTimeout(() => {
          router.push('/admin/site-settings');
        }, 2000);

      } catch (err) {
        console.error("Callback error:", err);
        setError((err as Error).message || "En ukjent feil oppstod under autentisering.");
        setStatus('error');
      }
    };
    
    processCallback();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/40 text-center">
      <div className="w-full max-w-md space-y-4">
        {status === 'loading' && (
          <>
            <LoaderCircle className="mx-auto h-16 w-16 animate-spin text-primary" />
            <h1 className="text-2xl font-bold">Behandler Zettle-tilkobling...</h1>
            <p className="text-muted-foreground">Vennligst vent mens vi fullfører konfigurasjonen.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
            <h1 className="text-2xl font-bold">Tilkobling Vellykket!</h1>
            <p className="text-muted-foreground">Zettle-kontoen er nå koblet til. Du blir sendt tilbake til innstillingene.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-bold">Tilkobling Feilet</h1>
            <p className="text-destructive-foreground bg-destructive/80 p-3 rounded-md">{error}</p>
            <Button onClick={() => router.push('/admin/site-settings')}>Gå tilbake til innstillinger</Button>
          </>
        )}
      </div>
    </div>
  );
}


export default function ZettleCallbackPage() {
    return (
        <Suspense fallback={<div>Laster...</div>}>
            <ZettleCallback />
        </Suspense>
    )
}

    