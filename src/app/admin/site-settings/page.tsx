import { getSiteSettings } from '@/services/settings-service';
import { SiteSettingsEditor } from '@/components/kartpass/site-settings-editor';
import { VarnaCheckLogo } from '@/components/icons/kart-pass-logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function SiteSettingsPage() {
    const settings = await getSiteSettings();

    return (
        <div className="container mx-auto p-4 sm:p-8 md:p-12 max-w-4xl">
            <header className="flex justify-between items-center mb-8">
                <VarnaCheckLogo />
                <Button asChild variant="outline">
                    <Link href="/admin">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tilbake til Innsjekk
                    </Link>
                </Button>
            </header>
            <main>
                <SiteSettingsEditor initialSettings={settings} />
            </main>
        </div>
    );
}
