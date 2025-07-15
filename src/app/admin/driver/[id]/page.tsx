
import { getDriver, getDriverProfile } from '@/services/driver-service';
import { DriverProfilePage } from '@/components/kartpass/driver-profile-page';
import { notFound } from 'next/navigation';
import { FoererportalenLogo } from '@/components/icons/kart-pass-logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SiblingSwitcher } from '@/components/kartpass/sibling-switcher';
import { getFirebaseDriverProfileByEmail, getFirebaseDriverProfiles } from '@/services/firebase-service';

export default async function Page({ params }: { params: { id: string } }) {
    const driverId = params.id;

    // In admin view, we don't know the profile ID, so we must find the driver across all profiles.
    const profiles = await getFirebaseDriverProfiles();
    let driver = null;
    let profile = null;

    for (const p of profiles) {
        const found = p.drivers.find(d => d.id === driverId);
        if (found) {
            driver = found;
            profile = p;
            break;
        }
    }

    if (!driver || !profile) {
        notFound();
    }

    return (
        <div className="container mx-auto p-4 sm:p-8 md:p-12 max-w-4xl">
            <header className="flex justify-between items-center mb-8">
                 <FoererportalenLogo />
                 <div className="flex items-center gap-4">
                    {profile.drivers.length > 1 && <SiblingSwitcher profile={profile} currentDriverId={driver.id} isAdminView={true} />}
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
                profileId={profile.id}
            />
        </div>
    );
}
