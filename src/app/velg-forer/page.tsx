"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDriversByAuthUid } from '@/services/driver-service';
import type { Driver } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, User, ArrowRight, Home } from 'lucide-react';
import { FoererportalenLogo } from '@/components/icons/kart-pass-logo';
import Link from 'next/link';

function DriverSelectionCard({ driver, onSelect }: { driver: Driver, onSelect: (id: string) => void }) {
    return (
        <button 
            onClick={() => onSelect(driver.id)}
            className="w-full text-left p-4 border rounded-lg hover:bg-muted transition-colors flex items-center justify-between"
        >
            <div className="flex items-center gap-4">
                <User className="h-8 w-8 text-primary" />
                <div>
                    <p className="font-bold text-lg">{driver.name}</p>
                    <p className="text-sm text-muted-foreground">{driver.club}</p>
                </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </button>
    );
}


export default function VelgForerPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const authUid = searchParams.get('authUid');
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authUid) {
            setError("Innloggings-ID mangler. Kan ikke hente førere.");
            setIsLoading(false);
            return;
        }

        const fetchDrivers = async () => {
            try {
                const fetchedDrivers = await getDriversByAuthUid(authUid);
                if (fetchedDrivers.length === 0) {
                    setError("Ingen førere funnet for denne brukeren.");
                } else {
                    setDrivers(fetchedDrivers);
                }
            } catch (e) {
                setError((e as Error).message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDrivers();
    }, [authUid]);

    const handleSelectDriver = (id: string) => {
        router.push(`/driver/${id}`);
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/40">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <FoererportalenLogo />
                </div>
                <Card className="shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle>Velg Fører</CardTitle>
                        <CardDescription>Denne brukeren er knyttet til flere førere. Velg hvem du vil logge inn som.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-8">
                                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : error ? (
                            <p className="text-destructive text-center">{error}</p>
                        ) : (
                            <div className="space-y-3">
                                {drivers.map(driver => (
                                    <DriverSelectionCard key={driver.id} driver={driver} onSelect={handleSelectDriver} />
                                ))}
                            </div>
                        )}
                         <Button asChild variant="outline" className="w-full mt-4">
                            <Link href="/login">
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Tilbake til innlogging
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
