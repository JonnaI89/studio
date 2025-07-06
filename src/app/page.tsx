import { Button } from '@/components/ui/button';
import { KartPassLogo } from '@/components/icons/kart-pass-logo';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, LogIn, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/40">
      <div className="flex flex-col items-center gap-12 text-center">
        <KartPassLogo />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <Card>
            <CardHeader>
              <User className="mx-auto h-12 w-12 text-primary mb-4" />
              <CardTitle>Fører-innlogging</CardTitle>
              <CardDescription>Logg inn for å se og redigere din profil og melde deg på treninger.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="lg">
                <Link href="/login">
                  <LogIn className="mr-2 h-5 w-5" />
                  Logg inn som Fører
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <ShieldCheck className="mx-auto h-12 w-12 text-primary mb-4" />
              <CardTitle>Admin-panel</CardTitle>
              <CardDescription>Administrer førere, sjekk inn deltakere og se statistikk.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="lg" variant="default">
                <Link href="/admin">
                  <LogIn className="mr-2 h-5 w-5" />
                  Logg inn som Admin
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}