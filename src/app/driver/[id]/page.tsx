
import { getDriver, getDriverProfile } from '@/services/driver-service';
import { getRaces, getRaceSignupsByDriver } from '@/services/race-service';
import { getTrainingSettings, getTrainingSignupsByDriver } from '@/services/training-service';
import { DriverProfilePage } from '@/components/kartpass/driver-profile-page';
import { notFound } from 'next/navigation';
import { FoererportalenLogo } from '@/components/icons/kart-pass-logo';
import { LogoutButton } from '@/components/auth/logout-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RaceSignupCard } from '@/components/kartpass/race-signup-card';
import { TrainingSignupCard } from '@/components/kartpass/training-signup-card';
import { SiblingSwitcher } from '@/components/kartpass/sibling-switcher';
import { getDriverProfileByAuthUid } from '@/services/firebase-service';
import { auth } from '@/lib/firebase-config';

export default async function Page({ params }: { params: { id: string } }) {
    // The ID in the URL is now the driver's ID, not the profile ID.
    const driverId = params.id;
    const profileId = auth.currentUser?.uid;

    if (!profileId) {
        notFound();
    }

    const profile = await getDriverProfile(profileId);
    
    if (!profile) {
        notFound();
    }
    
    const driver = profile.drivers.find(d => d.id === driverId);

    if (!driver) {
        notFound();
    }
    
    // Fetch all other data needed for the tabs
    const [races, driverRaceSignups, trainingSettings, driverTrainingSignups] = await Promise.all([
        getRaces(),
        getRaceSignupsByDriver(driver.id),
        getTrainingSettings(),
        getTrainingSignupsByDriver(driver.id),
    ]);

    return (
        <div className="container mx-auto p-4 sm:p-8 md:p-12 max-w-6xl">
            <header className="flex justify-between items-center mb-8">
                 <FoererportalenLogo />
                 <div className="flex items-center gap-4">
                    {profile.drivers.length > 1 && <SiblingSwitcher profile={profile} currentDriverId={driver.id} />}
                    <LogoutButton variant="outline" />
                 </div>
            </header>
            
            <Tabs defaultValue="training" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="training">Påmelding Trening</TabsTrigger>
                    <TabsTrigger value="races">Påmelding Løp</TabsTrigger>
                    <TabsTrigger value="profile">Min Profil</TabsTrigger>
                </TabsList>
                <TabsContent value="profile" className="mt-6">
                    <DriverProfilePage 
                        initialDriver={driver}
                        profileId={profile.id}
                    />
                </TabsContent>
                <TabsContent value="races" className="mt-6">
                    <RaceSignupCard 
                        driver={driver}
                        races={races}
                        driverRaceSignups={driverRaceSignups}
                    />
                </TabsContent>
                <TabsContent value="training" className="mt-6">
                    <TrainingSignupCard
                        driver={driver}
                        initialSettings={trainingSettings}
                        initialSignups={driverTrainingSignups}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
