
"use client";

import type { Driver, Guardian, DriverProfile } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, Users, Calendar, Phone, CheckCircle2, CarFront, UserCheck, CreditCard, Group, Star, Signal, Hash, Pencil, Trophy, Flag, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { DriverForm } from "./driver-form";
import { useToast } from "@/hooks/use-toast";
import { updateDriver } from "@/services/driver-service";
import { calculateAge, parseDateString } from "@/lib/utils";
import { format } from "date-fns";

interface DriverInfoCardProps {
  driver: Driver;
  age: number | null;
  onCheckIn: () => void;
  onReset: () => void;
  isCheckedIn: boolean;
  checkInTime: string | null;
  paymentStatus: 'paid' | 'unpaid' | 'season_pass' | 'one_time_license' | null;
  onProfileUpdate: (updatedDriver: Driver) => void;
  isRaceDay?: boolean;
  isSignedUpForRace?: boolean;
}

export function DriverInfoCard({ 
  driver, 
  age, 
  onCheckIn, 
  onReset, 
  isCheckedIn, 
  checkInTime, 
  paymentStatus, 
  onProfileUpdate,
  isRaceDay = false,
  isSignedUpForRace = false
}: DriverInfoCardProps) {
  const isUnderage = age !== null && age < 18;
  const [activeTab, setActiveTab] = useState("info");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  const handleSave = async (driverData: Omit<Driver, 'id' | 'role'>, id?: string) => {
    if (!id) return;
    setIsSaving(true);
    try {
        const updatedDriverData: Driver = { ...driver, ...driverData, id: id };
        await updateDriver(updatedDriverData);
        onProfileUpdate(updatedDriverData);
        setActiveTab("info");
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
    } finally {
      setIsSaving(false);
    }
  };

  const hasGuardianInfo = driver.guardians && driver.guardians.length > 0;
  
  const getCheckinButtonState = () => {
    if (isCheckedIn) {
      return { text: "Innsjekket", icon: <CheckCircle2 className="mr-2 h-6 w-6" />, disabled: true };
    }
    if (isRaceDay) {
      if (!isSignedUpForRace) {
        return { text: "Ikke påmeldt løp", icon: <AlertTriangle className="mr-2 h-6 w-6" />, disabled: true };
      }
      return { text: "Gå til løpsinnsjekk", icon: <Flag className="mr-2 h-6 w-6" />, disabled: false };
    }
    if (driver.hasSeasonPass) {
      return { text: "Sjekk Inn (Årskort)", icon: <UserCheck className="mr-2 h-6 w-6" />, disabled: false };
    }
    return { text: "Betal & Sjekk Inn", icon: <CreditCard className="mr-2 h-6 w-6" />, disabled: false };
  };

  const checkinButton = getCheckinButtonState();

  const isUnderageAndMissingInfo = isUnderage && !hasGuardianInfo && !driver.teamLicense;
  
  return (
    <Card className="w-full max-w-5xl animate-in fade-in zoom-in-95 shadow-xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-6">
                        <Avatar className="w-24 h-24 border-4 border-primary/20">
                        <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
                            {getInitials(driver.name)}
                        </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-3xl font-bold">{driver.name}</CardTitle>
                            <CardDescription className="text-base">{driver.club}</CardDescription>
                        </div>
                    </div>
                    <TabsList>
                        <TabsTrigger value="info">Info</TabsTrigger>
                        <TabsTrigger value="tech">Lisenser & Teknisk</TabsTrigger>
                        <TabsTrigger value="edit">
                            <Pencil className="mr-2 h-4 w-4" /> Rediger
                        </TabsTrigger>
                    </TabsList>
                </div>
            </CardHeader>
            <CardContent>
                <TabsContent value="info" className="mt-0">
                    <div className="p-6 border rounded-lg bg-muted/30">
                        {driver.hasSeasonPass && !isRaceDay && (
                            <div className="p-3 mb-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center gap-2 text-primary">
                                <Star className="h-5 w-5"/>
                                <p className="font-semibold">Innehaver av Årskort</p>
                            </div>
                        )}
                         {isRaceDay && !isSignedUpForRace && (
                            <div className="p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-center gap-2 text-destructive">
                                <AlertTriangle className="h-5 w-5"/>
                                <p className="font-semibold">Fører er ikke påmeldt dette løpet</p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                            <InfoItem icon={<Trophy className="text-primary" />} label="Klasse" value={driver.klasse} />
                            <InfoItem icon={<UserCheck className="text-primary" />} label="Førerlisens" value={driver.driverLicense} />
                            <InfoItem icon={<CarFront className="text-primary" />} label="Vognlisens" value={driver.vehicleLicense} />
                            <InfoItem icon={<Group className="text-primary" />} label="Teamlisens" value={driver.teamLicense} />
                        </div>
                        {isUnderage && !driver.teamLicense && (
                            <>
                                <Separator className="my-6" />
                                <div className="space-y-4">
                                <h3 className="font-semibold flex items-center mb-4"><Shield className="mr-2 h-5 w-5 text-amber-600" />Foresattes informasjon</h3>
                                {!hasGuardianInfo ? (
                                    <p className="text-destructive pt-2">Foresattes informasjon mangler.</p>
                                ) : (
                                    <div className="space-y-6">
                                        {driver.guardians?.map((guardian) => (
                                           <GuardianInfoSection key={guardian.id} guardian={guardian} />
                                        ))}
                                    </div>
                                )}
                                </div>
                            </>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="tech" className="mt-0">
                    <div className="p-6 border rounded-lg bg-muted/30">
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                            <InfoItem icon={<Calendar className="text-primary" />} label="Alder" value={age !== null ? `${age} år (${driver.dob ? format(parseDateString(driver.dob)!, 'dd.MM.yyyy') : 'Ukjent dato'})` : 'Ukjent'} />
                            <InfoItem icon={<Hash className="text-primary" />} label="Startnummer" value={driver.startNr} />
                            <InfoItem icon={<Signal className="text-primary" />} label="Transponder" value={driver.transponderNr} />
                            <InfoItem icon={<Hash className="text-primary" />} label="Chassi nr" value={driver.chassiNr} />
                            <InfoItem icon={<Hash className="text-primary" />} label="Motor nr 1" value={driver.motorNr1} />
                            <InfoItem icon={<Hash className="text-primary" />} label="Motor nr 2" value={driver.motorNr2} />
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="edit" className="mt-0">
                    <div className="p-2 border rounded-lg bg-muted/30">
                        <DriverForm 
                            driverToEdit={driver} 
                            onSave={handleSave} 
                            isSaving={isSaving}
                            closeDialog={() => setActiveTab("info")} 
                        />
                    </div>
                </TabsContent>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 pt-6 border-t">
            {isCheckedIn && checkInTime && (
                <div className={`w-full mb-2 p-3 rounded-lg flex items-center justify-center gap-2 animate-in fade-in ${paymentStatus === 'paid' || paymentStatus === 'season_pass' || paymentStatus === 'one_time_license' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                    <CheckCircle2 className="h-5 w-5"/>
                    <div>
                        <span className="font-semibold">Innsjekket kl:</span> {checkInTime}
                        {paymentStatus && <span className="font-semibold ml-2">Status:</span>}
                        {paymentStatus === 'paid' ? ' Betalt' : paymentStatus === 'season_pass' ? ' Årskort' : paymentStatus === 'one_time_license' ? ' Engangslisens' : ' Ubetalt'}
                    </div>
                </div>
            )}
            {isUnderageAndMissingInfo && (
                <div className="w-full mb-2 p-3 rounded-lg flex items-center justify-center gap-2 animate-in fade-in bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <p className="font-semibold">Kan ikke sjekke inn: Foresattes informasjon mangler for fører under 18 år.</p>
                </div>
            )}
            <div className="w-full flex gap-2">
                <Button variant="outline" onClick={onReset} className="w-full">
                    Skann neste fører
                </Button>
                <Button 
                onClick={onCheckIn}
                disabled={checkinButton.disabled || isUnderageAndMissingInfo}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg py-7 px-8"
                >
                    {checkinButton.icon}
                    {checkinButton.text}
                </Button>
            </div>
            </CardFooter>
        </Tabs>
    </Card>
  );
}

function GuardianInfoSection({ guardian }: { guardian: Guardian }) {
    return (
        <div className="p-4 border rounded-md bg-background/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 pt-2 text-sm">
                <InfoItem icon={<User className="text-amber-600" />} label="Navn" value={guardian.name} />
                <InfoItem icon={<Phone className="text-amber-600"/>} label="Kontakt" value={guardian.contact} />
                {guardian.licenses?.map((license, index) => (
                <InfoItem key={index} icon={<Shield className="text-amber-600" />} label={`Lisens ${index + 1}`} value={license} />
                ))}
            </div>
        </div>
    )
}

interface InfoItemProps {
    icon: React.ReactNode;
    label: string;
    value?: string;
    children?: React.ReactNode;
}

function InfoItem({ icon, label, value, children }: InfoItemProps) {
    if (!value && !children) return null;
    return (
        <div className="flex items-center justify-between gap-4 border-b pb-2">
            <div className="flex items-center gap-2">
                <span className="h-5 w-5 shrink-0">{icon}</span>
                <span className="text-muted-foreground">{label}</span>
            </div>
            <div className="text-right">
                {value ? <span className="font-semibold break-words">{value}</span> : <span className="text-muted-foreground/70 font-normal italic">Mangler</span>}
                {children}
            </div>
        </div>
    )
}

    