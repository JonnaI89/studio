
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { RaceSignupWithDriver } from '@/services/race-service';
import type { Race, SiteSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { recordCheckin } from '@/services/checkin-service';
import { initiateZettlePushPayment } from '@/services/zettle-service';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { LoaderCircle, CreditCard, User, Trophy, Tent, CheckCircle2, XCircle, Wifi, ServerCrash, Pencil } from 'lucide-react';
import { Input } from '../ui/input';

interface RaceCheckinDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  signup?: RaceSignupWithDriver;
  race?: Race | null;
  settings?: SiteSettings | null;
  onCheckinSuccess: () => void;
}

type PaymentStatus = "idle" | "initializing" | "connecting_ws" | "waiting_for_reader" | "waiting_for_payment" | "successful" | "failed" | "cancelled";


export function RaceCheckinDialog({ isOpen, onOpenChange, signup, race, settings, onCheckinSuccess }: RaceCheckinDialogProps) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
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


  const cleanUpSocket = useCallback(() => {
    if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
    }
  }, []);

  const handlePaymentCompleted = useCallback(async () => {
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

      setTimeout(() => {
          onCheckinSuccess();
      }, 1500);

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Innsjekk Feilet',
        description: `Betalingen var vellykket, men innsjekkingen kunne ikke lagres: ${(error as Error).message}`,
      });
    }
  }, [signup, race, currentAmount, toast, onCheckinSuccess]);


  const startPaymentProcess = useCallback(async () => {
    if (!signup || !settings?.zettleLinkId) {
        if(currentAmount === 0) {
           await handlePaymentCompleted();
           setStatus("successful");
        } else if (!settings?.zettleLinkId) {
            setError("Zettle Terminal ID er ikke konfigurert i nettstedinnstillingene.");
            setStatus("failed");
        }
        return;
    }
    
    setStatus("initializing");
    setError(null);
    cleanUpSocket();

    try {
      const { webSocketUrl, paymentId } = await initiateZettlePushPayment({
        linkId: settings.zettleLinkId,
        amount: currentAmount * 100,
        reference: `KARTPASS-${signup.driverId.slice(0, 6)}-${Date.now()}`
      });
      
      setStatus("connecting_ws");
      const socket = new WebSocket(webSocketUrl);
      socketRef.current = socket;

      socket.onopen = () => setStatus("waiting_for_reader");

      socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          switch(data.eventName) {
              case "PAYMENT_IN_PROGRESS":
                  setStatus("waiting_for_payment");
                  break;
              case "PAYMENT_COMPLETED":
                  setStatus("successful");
                  handlePaymentCompleted();
                  break;
              case "PAYMENT_CANCELLED":
                  setStatus("cancelled");
                  setError("Betalingen ble avbrutt på terminalen.");
                  break;
          }
      };

      socket.onerror = (err) => {
          console.error("WebSocket Error:", err);
          setError("Tilkoblingsfeil til betalingsterminalen. Prøv igjen.");
          setStatus("failed");
          cleanUpSocket();
      };
      
      socket.onclose = () => {
        if(status !== 'successful' && status !== 'cancelled' && status !== 'failed') {
           setError("Tilkoblingen til terminalen ble brutt.");
           setStatus("failed");
        }
      };

    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error("Error starting payment process:", errorMessage);
      toast({ variant: "destructive", title: "Betalingsfeil", description: errorMessage });
      setStatus("failed");
      setError(errorMessage);
    }
  }, [signup, settings, currentAmount, cleanUpSocket, status, handlePaymentCompleted, toast]);
  
  useEffect(() => {
    if (isOpen && signup) {
      startPaymentProcess();
    } else {
      setStatus("idle");
      setError(null);
      cleanUpSocket();
    }
    return () => cleanUpSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, signup]);

  const getStatusContent = () => {
    switch (status) {
      case "initializing": return { icon: <LoaderCircle className="h-16 w-16 text-primary animate-spin" />, title: "Initialiserer betaling...", description: "Klargjør sikker forespørsel." };
      case "connecting_ws": return { icon: <Wifi className="h-16 w-16 text-primary animate-pulse" />, title: "Kobler til terminal...", description: "Etablerer sanntids-kobling." };
      case "waiting_for_reader": return { icon: <CreditCard className="h-16 w-16 text-primary" />, title: "Venter på terminal", description: "Sendt forespørsel. Sjekk terminal-skjermen." };
      case "waiting_for_payment": return { icon: <CreditCard className="h-16 w-16 text-accent animate-pulse" />, title: "Klar for betaling", description: "Fullfør betalingen på kortterminalen." };
      case "successful": return { icon: <CheckCircle2 className="h-16 w-16 text-green-600" />, title: "Betaling Bekreftet!", description: "Innsjekking fullført. Lukker vindu..." };
      case "cancelled": return { icon: <XCircle className="h-16 w-16 text-amber-600" />, title: "Betaling Avbrutt", description: error || "Handlingen ble avbrutt på terminalen." };
      case "failed": return { icon: <ServerCrash className="h-16 w-16 text-destructive" />, title: "Betaling Mislyktes", description: error || "En ukjent feil oppstod." };
      default: return { icon: <LoaderCircle className="h-16 w-16 text-muted-foreground" />, title: "Laster...", description: "Vennligst vent." };
    }
  };

  const { icon, title, description } = getStatusContent();

  if (!isOpen || !signup || !race) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Løpsinnsjekk: {race.name}</DialogTitle>
          <DialogDescription>
             Betaling og innsjekk for {signup.driverName}
          </DialogDescription>
        </DialogHeader>

        <div className="my-8 flex flex-col items-center gap-4 text-center">
          {icon}
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground h-4">{description}</p>
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
        
        {(status === "failed" || status === "cancelled") && (
            <div className="flex justify-center gap-2 pt-4">
                 <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
                 <Button onClick={startPaymentProcess} disabled={isEditingAmount}>Prøv igjen</Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
