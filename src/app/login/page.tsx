"use client";

import { LoginForm } from '@/components/auth/login-form';
import { VarnaCheckLogo } from '@/components/icons/kart-pass-logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/40">
        <div className="w-full max-w-md">
            <div className="flex justify-center mb-8">
                <VarnaCheckLogo />
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
