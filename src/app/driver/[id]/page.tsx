
import { getDriverById, getDriversByAuthUid } from '@/services/driver-service';
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
import type { Driver } from '@/lib/types';

export default async function Page({ params }: { params: { id: string } }) {
    const driver = await getDriverById(params.id);

    if (!driver) {
        notFound();
    }

    let siblings: Driver[] = [];
    if (driver.authUid) {
        siblings = await getDriversByAuthUid(driver.authUid);
    }
    
    // Fetch all other data needed for the tabs
    const [races, driverRaceSignups, trainingSettings, driverTrainingSignups] = await Promise.all([
        getRaces(),
        getRaceSignupsByDriver(driver.id),
        getTrainingSettings(),
        getTrainingSignupsByDriver(driver.id),
    ]);

    const otherSiblings = siblings.filter(s => s.id !== driver.id);

    return (
        <div className="container mx-auto p-4 sm:p-8 md:p-12 max-w-6xl">
            <header className="flex justify-between items-center mb-8">
                 <FoererportalenLogo />
                 <div className="flex items-center gap-2">
                    {otherSiblings.length > 0 && <SiblingSwitcher siblings={otherSiblings} />}
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
