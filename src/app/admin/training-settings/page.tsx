import { getTrainingSettings } from '@/services/training-service';
import { TrainingSettingsForm } from '@/components/kartpass/training-settings-form';
import { VarnaCheckLogo } from '@/components/icons/kart-pass-logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default async function TrainingSettingsPage() {
    const settings = await getTrainingSettings();

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
