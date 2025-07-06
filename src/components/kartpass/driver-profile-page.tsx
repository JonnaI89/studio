"use client";

import { useState } from 'react';
import type { Driver } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateDriver } from '@/services/driver-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { DriverForm } from './driver-form';
import { Separator } from '@/components/ui/separator';
import { Pencil, User, Calendar, Users, Shield, CarFront, UserCheck, Hash, Trophy, Bike, Phone } from 'lucide-react';
import { calculateAge } from '@/lib/utils';

interface DriverProfilePageProps {
    initialDriver: Driver;
}

interface InfoItemProps {
    icon: React.ReactNode;
    label: string;
    value?: string | null;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3">
                <span className="h-6 w-6 text-muted-foreground">{icon}</span>
                <span className="text-muted-foreground">{label}</span>
            </div>
            <span className="font-semibold text-right break-words">{value || 'Mangler'}</span>
        </div>
    )
}

export function DriverProfilePage({ initialDriver }: DriverProfilePageProps) {
    const [driver, setDriver] = useState<Driver>(initialDriver);
    const [isEditing, setIsEditing] = useState(false);
    const { toast } = useToast();

    const handleSave = async (updatedDriver: Driver) => {
        try {
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

    const handleTrainingSignup = () => {
        // Placeholder for actual signup logic
        toast({
            title: "Påmelding Vellykket!",
            description: `${driver.name} er nå påmeldt til dagens trening.`,
        });
    }

    const age = calculateAge(driver.dob);
    const isUnderage = age !== null && age < 18;

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader className="flex flex-row items-start sm:items-center justify-between">
                    <div>
                        <CardTitle className="text-3xl">{driver.name}</CardTitle>
                        <CardDescription>Førerprofil og innstillinger</CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => setIsEditing(!isEditing)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Rediger</span>
                    </Button>
                </CardHeader>
                <CardContent>
                    {isEditing ? (
                        <DriverForm
                            driverToEdit={driver}
                            onSave={handleSave}
                            closeDialog={() => setIsEditing(false)}
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                <InfoItem icon={<Calendar />} label="Alder" value={age !== null ? `${age} år` : 'Mangler'} />
                                <InfoItem icon={<Users />} label="Klubb" value={driver.club} />
                                <InfoItem icon={<Trophy />} label="Klasse" value={driver.klasse} />
                                <InfoItem icon={<Hash />} label="Startnummer" value={driver.startNr} />
                                <InfoItem icon={<UserCheck />} label="Førerlisens" value={driver.driverLicense} />
                                <InfoItem icon={<CarFront />} label="Vognlisens" value={driver.vehicleLicense} />
                            </div>
                           
                            {isUnderage && (
                                <>
                                <Separator />
                                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                                  <h3 className="font-semibold flex items-center mb-2"><Shield className="mr-2 h-5 w-5 text-amber-600" />Foresattes Informasjon</h3>
                                   {!driver.guardian || !driver.guardian.name ? (
                                        <p className="text-destructive">Foresattes informasjon mangler.</p>
                                   ) : (
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                            <InfoItem icon={<User />} label="Navn" value={driver.guardian.name} />
                                            <InfoItem icon={<Phone />} label="Kontakt" value={driver.guardian.contact} />
                                            <InfoItem icon={<UserCheck />} label="Foresattlisens" value={driver.guardian.guardianLicense} />
                                       </div>
                                   )}
                                </div>
                              </>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Treningspåmelding</CardTitle>
                    <CardDescription>Meld deg på tilgjengelige treningsøkter.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Her vil du i fremtiden se en liste over tilgjengelige treninger og løp.</p>
                </CardContent>
                <CardFooter>
                     <Button onClick={handleTrainingSignup}>
                        <Bike className="mr-2 h-4 w-4" />
                        Meld deg på Dagens Trening
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
