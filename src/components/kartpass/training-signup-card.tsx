"use client";

import { useState, useMemo } from 'react';
import type { Driver, TrainingSettings, TrainingSignup } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addTrainingSignup, deleteTrainingSignup } from '@/services/training-service';
import { useRouter } from 'next/navigation';
import { format, getDay, isBefore, startOfDay, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarCheck } from 'lucide-react';

interface TrainingSignupCardProps {
    driver: Driver;
    initialSettings: TrainingSettings;
    initialSignups: TrainingSignup[];
}

export function TrainingSignupCard({ driver, initialSettings, initialSignups }: TrainingSignupCardProps) {
    const [signups, setSignups] = useState<TrainingSignup[]>(initialSignups);
    const { toast } = useToast();
    const router = useRouter();

    const trainingDaysInMonth = useMemo(() => {
        const days = new Set<string>();
        if (!initialSettings || !initialSettings.rules) return days;
        
        const today = startOfDay(new Date());
        const year = initialSettings.year;

        initialSettings.rules.forEach(rule => {
            const month = rule.month;
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            for (let day = 1; day <= daysInMonth; day++) {
                const currentDate = new Date(year, month, day);
                if (rule.daysOfWeek.includes(getDay(currentDate)) && !isBefore(currentDate, today)) {
                    days.add(format(currentDate, 'yyyy-MM-dd'));
                }
            }
        });
        return days;
    }, [initialSettings]);

    const signedUpDates = useMemo(() => 
        new Set(signups.map(s => s.trainingDate)), 
    [signups]);

    const handleDayClick = async (day: Date | undefined) => {
        if (!day) return;

        const dateString = format(day, 'yyyy-MM-dd');

        if (!trainingDaysInMonth.has(dateString)) {
            toast({
                variant: 'destructive',
                title: 'Ingen trening denne dagen',
                description: 'Dette er ikke en definert treningsdag.',
            });
            return;
        }

        const existingSignup = signups.find(s => s.trainingDate === dateString);

        try {
            if (existingSignup) {
                // Un-register
                await deleteTrainingSignup(existingSignup.id);
                setSignups(prev => prev.filter(s => s.id !== existingSignup.id));
                toast({
                    title: 'Avmeldt fra trening',
                    description: `Du er nå avmeldt fra treningen ${format(day, 'dd.MM.yyyy')}.`,
                });
            } else {
                // Register
                const newSignupData = {
                    driverId: driver.id,
                    driverName: driver.name,
                    driverKlasse: driver.klasse,
                    trainingDate: dateString,
                    signedUpAt: new Date().toISOString(),
                };
                const newSignup = await addTrainingSignup(newSignupData);
                setSignups(prev => [...prev, newSignup]);
                toast({
                    title: 'Påmeldt trening!',
                    description: `Du er nå påmeldt trening ${format(day, 'dd.MM.yyyy')}.`,
                });
            }
            router.refresh();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'En feil oppstod',
                description: (error as Error).message,
            });
        }
    };
    
    const upcomingSignups = signups
        .filter(s => !isBefore(startOfDay(parseISO(s.trainingDate)), startOfDay(new Date())))
        .sort((a, b) => new Date(a.trainingDate).getTime() - new Date(b.trainingDate).getTime());

    return (
        <Card>
            <CardHeader>
                <CardTitle>Påmelding til Trening</CardTitle>
                <CardDescription>
                    Velg en tilgjengelig dag i kalenderen for å melde deg på eller av trening. Dine kommende påmeldinger vises under.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
                <div>
                     <Calendar
                        mode="single"
                        onDayClick={handleDayClick}
                        modifiers={{ 
                            training: (date) => trainingDaysInMonth.has(format(date, 'yyyy-MM-dd')),
                            signedup: (date) => signedUpDates.has(format(date, 'yyyy-MM-dd'))
                        }}
                        modifiersClassNames={{
                            training: 'training-day',
                            signedup: 'bg-primary/20 rounded-md',
                        }}
                        disabled={(date) => !trainingDaysInMonth.has(format(date, 'yyyy-MM-dd')) || isBefore(date, startOfDay(new Date()))}
                        className="rounded-md border p-0"
                    />
                    <div className="flex items-center gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm border-2 border-accent"></div> Tilgjengelig</div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-primary/20"></div> Påmeldt</div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold">Dine kommende påmeldinger</h3>
                    {upcomingSignups.length > 0 ? (
                         <ScrollArea className="h-64 pr-4">
                            <ul className="space-y-3">
                                {upcomingSignups.map(signup => (
                                    <li key={signup.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <CalendarCheck className="h-5 w-5 text-primary" />
                                            <div>
                                                <p className="font-medium">{format(parseISO(signup.trainingDate), 'EEEE d. MMMM yyyy', { locale: nb })}</p>
                                                <p className="text-xs text-muted-foreground">{signup.driverKlasse || 'Ingen klasse angitt'}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    ) : (
                        <p className="text-sm text-muted-foreground pt-4 text-center">Du er ikke påmeldt noen kommende treninger.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
