import { getDriverById } from '@/services/driver-service';
import { getTrainingSettings } from '@/services/training-service';
import { DriverProfilePage } from '@/components/kartpass/driver-profile-page';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { VarnaCheckLogo } from '@/components/icons/kart-pass-logo';
import { LogoutButton } from '@/components/auth/logout-button';

export default async function Page({ params }: { params: { id: string } }) {
    const driver = await getDriverById(params.id);
    const trainingSettings = await getTrainingSettings();

    if (!driver) {
        notFound();
    }

    return (
        <div className="container mx-auto p-4 sm:p-8 md:p-12 max-w-4xl">
            <header className="flex justify-between items-center mb-8">
                 <VarnaCheckLogo />
                 <div className="flex gap-2">
                    <LogoutButton />
                 </div>
            </header>
           
            <DriverProfilePage initialDriver={driver} trainingSettings={trainingSettings} />
        </div>
    );
}
