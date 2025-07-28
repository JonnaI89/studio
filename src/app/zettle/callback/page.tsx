
import { ZettleCallbackHandler } from '@/components/kartpass/zettle-callback-handler';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ZettleCallbackPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/40">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Kobler til Zettle...</CardTitle>
                    <CardDescription>
                        Fullfører tilkoblingen til Zettle. Vennligst ikke lukk dette vinduet.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ZettleCallbackHandler />
                </CardContent>
            </Card>
        </main>
    );
}
