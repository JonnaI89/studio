
"use client";

import { useState } from 'react';
import type { Driver } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { updateDriver } from '@/services/driver-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DriverForm } from './driver-form';
import { Separator } from '@/components/ui/separator';
import { Pencil, User, Calendar as CalendarIcon, Users, Shield, CarFront, UserCheck, Hash, Trophy, Phone, Group, Signal } from 'lucide-react';
import { calculateAge, parseDateString } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { PasswordChangeForm } from '../auth/password-change-form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface DriverProfilePageProps {
    initialDriver: Driver;
    profileId: string;
}

interface InfoItemProps {
    icon: React.ReactNode;
    label: string;
    value?: string | null;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
    if (!value && typeof value !== 'string') return null;
    return (
        <div className="flex items-start justify-between gap-4 py-3">
            <div className="flex items-center gap-4">
                <span className="h-6 w-6 text-muted-foreground">{icon}</span>
                <span className="text-muted-foreground whitespace-nowrap">{label}</span>
            </div>
            <span className="font-semibold text-right break-words">{value || <span className="text-muted-foreground/70 font-normal italic">Mangler</span>}</span>
        </div>
    )
}

export function DriverProfilePage({ initialDriver, profileId }: DriverProfilePageProps) {
    const [driver, setDriver] = useState<Driver>(initialDriver);
    const [isEditing, setIsEditing] = useState(false);
    const { toast } = useToast();
    const { isAdmin } = useAuth();

    const handleSave = async (driverData: Omit<Driver, 'id'>, id?: string) => {
        if (!id) return;
        try {
            const updatedDriverData: Driver = { ...driver, ...driverData, id: id };
            await updateDriver(profileId, updatedDriverData);
            setDriver(updatedDriverData);
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

    const age = driver.dob ? calculateAge(driver.dob) : null;
    const isUnderage = age !== null && age < 18;
    const hasGuardianInfo = driver.guardians && driver.guardians.length > 0;

    return (
        <div className="space-y-8">
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
                             <ScrollArea className="h-[65vh] pr-4">
                                <DriverForm
                                    driverToEdit={driver}
                                    onSave={handleSave}
                                    closeDialog={() => setIsEditing(false)}
                                    isRestrictedView={!isAdmin}
                                />
                             </ScrollArea>
                        </div>
                    ) : (
                        <div className="space-y-2">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                                <div>
                                    <InfoItem icon={<CalendarIcon />} label="Fødselsdato" value={driver.dob ? format(parseDateString(driver.dob)!, "dd.MM.yyyy") : null} />
                                    <InfoItem icon={<Users />} label="Klubb" value={driver.club} />
                                    <InfoItem icon={<Trophy />} label="Klasse" value={driver.klasse} />
                                    <InfoItem icon={<Hash />} label="Startnummer" value={driver.startNr} />
                                    <InfoItem icon={<Signal />} label="Transponder" value={driver.transponderNr} />
                                </div>
                                <div>
                                    <InfoItem icon={<UserCheck />} label="Førerlisens" value={driver.driverLicense} />
                                    <InfoItem icon={<CarFront />} label="Vognlisens" value={driver.vehicleLicense} />
                                    <InfoItem icon={<Hash />} label="Chassi nr" value={driver.chassiNr} />
                                    <InfoItem icon={<Hash />} label="Motor nr 1" value={driver.motorNr1} />
                                    <InfoItem icon={<Hash />} label="Motor nr 2" value={driver.motorNr2} />
                                </div>
                            </div>
                            <InfoItem icon={<Group />} label="Teamlisens" value={driver.teamLicense} />
                           
                            {isUnderage && !driver.teamLicense && (
                                <>
                                <Separator className="my-2"/>
                                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                                  <h3 className="font-semibold flex items-center mb-2"><Shield className="mr-2 h-5 w-5 text-amber-600" />Foresattes Informasjon</h3>
                                   {!hasGuardianInfo ? (
                                        <p className="text-destructive">Foresattes informasjon mangler.</p>
                                   ) : (
                                       <div className="space-y-4">
                                            {driver.guardians?.map((guardian, index) => (
                                                <div key={guardian.id} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 border-t pt-4 first:border-t-0 first:pt-0">
                                                    <InfoItem icon={<User />} label={`Foresatt ${index + 1}`} value={guardian.name} />
                                                    <InfoItem icon={<Phone />} label="Kontakt" value={guardian.contact} />
                                                    {guardian.licenses?.map((license, lIndex) => (
                                                        <InfoItem key={lIndex} icon={<Shield />} label={`Lisens ${lIndex + 1}`} value={license} />
                                                    ))}
                                                </div>
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
