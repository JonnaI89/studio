
"use client";

import { useState, useEffect } from 'react';
import type { Driver, TrainingSettings, Race, RaceSignup, TrainingSignup } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateDriver } from '@/services/driver-service';
import { addTrainingSignup, getSignupsByDate, deleteTrainingSignup } from '@/services/training-service';
import { deleteRaceSignup } from '@/services/race-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { DriverForm } from './driver-form';
import { Separator } from '@/components/ui/separator';
import { Pencil, User, Calendar as CalendarIcon, Users, Shield, CarFront, UserCheck, Hash, Trophy, Bike, Phone, Group, Signal, Flag, X, LoaderCircle, Eye } from 'lucide-react';
import { calculateAge } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { PasswordChangeForm } from '../auth/password-change-form';
import { Calendar } from '@/components/ui/calendar';
import { getMonth, getYear, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RaceSignupsDialog } from './race-signups-dialog';
import { RaceSignupHeaderButton } from './race-signup-header-button';


interface DriverProfilePageProps {
    initialDriver: Driver;
    trainingSettings: TrainingSettings | null;
    races?: Race[];
    driverRaceSignups?: RaceSignup[];
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

export function DriverProfilePage({ initialDriver, trainingSettings, races = [], driverRaceSignups = [] }: DriverProfilePageProps) {
    const [driver, setDriver] = useState<Driver>(initialDriver);
    const [isEditing, setIsEditing] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const { isAdmin } = useAuth();
    
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date());
    const [trainingDays, setTrainingDays] = useState<Date[]>([]);
    const [driverSignup, setDriverSignup] = useState<TrainingSignup | null>(null);
    const [isLoadingSignupStatus, setIsLoadingSignupStatus] = useState(false);
    const [viewingSignupsForRace, setViewingSignupsForRace] = useState<Race | null>(null);
    const [isUnsigningUp, setIsUnsigningUp] = useState<string | null>(null);


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
    
    useEffect(() => {
        const fetchSignupStatus = async () => {
            if (!selectedDate) {
                setDriverSignup(null);
                return;
            }
            setIsLoadingSignupStatus(true);
            try {
                const dateString = format(selectedDate, "yyyy-MM-dd");
                const signups = await getSignupsByDate(dateString);
                const foundSignup = signups.find(s => s.driverId === driver.id) || null;
                setDriverSignup(foundSignup);
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Feil ved henting av påmeldinger',
                    description: "Kunne ikke sjekke påmeldingsstatus for valgt dato.",
                });
            } finally {
                setIsLoadingSignupStatus(false);
            }
        };

        fetchSignupStatus();
    }, [selectedDate, driver.id, toast]);


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
    
    const handleToggleTrainingSignup = async () => {
        if (!isTrainingDaySelected || !selectedDate) return;

        setIsLoadingSignupStatus(true);
        if (driverSignup) {
            try {
                await deleteTrainingSignup(driverSignup.id);
                toast({
                    title: "Avmelding Vellykket!",
                    description: `${driver.name} er nå meldt av treningen ${format(selectedDate, 'dd.MM.yyyy')}.`,
                });
                setDriverSignup(null);
            } catch (error) {
                 toast({
                    variant: 'destructive',
                    title: 'Avmelding Feilet',
                    description: (error as Error).message || "En feil oppsto under avmelding.",
                });
            } finally {
                setIsLoadingSignupStatus(false);
            }
        } else {
            try {
                const newSignup = await addTrainingSignup({
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
                setDriverSignup(newSignup);
            } catch (error) {
                 toast({
                    variant: 'destructive',
                    title: 'Påmelding Feilet',
                    description: (error as Error).message || "En feil oppsto under påmelding.",
                });
            } finally {
                setIsLoadingSignupStatus(false);
            }
        }
    }

    const handleRaceUnsignup = async (signupId: string, raceName: string) => {
        if (!signupId) return;
        if (!window.confirm(`Er du sikker på at du vil melde deg av ${raceName}?`)) return;

        setIsUnsigningUp(signupId);
        try {
            await deleteRaceSignup(signupId);
            toast({
                title: "Avmelding fra løp Vellykket",
                description: `Du er nå meldt av fra ${raceName}.`
            });
            router.refresh();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Avmelding fra løp feilet',
                description: (error as Error).message,
            });
        } finally {
            setIsUnsigningUp(null);
        }
    }

    const age = calculateAge(driver.dob);
    const isUnderage = age !== null && age < 18;
    const signedUpRaceIds = new Set(driverRaceSignups.map(s => s.raceId));

    const signedUpRaces = races
        .filter(r => signedUpRaceIds.has(r.id))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Løpspåmelding</CardTitle>
                    <CardDescription>Se kommende løp og meld deg på.</CardDescription>
                </CardHeader>
                <CardContent>
                    <RaceSignupHeaderButton 
                        driver={driver}
                        races={races}
                        driverRaceSignups={driverRaceSignups}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Treningspåmelding</CardTitle>
                    <CardDescription>Velg en uthevet treningsdag fra kalenderen og trykk på knappen for å melde deg på eller av.</CardDescription>
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
                     <Button 
                        onClick={handleToggleTrainingSignup} 
                        disabled={!isTrainingDaySelected || isLoadingSignupStatus}
                        variant={driverSignup ? "destructive" : "default"}
                        className="w-full sm:w-auto"
                    >
                        {isLoadingSignupStatus ? (
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : driverSignup ? (
                            <X className="mr-2 h-4 w-4" />
                        ) : (
                            <Bike className="mr-2 h-4 w-4" />
                        )}

                        {isLoadingSignupStatus
                            ? 'Sjekker status...'
                            : driverSignup && selectedDate
                            ? `Meld av fra ${format(selectedDate, 'dd.MM.yyyy')}`
                            : isTrainingDaySelected && selectedDate
                            ? `Meld på til ${format(selectedDate, 'dd.MM.yyyy')}`
                            : 'Velg en treningsdag'
                        }
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
                        <div className="flex flex-wrap gap-2">
                             <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {isEditing ? 'Avbryt' : 'Rediger Profil'}
                            </Button>
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
                                <InfoItem icon={<Hash />} label="Chassi nr" value={driver.chassiNr} />
                                <InfoItem icon={<Hash />} label="Motor nr 1" value={driver.motorNr1} />
                                <InfoItem icon={<Hash />} label="Motor nr 2" value={driver.motorNr2} />
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

                            <Separator className="my-4"/>
                            <div className="space-y-2">
                                <h3 className="font-semibold flex items-center mb-2"><Flag className="mr-2 h-5 w-5 text-primary" />Påmeldte Løp</h3>
                                {signedUpRaces.length > 0 ? (
                                    <div className="border rounded-md divide-y divide-border">
                                        {signedUpRaces.map(race => {
                                            const signup = driverRaceSignups.find(s => s.raceId === race.id);
                                            return (
                                                <div key={race.id} className="flex items-center justify-between p-3 gap-4">
                                                    <div>
                                                        <p className="font-medium">{race.name} ({format(parseISO(race.date), 'dd.MM.yyyy')})</p>
                                                        <p className="text-sm text-muted-foreground">Klasse: {signup?.driverKlasse || 'N/A'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="outline" size="sm" onClick={() => setViewingSignupsForRace(race)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Se påmeldte
                                                        </Button>
                                                        {signup && race.status === 'upcoming' && (
                                                            <Button 
                                                                variant="destructive"
                                                                size="sm" 
                                                                onClick={() => handleRaceUnsignup(signup.id, race.name)}
                                                                disabled={isUnsigningUp === signup.id}
                                                            >
                                                                {isUnsigningUp === signup.id ? (
                                                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <X className="mr-2 h-4 w-4" />
                                                                )}
                                                                Meld av
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Du er ikke påmeldt noen løp.</p>
                                )}
                            </div>
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
            
            <Dialog open={!!viewingSignupsForRace} onOpenChange={(isOpen) => !isOpen && setViewingSignupsForRace(null)}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Påmeldte til {viewingSignupsForRace?.name}</DialogTitle>
                        <DialogDescription>
                            Liste over førere som er påmeldt dette løpet, sortert etter klasse.
                        </DialogDescription>
                    </DialogHeader>
                    {viewingSignupsForRace && <RaceSignupsDialog raceId={viewingSignupsForRace.id} />}
                </DialogContent>
            </Dialog>
        </div>
    );
}
