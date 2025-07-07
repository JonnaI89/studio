"use client";

import { useState, useEffect } from 'react';
import type { Driver, TrainingSettings, Race, RaceSignup } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateDriver } from '@/services/driver-service';
import { addTrainingSignup } from '@/services/training-service';
import { addRaceSignup } from '@/services/race-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { DriverForm } from './driver-form';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, User, Calendar as CalendarIcon, Users, Shield, CarFront, UserCheck, Hash, Trophy, Bike, Phone, Group, LogOut, Signal, Flag, CheckCircle } from 'lucide-react';
import { calculateAge } from '@/lib/utils';
import { signOut } from '@/services/auth-service';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { PasswordChangeForm } from '../auth/password-change-form';
import { Calendar } from '@/components/ui/calendar';
import { getMonth, getYear, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, format, parseISO } from 'date-fns';

interface DriverProfilePageProps {
    initialDriver: Driver;
    trainingSettings: TrainingSettings | null;
    races: Race[];
    driverRaceSignups: RaceSignup[];
}

interface InfoItemProps {
    icon: React.ReactNode;
    label: string;
    value?: string | null;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
    if (!value) return null;
    return (
        <div className="flex items-start justify-between gap-4 py-3">
            <div className="flex items-center gap-4">
                <span className="h-6 w-6 text-muted-foreground">{icon}</span>
                <span className="text-muted-foreground whitespace-nowrap">{label}</span>
            </div>
            <span className="font-semibold text-right break-words">{value}</span>
        </div>
    )
}

export function DriverProfilePage({ initialDriver, trainingSettings, races, driverRaceSignups: initialDriverRaceSignups }: DriverProfilePageProps) {
    const [driver, setDriver] = useState<Driver>(initialDriver);
    const [isEditing, setIsEditing] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const { isAdmin } = useAuth();
    
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date());
    const [trainingDays, setTrainingDays] = useState<Date[]>([]);
    const [driverRaceSignups, setDriverRaceSignups] = useState<RaceSignup[]>(initialDriverRaceSignups);
    const [selectedClasses, setSelectedClasses] = useState<Record<string, string>>({});

    const getTrainingDaysForMonth = (monthDate: Date): Date[] => {
        if (!trainingSettings) return [];
        const month = getMonth(monthDate);
        const year = getYear(monthDate);
        if (year !== trainingSettings.year) return [];
        const ruleForMonth = trainingSettings.rules.find(r => r.month === month);
        if (!ruleForMonth) return [];
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        const daysInMonth = eachDayOfInterval({ start, end });
        return daysInMonth.filter(day => ruleForMonth.daysOfWeek.includes(day.getDay()));
    };

    useEffect(() => {
        if (trainingSettings) {
           setTrainingDays(getTrainingDaysForMonth(currentDisplayMonth));
        }
    }, [currentDisplayMonth, trainingSettings]);

    const handleSave = async (driverData: Omit<Driver, 'id'>, id?: string) => {
        if (!id) return;
        try {
            const updatedDriver: Driver = { ...driverData, id: id };
            await updateDriver(updatedDriver);
            setDriver(updatedDriver);
            setIsEditing(false);
            toast({
                title: "Profil Oppdatert",
                description: "Endringene dine er lagret.",
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Lagring feilet',
                description: (error as Error).message || 'Kunne ikke lagre endringene.',
            });
        }
    };
    
    const isTrainingDaySelected = selectedDate && trainingDays.some(trainingDay => isSameDay(trainingDay, selectedDate));
    
    const handleTrainingSignup = async () => {
        if (!isTrainingDaySelected || !selectedDate) return;
        
        try {
            await addTrainingSignup({
                driverId: driver.id,
                driverName: driver.name,
                driverKlasse: driver.klasse,
                trainingDate: format(selectedDate, 'yyyy-MM-dd'),
                signedUpAt: new Date().toISOString(),
            });
            toast({
                title: "Påmelding Vellykket!",
                description: `${driver.name} er nå påmeldt til trening ${format(selectedDate, 'dd.MM.yyyy')}.`,
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Påmelding Feilet',
                description: (error as Error).message || "En feil oppsto under påmelding.",
            });
        }
    }

    const handleRaceSignup = async (race: Race, selectedClass: string | undefined) => {
        if (!selectedClass) {
            toast({
                variant: 'destructive',
                title: 'Klasse mangler',
                description: 'Du må velge en klasse for å melde deg på.'
            });
            return;
        }
        try {
            const newSignup = await addRaceSignup({
                raceId: race.id,
                driverId: driver.id,
                driverName: driver.name,
                driverKlasse: selectedClass
            });
            setDriverRaceSignups(prev => [...prev, newSignup]);
            toast({
                title: "Løpspåmelding Vellykket!",
                description: `Du er nå påmeldt ${race.name} i klassen ${selectedClass}.`
            });
        } catch(error) {
            toast({
                variant: 'destructive',
                title: 'Påmelding til løp feilet',
                description: (error as Error).message,
            });
        }
    };

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };

    const age = calculateAge(driver.dob);
    const isUnderage = age !== null && age < 18;
    const signedUpRaceIds = new Set(driverRaceSignups.map(s => s.raceId));
    const upcomingRaces = races.filter(r => r.status === 'upcoming');

    const signedUpRaces = races
        .filter(r => signedUpRaceIds.has(r.id))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Løpspåmelding</CardTitle>
                    <CardDescription>Se kommende løp og meld deg på. Dine påmeldinger listes nederst.</CardDescription>
                </CardHeader>
                <CardContent>
                    {upcomingRaces.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {upcomingRaces.map(race => (
                                <AccordionItem value={race.id} key={race.id}>
                                    <AccordionTrigger>
                                        <div className='flex justify-between w-full pr-4 items-center'>
                                            <span>{race.name}</span>
                                            <span className="text-sm text-muted-foreground">{format(parseISO(race.date), 'dd.MM.yyyy')}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="p-2 space-y-4">
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{race.description}</p>
                                            
                                            {race.availableClasses && race.availableClasses.length > 0 ? (
                                                <div className="flex items-center gap-4">
                                                    <Select onValueChange={(value) => setSelectedClasses(prev => ({ ...prev, [race.id]: value }))}>
                                                        <SelectTrigger className="w-[220px]">
                                                            <SelectValue placeholder="Velg klasse..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {race.availableClasses.map(cls => (
                                                                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button onClick={() => handleRaceSignup(race, selectedClasses[race.id])} disabled={signedUpRaceIds.has(race.id) || !selectedClasses[race.id]}>
                                                        {signedUpRaceIds.has(race.id) 
                                                            ? <><CheckCircle className="mr-2 h-4 w-4"/>Påmeldt</> 
                                                            : <><Flag className="mr-2 h-4 w-4"/>Meld på</>
                                                        }
                                                    </Button>
                                                </div>
                                            ) : (
                                                <p className="text-sm font-semibold text-destructive">Påmelding er ikke mulig (ingen klasser definert for dette løpet).</p>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <p className="text-center text-muted-foreground py-4">Ingen kommende løp er lagt til enda.</p>
                    )}
                </CardContent>
                {signedUpRaces.length > 0 && (
                     <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
                        <h3 className="font-semibold">Dine påmeldinger:</h3>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {signedUpRaces.map(race => (
                                <li key={race.id}>{race.name} ({format(parseISO(race.date), 'dd.MM.yyyy')})</li>
                            ))}
                        </ul>
                    </CardFooter>
                )}
            </Card>


            <Card>
                <CardHeader>
                    <CardTitle>Treningspåmelding</CardTitle>
                    <CardDescription>Velg en uthevet treningsdag fra kalenderen og trykk på knappen for å melde deg på.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        month={currentDisplayMonth}
                        onMonthChange={setCurrentDisplayMonth}
                        modifiers={{
                            training: trainingDays,
                            disabled: (date) => date < new Date() && !isSameDay(date, new Date())
                        }}
                        modifiersClassNames={{
                            training: 'training-day',
                        }}
                        className="rounded-md border"
                    />
                </CardContent>
                <CardFooter>
                     <Button onClick={handleTrainingSignup} disabled={!isTrainingDaySelected}>
                        <Bike className="mr-2 h-4 w-4" />
                        {isTrainingDaySelected && selectedDate
                            ? `Meld på til ${format(selectedDate, 'dd.MM.yyyy')}`
                            : 'Velg en treningsdag'}
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                     <div className="flex flex-col sm:flex-row items-start gap-6">
                        <div className="flex-1">
                            <CardTitle className="text-3xl">{driver.name}</CardTitle>
                            <CardDescription>Førerprofil og innstillinger</CardDescription>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {isEditing ? 'Avbryt' : 'Rediger Profil'}
                            </Button>
                            {!isAdmin && (
                                <Button variant="ghost" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logg ut
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isEditing ? (
                        <div className="pt-4 border-t">
                             <DriverForm
                                driverToEdit={driver}
                                onSave={handleSave}
                                closeDialog={() => setIsEditing(false)}
                                isRestrictedView={!isAdmin}
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                                <InfoItem icon={<CalendarIcon />} label="Alder" value={age !== null ? `${age} år` : 'Mangler'} />
                                <InfoItem icon={<Users />} label="Klubb" value={driver.club} />
                                <InfoItem icon={<Trophy />} label="Klasse" value={driver.klasse} />
                                <InfoItem icon={<Hash />} label="Startnummer" value={driver.startNr} />
                                <InfoItem icon={<Signal />} label="Transponder" value={driver.transponderNr} />
                                <InfoItem icon={<UserCheck />} label="Førerlisens" value={driver.driverLicense} />
                                <InfoItem icon={<CarFront />} label="Vognlisens" value={driver.vehicleLicense} />
                                <InfoItem icon={<Group />} label="Teamlisens" value={driver.teamLicense} />
                            </div>
                           
                            {isUnderage && !driver.teamLicense && (
                                <>
                                <Separator className="my-2"/>
                                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                                  <h3 className="font-semibold flex items-center mb-2"><Shield className="mr-2 h-5 w-5 text-amber-600" />Foresattes Informasjon</h3>
                                   {!driver.guardian || !driver.guardian.name ? (
                                        <p className="text-destructive">Foresattes informasjon mangler.</p>
                                   ) : (
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                                            <InfoItem icon={<User />} label="Navn" value={driver.guardian.name} />
                                            <InfoItem icon={<Phone />} label="Kontakt" value={driver.guardian.contact} />
                                            {driver.guardian.licenses?.map((license, index) => (
                                                <InfoItem key={index} icon={<Shield />} label={`Lisens ${index + 1}`} value={license} />
                                            ))}
                                       </div>
                                   )}
                                </div>
                              </>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {!isEditing && (
                <Card>
                    <CardHeader>
                        <CardTitle>Endre Passord</CardTitle>
                        <CardDescription>
                            Oppdater passordet du bruker for å logge inn. Passordet må være minst 6 tegn.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PasswordChangeForm />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
