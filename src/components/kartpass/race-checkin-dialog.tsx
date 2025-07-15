
"use client";

import { useState, useEffect } from 'react';
import type { RaceSignupWithDriver } from '@/services/race-service';
import type { Race } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { recordCheckin } from '@/services/checkin-service';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoaderCircle, CreditCard, User, Trophy, Tent } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RaceCheckinDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  signup?: RaceSignupWithDriver;
  race?: Race | null;
  onCheckinSuccess: () => void;
}

export function RaceCheckinDialog({ isOpen, onOpenChange, signup, race, onCheckinSuccess }: RaceCheckinDialogProps) {
  const [amount, setAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (signup && race) {
      const getEntryFeeForClass = (race: Race, klasse: string | undefined): number => {
        if (!klasse) return race.entryFee || 0;
        const classFee = race.classFees?.find(cf => cf.klasse.toLowerCase() === klasse.toLowerCase());
        return classFee ? classFee.fee : (race.entryFee || 0);
      };

      let calculatedAmount = getEntryFeeForClass(race, signup.driverKlasse);
      if (signup.wantsCamping && race.campingFee) {
        calculatedAmount += race.campingFee;
      }
      setAmount(calculatedAmount);
    }
  }, [signup, race]);

  const handleCheckin = async () => {
    if (!signup || !race) return;

    setIsLoading(true);
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
        paymentStatus: 'paid', // Assume paid on race day checkin
        eventType: 'race',
        eventId: race.id,
        eventName: race.name,
        amountPaid: amount,
      });

      toast({
        title: 'Innsjekk Vellykket',
        description: `${signup.driverName} er nå sjekket inn for ${race.name}.`,
      });
      onCheckinSuccess();
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Innsjekk Feilet',
        description: (error as Error).message || 'En ukjent feil oppsto.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!signup || !race) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sjekk inn til {race.name}</DialogTitle>
          <DialogDescription>Bekreft ankomst og betaling for føreren.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 border rounded-md bg-muted/50 space-y-2">
            <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> <strong>{signup.driverName}</strong></div>
            <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-muted-foreground" /> {signup.driverKlasse}</div>
            {signup.wantsCamping && <div className="flex items-center gap-2"><Tent className="h-4 w-4 text-sky-600" /> Inkluderer camping</div>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Beløp å betale (kr)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Rediger beløpet for sponsede førere eller andre unntak.</p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={isLoading}>Avbryt</Button>
          </DialogClose>
          <Button onClick={handleCheckin} disabled={isLoading}>
            {isLoading ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            Bekreft innsjekk og betaling
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
