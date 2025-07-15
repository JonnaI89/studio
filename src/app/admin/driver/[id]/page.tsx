
import { getDriverProfile, getDriversByAuthUid } from '@/services/driver-service';
import { DriverProfilePage } from '@/components/kartpass/driver-profile-page';
import { notFound } from 'next/navigation';
import { FoererportalenLogo } from '@/components/icons/kart-pass-logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SiblingSwitcher } from '@/components/kartpass/sibling-switcher';

export default async function Page({ params }: { params: { id: string } }) {
    const driverId = params.id;
    const driver = await getDriverProfile(driverId);

    if (!driver) {
        notFound();
    }
    
    const siblings = driver.authUid ? await getDriversByAuthUid(driver.authUid) : [driver];
    const currentProfile = { id: driver.authUid || driver.id, email: driver.email, role: 'driver', drivers: siblings };

    return (
        <div className="container mx-auto p-4 sm:p-8 md:p-12 max-w-4xl">
            <header className="flex justify-between items-center mb-8">
                 <FoererportalenLogo />
                 <div className="flex items-center gap-4">
                    {siblings.length > 1 && driver.authUid && <SiblingSwitcher currentDriverId={driver.id} profile={currentProfile} isAdminView />}
                    <Button asChild variant="outline">
                        <Link href="/admin">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Tilbake til oversikt
                        </Link>
                    </Button>
                 </div>
            </header>
           
            <DriverProfilePage 
                initialDriver={driver} 
            />
        </div>
    );
}
