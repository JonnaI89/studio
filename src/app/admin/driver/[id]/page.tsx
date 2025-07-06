import { getDriverById } from '@/services/driver-service';
import { DriverProfilePage } from '@/components/kartpass/driver-profile-page';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut } from 'lucide-react';
import { KartPassLogo } from '@/components/icons/kart-pass-logo';
import { LogoutButton } from '@/components/auth/logout-button';

export default async function Page({ params }: { params: { id: string } }) {
    const driver = await getDriverById(params.id);

    if (!driver) {
        notFound();
    }

    return (
        <div className="container mx-auto p-4 sm:p-8 md:p-12 max-w-4xl">
            <header className="flex justify-between items-center mb-8">
                 <KartPassLogo />
                 <div className="flex gap-2">
                    <Button asChild variant="outline">
                        <Link href="/admin">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Tilbake til Innsjekk
                        </Link>
                    </Button>
                    <LogoutButton />
                 </div>
            </header>
           
            <DriverProfilePage initialDriver={driver} />
        </div>
    );
}
