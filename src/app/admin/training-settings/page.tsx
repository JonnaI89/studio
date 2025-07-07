import { getTrainingSettings } from '@/services/training-service';
import { TrainingSettingsForm } from '@/components/kartpass/training-settings-form';
import { FoererportalenLogo } from '@/components/icons/kart-pass-logo';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LogoutButton } from '@/components/auth/logout-button';

export default async function TrainingSettingsPage() {
    const settings = await getTrainingSettings();

    return (
        <div className="container mx-auto p-4 sm:p-8 md:p-12 max-w-4xl">
            <header className="flex justify-between items-center mb-8">
                <FoererportalenLogo />
                <LogoutButton variant="outline" />
            </header>
            <main>
                <Card>
                    <CardHeader>
                        <CardTitle>Administrer Treningsdager</CardTitle>
                        <CardDescription>
                            Definer faste treningsdager for hver måned i sesongen. 
                            Endringene vil umiddelbart reflekteres i kalenderen førerne ser.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TrainingSettingsForm initialSettings={settings} />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
