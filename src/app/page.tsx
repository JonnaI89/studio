import { Button } from '@/components/ui/button';
import { KartPassLogo } from '@/components/icons/kart-pass-logo';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, LogIn } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <header className="w-full flex justify-end p-4 sm:p-6 absolute top-0">
        <Button asChild variant="ghost" className="text-muted-foreground">
          <Link href="/admin">
            Admin
          </Link>
        </Button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="flex flex-col items-center gap-8 text-center w-full max-w-md">
          <KartPassLogo />
          <Card className="w-full shadow-lg">
            <CardHeader>
              <User className="mx-auto h-12 w-12 text-primary mb-4" />
              <CardTitle>Fører-innlogging</CardTitle>
              <CardDescription>Logg inn for å se og redigere din profil og melde deg på treninger.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="lg">
                <Link href="/login">
                  <LogIn className="mr-2 h-5 w-5" />
                  Logg inn
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
