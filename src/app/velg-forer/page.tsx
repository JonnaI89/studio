
'use client';

import { useEffect, useState } from 'react';
import { getCookie, deleteCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import type { DriverProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FoererportalenLogo } from '@/components/icons/kart-pass-logo';
import { User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { LoaderCircle } from 'lucide-react';


export default function VelgForerPage() {
    const [profile, setProfile] = useState<DriverProfile | null>(null);
    const router = useRouter();
    const { loading: authLoading, user } = useAuth();
    
    useEffect(() => {
        const profileCookie = getCookie('driverProfile');
        if (profileCookie) {
            try {
                const parsedProfile: DriverProfile = JSON.parse(profileCookie as string);
                setProfile(parsedProfile);
            } catch (e) {
                console.error("Failed to parse profile cookie", e);
                router.push('/login');
            }
        } else if (!authLoading && !user) {
            // If no cookie and not loading auth, redirect to login
             router.push('/login');
        }
    }, [router, authLoading, user]);

    const handleSelectDriver = (driverId: string) => {
        deleteCookie('driverProfile');
        router.push(`/driver/${driverId}`);
    };
    
    if (authLoading || !profile) {
        return (
             <div className="w-full h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <LoaderCircle className="h-10 w-10 animate-spin" />
                <p className="text-lg">Laster profiler...</p>
            </div>
        )
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/40">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <FoererportalenLogo />
                </div>
                <Card>
                    <CardHeader className="text-center">
                        <User className="mx-auto h-12 w-12 text-primary mb-4" />
                        <CardTitle>Velg Førerprofil</CardTitle>
                        <CardDescription>Velg hvilken fører du vil administrere.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                       {profile.drivers.map(driver => (
                           <Button 
                                key={driver.id} 
                                className="w-full justify-between" 
                                size="lg"
                                onClick={() => handleSelectDriver(driver.id)}
                            >
                               {driver.name}
                               <ArrowRight className="h-5 w-5" />
                           </Button>
                       ))}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
