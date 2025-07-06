import { Button } from '@/components/ui/button';
import { KartPassLogo } from '@/components/icons/kart-pass-logo';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, User } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/40">
        <div className="w-full max-w-md">
            <div className="flex justify-center mb-8">
                <KartPassLogo />
            </div>
            <Card>
                <CardHeader className="text-center">
                    <User className="mx-auto h-12 w-12 text-primary mb-4" />
                    <CardTitle>Fører-innlogging</CardTitle>
                    <CardDescription>Denne funksjonaliteten er under utvikling.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <p className="text-center text-sm text-muted-foreground">
                        Her vil du kunne logge inn med brukernavn og passord for å få tilgang til din personlige førerside.
                    </p>
                     <Button asChild variant="outline">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Tilbake til forsiden
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    </main>
  );
}
