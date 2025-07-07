import { getDriverById } from '@/services/driver-service';
import { getTrainingSettings } from '@/services/training-service';
import { getRaces, getSignupsByDriver } from '@/services/race-service';
import { DriverProfilePage } from '@/components/kartpass/driver-profile-page';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { KartPassLogo } from '@/components/icons/kart-pass-logo';

export default async function Page({ params }: { params: { id: string } }) {
    const driver = await getDriverById(params.id);
    const trainingSettings = await getTrainingSettings();
    const races = await getRaces();
    const driverRaceSignups = await getSignupsByDriver(params.id);

    if (!driver) {
        notFound();
    }

    return (
        <div className="container mx-auto p-4 sm:p-8 md:p-12 max-w-4xl">
            <header className="flex justify-between items-center mb-8">
                 <KartPassLogo />
                 <Button asChild variant="outline">
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tilbake til Innsjekk
                    </Link>
                </Button>
            </header>
           
            <DriverProfilePage 
                initialDriver={driver} 
                trainingSettings={trainingSettings}
                races={races}
                driverRaceSignups={driverRaceSignups}
            />
        </div>
    );
}
