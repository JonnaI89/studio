"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LoginForm } from '@/components/auth/login-form';
import { KartPassLogo } from '@/components/icons/kart-pass-logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, LoaderCircle } from 'lucide-react';

export default function LoginPage() {
  const { user, profile, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (isAdmin) {
        router.replace('/admin');
      } else if (profile) {
        router.replace(`/driver/${user.uid}`);
      }
    }
  }, [user, profile, isAdmin, loading, router]);

  if (loading || (!loading && user)) {
     return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/40">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <LoaderCircle className="h-10 w-10 animate-spin" />
                <p className="text-lg">Verifiserer og omdirigerer...</p>
            </div>
        </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/40">
        <div className="w-full max-w-md">
            <div className="flex justify-center mb-8">
                <KartPassLogo />
            </div>
            <Card>
                <CardHeader className="text-center">
                    <User className="mx-auto h-12 w-12 text-primary mb-4" />
                    <CardTitle>Logg Inn</CardTitle>
                    <CardDescription>Logg inn for å få tilgang til systemet.</CardDescription>
                </CardHeader>
                <CardContent>
                    <LoginForm />
                </CardContent>
            </Card>
        </div>
    </main>
  );
}
