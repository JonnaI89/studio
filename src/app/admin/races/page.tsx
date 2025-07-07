import { RaceManagementPage } from '@/components/kartpass/race-management-page';
import { getRaces } from '@/services/race-service';
import { KartPassLogo } from '@/components/icons/kart-pass-logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function RacesPage() {
    const races = await getRaces();

    return (
        <div className="container mx-auto p-4 sm:p-8 md:p-12 max-w-6xl">
            <header className="flex justify-between items-center mb-8">
                <KartPassLogo />
                <Button asChild variant="outline">
                    <Link href="/admin">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tilbake til Innsjekk
                    </Link>
                </Button>
            </header>
            <main>
                <Card>
                    <CardHeader>
                        <CardTitle>Løpsadministrasjon</CardTitle>
                        <CardDescription>
                            Her kan du opprette og administrere løp. Førere kan se og melde seg på
                            kommende løp fra sin profilside.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RaceManagementPage initialRaces={races} />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
