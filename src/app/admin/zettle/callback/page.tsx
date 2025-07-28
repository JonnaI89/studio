
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoaderCircle, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ZettleCallbackPage() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');

        if (errorParam) {
            setError(`Zettle returnerte en feil: ${errorParam}`);
            setStatus('error');
            return;
        }

        if (code && state) {
            // TODO: Send code and state to backend to exchange for an access token
            console.log("Mottatt autorisasjonskode:", code);
            console.log("Mottatt state:", state);
            setStatus('success');
        } else {
            setError("Mangler nødvendige parametere (kode eller state) fra Zettle.");
            setStatus('error');
        }

    }, [searchParams]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/40">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <CardTitle>Kobler til Zettle...</CardTitle>
                    <CardDescription>
                        Fullfører autentisering med Zettle. Vennligst vent.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center gap-4 p-8">
                    {status === 'loading' && (
                        <>
                            <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                            <p>Verifiserer...</p>
                        </>
                    )}
                    {status === 'error' && (
                        <>
                            <AlertTriangle className="h-12 w-12 text-destructive" />
                            <p className="font-semibold">Noe gikk galt</p>
                            <p className="text-sm text-muted-foreground">{error || 'En ukjent feil oppstod.'}</p>
                        </>
                    )}
                    {status === 'success' && (
                        <>
                            <CheckCircle className="h-12 w-12 text-green-600" />
                            <p className="font-semibold">Tilkobling Vellykket!</p>
                            <p className="text-sm text-muted-foreground">Du kan nå lukke dette vinduet og gå tilbake til Førerportalen.</p>
                        </>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
