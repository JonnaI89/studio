"use client";

import type { Driver } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, ShieldCheck, Users, Shield, Calendar, Timer, CheckCircle2 } from "lucide-react";
import { CheckeredFlagIcon } from "../icons/checkered-flag-icon";

interface DriverInfoCardProps {
  driver: Driver;
  age: number;
  onCheckIn: () => void;
  onReset: () => void;
  isCheckedIn: boolean;
  checkInTime: string | null;
}

export function DriverInfoCard({ driver, age, onCheckIn, onReset, isCheckedIn, checkInTime }: DriverInfoCardProps) {
  const isUnderage = age < 18;

  const getLicenseVariant = (status: Driver['licenseStatus']) => {
    switch (status) {
      case 'Gyldig':
        return 'default';
      case 'Utløpt':
        return 'destructive';
      case 'Ingen':
        return 'secondary';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  }

  return (
    <Card className="w-full max-w-md animate-in fade-in zoom-in-95 shadow-xl">
      <CardHeader className="text-center">
        <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary/20">
          <AvatarImage src={`https://placehold.co/100x100.png`} alt={driver.name} data-ai-hint="driver portrait" />
          <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
            {getInitials(driver.name)}
          </AvatarFallback>
        </Avatar>
        <CardTitle className="text-3xl font-bold">{driver.name}</CardTitle>
        <CardDescription>Førerprofil</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 text-sm">
          <InfoItem icon={<Calendar className="text-primary" />} label="Alder" value={`${age} år`} />
          <InfoItem icon={<ShieldCheck className="text-primary" />} label="Lisens">
            <Badge variant={getLicenseVariant(driver.licenseStatus)}>{driver.licenseStatus}</Badge>
          </InfoItem>
          <InfoItem icon={<Users className="text-primary" />} label="Klubb" value={driver.club} />
        </div>
        
        {isUnderage && (
          <>
            <Separator />
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <h3 className="font-semibold flex items-center"><Shield className="mr-2 h-4 w-4 text-amber-600" />Foresattes informasjon</h3>
              {driver.guardian ? (
                <>
                  <InfoItem icon={<User className="text-amber-600" />} label="Navn" value={driver.guardian.name} />
                  <InfoItem icon={<Timer className="text-amber-600"/>} label="Kontakt" value={driver.guardian.contact} />
                </>
              ) : (
                <p className="text-destructive-foreground bg-destructive p-2 rounded-md">Foresattes detaljer mangler for mindreårig fører.</p>
              )}
            </div>
          </>
        )}

        {isCheckedIn && checkInTime && (
            <div className="p-3 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-lg flex items-center justify-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-5 w-5"/>
                <p><span className="font-semibold">Innsjekket kl:</span> {checkInTime}</p>
            </div>
        )}

      </CardContent>
      <CardFooter className="flex flex-col gap-2 pt-4">
        <Button 
          onClick={onCheckIn}
          disabled={isCheckedIn || (isUnderage && !driver.guardian)}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg py-7 px-8"
        >
          <CheckeredFlagIcon className="mr-2 h-6 w-6" />
          {isCheckedIn ? 'Innsjekket' : 'Sjekk inn fører'}
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
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="h-6 w-6">{icon}</span>
                <span className="text-muted-foreground">{label}</span>
            </div>
            {value && <span className="font-semibold">{value}</span>}
            {children}
        </div>
    )
}
