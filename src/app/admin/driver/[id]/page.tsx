import { getDriverById } from '@/services/driver-service';
import { getTrainingSettings } from '@/services/training-service';
import { getRaces, getSignupsByDriver } from '@/services/race-service';
import { DriverProfilePage } from '@/components/kartpass/driver-profile-page';
import { notFound } from 'next/navigation';
import { FoererportalenLogo } from '@/components/icons/kart-pass-logo';
import { LogoutButton } from '@/components/auth/logout-button';

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
                 <FoererportalenLogo />
                 <div className="flex gap-2">
                    <LogoutButton />
                 </div>
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
