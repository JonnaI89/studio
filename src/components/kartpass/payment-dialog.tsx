
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2, XCircle, LoaderCircle, Wifi, WifiOff } from "lucide-react";
import type { Driver, SiteSettings } from "@/lib/types";
import { initiateZettlePayment, getLinkedReaders, type ZettleLink } from "@/services/zettle-service";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";


interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPaymentSuccess: (amountPaid: number) => void;
  driver: Driver | null;
  settings: SiteSettings | null;
}

type PaymentStatus = "idle" | "awaiting_reader" | "in_progress" | "success" | "failed";

export function PaymentDialog({ isOpen, onOpenChange, onPaymentSuccess, driver, settings }: PaymentDialogProps) {
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [paymentMessage, setPaymentMessage] = useState("Vennligst velg en kortleser for å starte.");
  const [readers, setReaders] = useState<ZettleLink[]>([]);
  const [selectedReader, setSelectedReader] = useState<string | undefined>();
  const [isFetchingReaders, setIsFetchingReaders] = useState(false);
  const [finalAmount, setFinalAmount] = useState(0);

  const calculatedPrice = (() => {
    if (!settings) return 250;
    const today = new Date();
    const dayOfWeek = today.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return isWeekend ? settings.weekendPrice ?? 350 : settings.weekdayPrice ?? 250;
  })();
  
  useEffect(() => {
    if (isOpen) {
        // Reset state when dialog opens
        setPaymentStatus("idle");
        setPaymentMessage("Vennligst velg en kortleser for å starte.");
        setSelectedReader(undefined);
        setFinalAmount(0);

        const fetchReaders = async () => {
            setIsFetchingReaders(true);
            try {
                const fetchedReaders = await getLinkedReaders();
                setReaders(fetchedReaders);
                if (fetchedReaders.length > 0) {
                   setSelectedReader(fetchedReaders[0].id);
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Feil', description: "Kunne ikke hente tilkoblede Zettle-lesere." });
            } finally {
                setIsFetchingReaders(false);
            }
        };

        fetchReaders();
    }
  }, [isOpen, toast]);

  const handleInitiatePayment = async () => {
    if (!driver || !selectedReader) {
        toast({ variant: 'destructive', title: 'Mangler informasjon', description: 'Fører og kortleser må være valgt.' });
        return;
    }

    setPaymentStatus("awaiting_reader");
    setPaymentMessage("Kobler til kortleser og sender betalingsforespørsel...");
    
    try {
        const result = await initiateZettlePayment({
            amount: calculatedPrice,
            reference: `FP-${driver.id.substring(0, 8)}-${Date.now()}`,
            readerId: selectedReader
        });
        
        if (result.status === 'completed') {
            setPaymentStatus("success");
            setPaymentMessage("Betalingen var vellykket!");
            setFinalAmount(calculatedPrice);
            setTimeout(() => {
              onPaymentSuccess(calculatedPrice)
            }, 1500);
        } else {
             setPaymentStatus("failed");
             setPaymentMessage(`Betalingen feilet eller ble avbrutt. Status: ${result.status}`);
        }
    } catch (error) {
        setPaymentStatus("failed");
        setPaymentMessage((error as Error).message || "En ukjent feil oppsto under betalingen.");
    }
  };
  
  if (!isOpen) return null;

  const renderContent = () => {
      switch (paymentStatus) {
          case 'idle':
              return (
                <>
                    <div className="my-8 flex flex-col items-center gap-4 text-center">
                        <CreditCard className="h-16 w-16 text-primary" />
                        <p className="text-lg font-semibold">Klar for betaling</p>
                        <p className="text-sm text-muted-foreground">Velg en tilkoblet kortleser og start betalingen for {driver?.name}.</p>
                    </div>
                     <div className="mt-4 w-full rounded-md border p-4 text-center space-y-4">
                        <p className="font-bold text-xl">Total: {calculatedPrice},- kr</p>
                        <p className="text-sm text-muted-foreground">Produkt: Dagspass</p>
                         {isFetchingReaders ? <LoaderCircle className="animate-spin mx-auto"/> : (
                             <Select onValueChange={setSelectedReader} value={selectedReader}>
                                 <SelectTrigger className="w-[280px] mx-auto">
                                     <SelectValue placeholder="Velg kortleser..."/>
                                 </SelectTrigger>
                                 <SelectContent>
                                     {readers.map(r => <SelectItem key={r.id} value={r.id}>{r.integratorTags?.deviceName || r.readerTags?.model || 'Ukjent Leser'}</SelectItem>)}
                                 </SelectContent>
                             </Select>
                         )}
                    </div>
                    <div className="flex justify-center gap-2 pt-4">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
                        <Button onClick={handleInitiatePayment} disabled={!selectedReader || isFetchingReaders}>
                            <Wifi className="mr-2 h-4 w-4" />
                            Start Betaling
                        </Button>
                    </div>
                 </>
              );
          case 'awaiting_reader':
          case 'in_progress':
              return (
                 <div className="my-8 flex flex-col items-center gap-4 text-center h-64 justify-center">
                    <LoaderCircle className="h-16 w-16 text-primary animate-spin-slow" />
                    <p className="text-lg font-semibold">Venter på kortleser...</p>
                    <p className="text-sm text-muted-foreground px-4">{paymentMessage}</p>
                </div>
              );
          case 'success':
              return (
                  <div className="my-8 flex flex-col items-center gap-4 text-center h-64 justify-center">
                    <CheckCircle2 className="h-16 w-16 text-green-600" />
                    <p className="text-lg font-semibold">Betaling Vellykket!</p>
                    <p className="text-sm text-muted-foreground">Registrerer innsjekk og lukker vinduet...</p>
                </div>
              );
          case 'failed':
              return (
                 <div className="my-8 flex flex-col items-center gap-4 text-center h-64 justify-center">
                    <XCircle className="h-16 w-16 text-destructive" />
                    <p className="text-lg font-semibold">Betaling Feilet</p>
                    <p className="text-sm text-muted-foreground px-4">{paymentMessage}</p>
                     <div className="flex justify-center gap-2 pt-4">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Lukk</Button>
                        <Button onClick={() => setPaymentStatus('idle')}>Prøv igjen</Button>
                    </div>
                </div>
              );
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Zettle Betaling</DialogTitle>
          <DialogDescription>
             Følg instruksjonene på kortleseren.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
