"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Driver, Race, RaceSignup } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Flag, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { addRaceSignup } from '@/services/race-service';
import { format, parseISO } from 'date-fns';

interface RaceSignupHeaderButtonProps {
    driver: Driver;
    races: Race[];
    driverRaceSignups: RaceSignup[];
}

export function RaceSignupHeaderButton({ driver, races, driverRaceSignups }: RaceSignupHeaderButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedClasses, setSelectedClasses] = useState<Record<string, string>>({});
    const { toast } = useToast();
    const router = useRouter();
    
    const signedUpRaceIds = new Set(driverRaceSignups.map(s => s.raceId));
    const upcomingRaces = races.filter(r => r.status === 'upcoming');

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
            await addRaceSignup({
                raceId: race.id,
                driverId: driver.id,
                driverName: driver.name,
                driverKlasse: selectedClass
            });
            toast({
                title: "Løpspåmelding Vellykket!",
                description: `Du er nå påmeldt ${race.name} i klassen ${selectedClass}.`
            });
            setIsOpen(false);
            router.refresh(); 
        } catch(error) {
            toast({
                variant: 'destructive',
                title: 'Påmelding til løp feilet',
                description: (error as Error).message,
            });
        }
    };

    return (
        <>
            <Button variant="default" onClick={() => setIsOpen(true)}>
                <Flag className="mr-2 h-4 w-4" />
                Meld på til Løp
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Løpspåmelding</DialogTitle>
                        <DialogDescription>
                          Se kommende løp og meld deg på.
                        </DialogDescription>
                    </DialogHeader>
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
                </DialogContent>
            </Dialog>
        </>
    );
}
