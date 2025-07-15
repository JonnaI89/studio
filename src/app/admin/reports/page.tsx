
import { ReportsPage } from '@/components/kartpass/reports-page';
import { FoererportalenLogo } from '@/components/icons/kart-pass-logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAllCheckins } from '@/services/checkin-service';
import { getDrivers } from '@/services/driver-service';


export default async function Page() {
    const allCheckins = await getAllCheckins();
    const allDrivers = await getDrivers();

    return (
        <div className="container mx-auto p-4 sm:p-8 md:p-12 max-w-6xl">
            <header className="flex justify-between items-center mb-8">
                 <FoererportalenLogo />
                 <div className="flex items-center gap-4">
                    <Button asChild variant="outline">
                        <Link href="/admin">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Tilbake til oversikt
                        </Link>
                    </Button>
                 </div>
            </header>
           
            <ReportsPage allCheckins={allCheckins} allDrivers={allDrivers} />
        </div>
    );
}
