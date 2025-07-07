import { getSiteSettings } from '@/services/settings-service';
import { SiteSettingsEditor } from '@/components/kartpass/site-settings-editor';
import { FoererportalenLogo } from '@/components/icons/kart-pass-logo';
import { LogoutButton } from '@/components/auth/logout-button';

export default async function SiteSettingsPage() {
    const settings = await getSiteSettings();

    return (
        <div className="container mx-auto p-4 sm:p-8 md:p-12 max-w-4xl">
            <header className="flex justify-between items-center mb-8">
                <FoererportalenLogo />
                <LogoutButton variant="outline" />
            </header>
            <main>
                <SiteSettingsEditor initialSettings={settings} />
            </main>
        </div>
    );
}
