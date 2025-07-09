"use client";

import type { Driver } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Shield, Users, Calendar, Phone, CheckCircle2, CarFront, UserCheck, CreditCard, Group, Star, Signal } from "lucide-react";

interface DriverInfoCardProps {
  driver: Driver;
  age: number | null;
  onCheckIn: () => void;
  onReset: () => void;
  isCheckedIn: boolean;
  checkInTime: string | null;
  paymentStatus: 'paid' | 'unpaid' | 'season_pass' | null;
}

export function DriverInfoCard({ driver, age, onCheckIn, onReset, isCheckedIn, checkInTime, paymentStatus }: DriverInfoCardProps) {
  const isUnderage = age !== null && age < 18;

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  return (
    <Card className="w-full animate-in fade-in zoom-in-95 shadow-xl">
      <CardHeader className="text-center">
        <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary/20">
          <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
            {getInitials(driver.name)}
          </AvatarFallback>
        </Avatar>
        <CardTitle className="text-3xl font-bold">{driver.name}</CardTitle>
        <CardDescription>Førerprofil</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {driver.hasSeasonPass && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center gap-2 text-primary">
                <Star className="h-5 w-5"/>
                <p className="font-semibold">Innehaver av Årskort</p>
            </div>
        )}
        <div className="grid grid-cols-1 gap-4 text-sm">
          <InfoItem icon={<Calendar className="text-primary" />} label="Alder" value={age !== null ? `${age} år` : 'Mangler'} />
          <InfoItem icon={<Users className="text-primary" />} label="Klubb" value={driver.club} />
           {driver.teamLicense && <InfoItem icon={<Group className="text-primary" />} label="Team" value={driver.teamLicense} />}
          <Separator />
          <InfoItem icon={<Signal className="text-primary" />} label="Transponder" value={driver.transponderNr || 'Mangler'} />
          <InfoItem icon={<UserCheck className="text-primary" />} label="Førerlisens" value={driver.driverLicense || 'Mangler'} />
          <InfoItem icon={<CarFront className="text-primary" />} label="Vognlisens" value={driver.vehicleLicense || 'Mangler'} />
        </div>
        
        {isUnderage && driver.guardian && !driver.teamLicense && (
          <>
            <Separator />
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <h3 className="font-semibold flex items-center"><Shield className="mr-2 h-4 w-4 text-amber-600" />Foresattes informasjon</h3>
              <>
                <InfoItem icon={<User className="text-amber-600" />} label="Navn" value={driver.guardian.name} />
                <InfoItem icon={<Phone className="text-amber-600"/>} label="Kontakt" value={driver.guardian.contact} />
                {driver.guardian.licenses?.map((license, index) => (
                   <InfoItem key={index} icon={<Shield className="text-amber-600" />} label={`Foresattlisens ${index + 1}`} value={license} />
                ))}
              </>
            </div>
          </>
        )}

        {isUnderage && !driver.guardian && !driver.teamLicense && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-center font-medium text-destructive">Foresattes detaljer mangler for mindreårig fører.</p>
            </div>
        )}

        {isCheckedIn && checkInTime && (
            <div className={`p-3 rounded-lg flex items-center justify-center gap-2 animate-in fade-in ${paymentStatus === 'paid' || paymentStatus === 'season_pass' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                <CheckCircle2 className="h-5 w-5"/>
                <div>
                  <span className="font-semibold">Innsjekket kl:</span> {checkInTime}
                  {paymentStatus && <span className="font-semibold ml-2">Status:</span>}
                  {paymentStatus === 'paid' ? ' Betalt' : paymentStatus === 'season_pass' ? ' Årskort' : ' Ubetalt'}
                </div>
            </div>
        )}

      </CardContent>
      <CardFooter className="flex flex-col gap-2 pt-4">
        <Button 
          onClick={onCheckIn}
          disabled={isCheckedIn || (isUnderage && !driver.guardian && !driver.teamLicense)}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg py-7 px-8"
        >
          {isCheckedIn 
            ? <><CheckCircle2 className="mr-2 h-6 w-6" />Innsjekket</>
            : driver.hasSeasonPass
              ? <><UserCheck className="mr-2 h-6 w-6" />Sjekk Inn (Årskort)</>
              : <><CreditCard className="mr-2 h-6 w-6" />Betal & Sjekk Inn</>
          }
        </Button>
         <Button variant="outline" onClick={onReset} className="w-full">
            Skann neste fører
        </Button>
      </CardFooter>
    </Card>
  );
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
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <span className="h-6 w-6 shrink-0">{icon}</span>
                <span className="text-muted-foreground">{label}</span>
            </div>
            <div className="text-right">
                {value && <span className="font-semibold break-words">{value}</span>}
                {children}
            </div>
        </div>
    )
}
