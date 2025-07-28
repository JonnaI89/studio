
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { RaceSignupWithDriver } from '@/services/race-service';
import type { Race, SiteSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { recordCheckin } from '@/services/checkin-service';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CreditCard, Trophy, Tent, CheckCircle2, Pencil } from 'lucide-react';
import { Input } from '../ui/input';

interface RaceCheckinDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  signup?: RaceSignupWithDriver;
  race?: Race | null;
  settings?: SiteSettings | null;
  onCheckinSuccess: () => void;
}

export function RaceCheckinDialog({ isOpen, onOpenChange, signup, race, settings, onCheckinSuccess }: RaceCheckinDialogProps) {
  const { toast } = useToast();
  const [isEditingAmount, setIsEditingAmount] = useState(false);

  const calculatedAmount = useMemo(() => {
    if (!signup || !race) return 0;
    
    const getEntryFeeForClass = (race: Race, klasse: string | undefined): number => {
      if (!klasse) return race.entryFee || 0;
      const classFee = race.classFees?.find(cf => cf.klasse.toLowerCase() === klasse.toLowerCase());
      return classFee ? classFee.fee : (race.entryFee || 0);
    };

    let amount = getEntryFeeForClass(race, signup.driverKlasse);
    if (signup.wantsCamping && race.campingFee) {
      amount += race.campingFee;
    }
    return amount;
  }, [signup, race]);
  
  const [currentAmount, setCurrentAmount] = useState(calculatedAmount);

  useEffect(() => {
      setCurrentAmount(calculatedAmount);
  }, [calculatedAmount, isOpen]);

  const handleConfirmPayment = async () => {
    if (!signup || !race) return;
     try {
      const now = new Date();
      const time = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const date = now.toISOString().split('T')[0];

      await recordCheckin({
        driverId: signup.driverId,
        driverName: signup.driverName,
        driverKlasse: signup.driverKlasse,
        checkinDate: date,
        checkinTime: time,
        paymentStatus: 'paid',
        eventType: 'race',
        eventId: race.id,
        eventName: race.name,
        amountPaid: currentAmount,
      });

      toast({
        title: 'Innsjekk Vellykket',
        description: `${signup.driverName} er nå sjekket inn for ${race.name}.`,
      });

      onCheckinSuccess();

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Innsjekk Feilet',
        description: `Betalingen ble bekreftet, men innsjekkingen kunne ikke lagres: ${(error as Error).message}`,
      });
    }
  };

  if (!isOpen || !signup || !race) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Løpsinnsjekk: {race.name}</DialogTitle>
          <DialogDescription>
             Manuell betaling og innsjekk for {signup.driverName}
          </DialogDescription>
        </DialogHeader>

        <div className="my-8 flex flex-col items-center gap-4 text-center">
            <CreditCard className="h-16 w-16 text-primary" />
            <p className="text-lg font-semibold">Klar for betaling</p>
            <p className="text-sm text-muted-foreground">Bruk kortterminalen til å ta betalt beløpet under. Trykk bekreft når betalingen er fullført.</p>
        </div>

        <div className="mt-4 w-full rounded-md border p-4 text-center space-y-2">
            {isEditingAmount ? (
                <div className="flex items-center gap-2 max-w-xs mx-auto">
                    <Input 
                        type="number"
                        value={currentAmount}
                        onChange={(e) => setCurrentAmount(Number(e.target.value))}
                        onBlur={() => setIsEditingAmount(false)}
                        autoFocus
                        className="text-center font-bold text-xl h-12"
                    />
                     <Button size="icon" variant="ghost" onClick={() => setIsEditingAmount(false)}><CheckCircle2 className="h-5 w-5" /></Button>
                </div>
            ) : (
                <div 
                    className="flex items-center justify-center gap-2 font-bold text-xl cursor-pointer group"
                    onClick={() => setIsEditingAmount(true)}
                >
                    <span>Totalbeløp: {currentAmount},- kr</span>
                    <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            )}
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2"><Trophy className="h-4 w-4" /> {signup.driverKlasse}</div>
              {signup.wantsCamping && <div className="flex items-center justify-center gap-2"><Tent className="h-4 w-4" /> Inkluderer camping</div>}
            </div>
        </div>
        
        <div className="flex justify-center gap-2 pt-4">
             <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
             <Button onClick={handleConfirmPayment} disabled={isEditingAmount}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Bekreft Betaling & Sjekk inn
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
