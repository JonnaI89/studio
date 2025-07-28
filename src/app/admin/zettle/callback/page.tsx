
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoaderCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { exchangeCodeForToken } from '@/services/zettle-service';
import { useRouter } from 'next/navigation';

export default function ZettleCallbackPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');
        const storedState = localStorage.getItem('zettle_oauth_state');

        if (errorParam) {
            setError(`Zettle returnerte en feil: ${errorParam}`);
            setStatus('error');
            return;
        }

        if (state !== storedState) {
            setError("Ugyldig 'state'-parameter. Autentiseringen kan ha blitt utsatt for et sikkerhetsangrep. Vennligst prøv igjen.");
            setStatus('error');
            return;
        }
        
        localStorage.removeItem('zettle_oauth_state');

        if (code) {
            exchangeCodeForToken(code).then(success => {
                if (success) {
                    setStatus('success');
                     setTimeout(() => {
                        router.push('/admin/site-settings');
                    }, 2000);
                } else {
                    setError("Kunne ikke veksle autorisasjonskode mot en permanent nøkkel.");
                    setStatus('error');
                }
            });
        } else {
            setError("Mangler nødvendige parametere (kode) fra Zettle.");
            setStatus('error');
        }

    }, [searchParams, router]);

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
                            <p>Verifiserer og lagrer nøkler...</p>
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
                            <p className="text-sm text-muted-foreground">Du kan nå koble til en kortleser. Sender deg tilbake...</p>
                        </>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
