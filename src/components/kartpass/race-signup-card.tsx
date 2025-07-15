
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Driver, Race, RaceSignup } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { addRaceSignup, deleteRaceSignup } from '@/services/race-service';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Flag, CheckCircle, Trophy, Trash2, Calendar, User, CreditCard, Tent } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RaceSignupsDialog } from './race-signups-dialog';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

interface RaceSignupCardProps {
    driver: Driver;
    races: Race[];
    driverRaceSignups: RaceSignup[];
}

export function RaceSignupCard({ driver, races, driverRaceSignups }: RaceSignupCardProps) {
    const [selectedClasses, setSelectedClasses] = useState<Record<string, string>>({});
    const [wantsCamping, setWantsCamping] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    
    const signedUpRaceIds = new Set(driverRaceSignups.map(s => s.raceId));
    
    const upcomingRaces = races
        .filter(r => !isBefore(startOfDay(parseISO(r.endDate || r.date)), startOfDay(new Date())))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const signedUpRaces = driverRaceSignups
        .map(signup => ({
            signup,
            race: races.find(r => r.id === signup.raceId)
        }))
        .filter(item => item.race)
        .sort((a, b) => new Date(a.race!.date).getTime() - new Date(b.race!.date).getTime());
        
    const formatDateRange = (startDate: string, endDate?: string) => {
        const start = format(parseISO(startDate), "dd.MM.yyyy");
        if (endDate && endDate !== startDate) {
            const end = format(parseISO(endDate), "dd.MM.yyyy");
            return `${start} - ${end}`;
        }
        return start;
    };

    const handleRaceSignup = async (race: Race, selectedClass: string | undefined) => {
        if (!selectedClass) {
            toast({ variant: 'destructive', title: 'Klasse mangler', description: 'Du må velge en klasse for å melde deg på.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await addRaceSignup({
                raceId: race.id,
                driverId: driver.id,
                driverName: driver.name,
                driverKlasse: selectedClass,
                wantsCamping: wantsCamping[race.id] || false,
            });
            toast({
                title: "Løpspåmelding Vellykket!",
                description: `Du er nå påmeldt ${race.name} i klassen ${selectedClass}.`
            });
            router.refresh(); 
        } catch(error) {
            toast({ variant: 'destructive', title: 'Påmelding til løp feilet', description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelSignup = async (signupId: string, raceName: string) => {
        setIsSubmitting(true);
        try {
            await deleteRaceSignup(signupId);
            toast({ title: "Avmelding Vellykket", description: `Du er nå meldt av ${raceName}.` });
            router.refresh();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Avmelding feilet', description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getEntryFeeForClass = (race: Race, klasse: string | undefined): number | undefined => {
        if (!klasse) return race.entryFee;
        const classFee = race.classFees?.find(cf => cf.klasse.toLowerCase() === klasse.toLowerCase());
        return classFee ? classFee.fee : race.entryFee;
    }


    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Påmelding til Løp</CardTitle>
                    <CardDescription>Her kan du melde deg på kommende løp. Velg et løp, velg klasse, og bekreft.</CardDescription>
                </CardHeader>
                <CardContent>
                    {upcomingRaces.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {upcomingRaces.map(race => {
                                const selectedClass = selectedClasses[race.id];
                                const entryFee = getEntryFeeForClass(race, selectedClass);
                                const totalFee = (entryFee || 0) + ((wantsCamping[race.id] && race.campingFee) ? race.campingFee : 0);

                                return (
                                <AccordionItem value={race.id} key={race.id}>
                                    <AccordionTrigger disabled={signedUpRaceIds.has(race.id)}>
                                        <div className='flex justify-between w-full pr-4 items-center'>
                                            <span className="flex items-center gap-2">
                                                {signedUpRaceIds.has(race.id) && <CheckCircle className="h-5 w-5 text-green-600" />}
                                                {race.name}
                                            </span>
                                            <span className="text-sm text-muted-foreground">{formatDateRange(race.date, race.endDate)}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="p-2 space-y-4">
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{race.description}</p>
                                            
                                            <div className="space-y-2">
                                                {race.availableClasses && race.availableClasses.length > 0 ? (
                                                    <div className="flex items-end gap-4">
                                                        <div className="flex-1">
                                                            <Label>Klasse</Label>
                                                            <Select onValueChange={(value) => setSelectedClasses(prev => ({ ...prev, [race.id]: value }))}>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Velg klasse..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {race.availableClasses.map(cls => (
                                                                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm font-semibold text-destructive">Påmelding er ikke mulig (ingen klasser definert).</p>
                                                )}

                                                {race.campingFee && (
                                                    <div className="flex items-center space-x-2 pt-2">
                                                        <Checkbox 
                                                            id={`camping-${race.id}`} 
                                                            checked={wantsCamping[race.id] || false}
                                                            onCheckedChange={(checked) => setWantsCamping(prev => ({...prev, [race.id]: !!checked}))}
                                                        />
                                                        <Label htmlFor={`camping-${race.id}`}>Jeg ønsker camping (+{race.campingFee},- kr)</Label>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                                                <div className="flex items-center gap-2 font-semibold text-primary">
                                                    <CreditCard className="h-5 w-5" />
                                                    <span>Totalbeløp: {totalFee},- kr</span>
                                                </div>
                                                <Button onClick={() => handleRaceSignup(race, selectedClass)} disabled={!selectedClass || isSubmitting}>
                                                    <Flag className="mr-2 h-4 w-4"/>Meld på
                                                </Button>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )})}
                        </Accordion>
                    ) : (
                        <p className="text-center text-muted-foreground py-4">Ingen kommende løp er lagt til enda.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Dine Påmeldte Løp</CardTitle>
                    <CardDescription>Oversikt over løp du er påmeldt til.</CardDescription>
                </CardHeader>
                <CardContent>
                    {signedUpRaces.length > 0 ? (
                        <ul className="space-y-4">
                            {signedUpRaces.map(({ signup, race }) => race && (
                                <li key={signup.id} className="p-4 bg-muted/50 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <p className="font-bold text-lg">{race.name}</p>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {formatDateRange(race.date, race.endDate)}</span>
                                            <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4" /> {signup.driverKlasse}</span>
                                            {signup.wantsCamping && <span className="flex items-center gap-1.5 text-sky-600"><Tent className="h-4 w-4" /> Inkl. Camping</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 self-start sm:self-center">
                                         <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="sm"><User className="mr-2 h-4 w-4" />Se påmeldte</Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>Påmeldte til {race.name}</DialogTitle>
                                                    <DialogDescription>
                                                        Liste over førere som er påmeldt dette løpet, sortert etter klasse.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <RaceSignupsDialog raceId={race.id} />
                                            </DialogContent>
                                        </Dialog>

                                        {!isBefore(startOfDay(parseISO(race.date)), startOfDay(new Date())) && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm" disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4" />Meld av</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Meld av fra {race.name}?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                          Er du sikker på at du vil melde deg av dette løpet? Du kan melde deg på igjen senere hvis du ombestemmer deg.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleCancelSignup(signup.id, race.name)}>Ja, meld av</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <p className="text-center text-muted-foreground py-4">Du er ikke påmeldt noen løp.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
