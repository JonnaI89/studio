
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, LoaderCircle, CheckCircle2, XCircle, Wifi, ServerCrash, Pencil } from "lucide-react";
import type { Driver, SiteSettings } from "@/lib/types";
import { initiateZettlePushPayment } from "@/services/zettle-service";
import { useToast } from "@/hooks/use-toast";
import { Input } from "../ui/input";

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPaymentSuccess: (amountPaid: number) => void;
  driver: Driver | null;
  settings: SiteSettings | null;
}

type PaymentStatus = "idle" | "initializing" | "connecting_ws" | "waiting_for_reader" | "waiting_for_payment" | "successful" | "failed" | "cancelled";

export function PaymentDialog({ isOpen, onOpenChange, onPaymentSuccess, driver, settings }: PaymentDialogProps) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const [isEditingAmount, setIsEditingAmount] = useState(false);

  const calculatedPrice = (() => {
    if (!settings) return 250;
    const today = new Date();
    const dayOfWeek = today.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return isWeekend ? settings.weekendPrice ?? 350 : settings.weekdayPrice ?? 250;
  })();
  
  const [currentAmount, setCurrentAmount] = useState(calculatedPrice);

  useEffect(() => {
    setCurrentAmount(calculatedPrice);
    setStatus("idle");
    setError(null);
  }, [calculatedPrice, isOpen]);

  const cleanUpSocket = useCallback(() => {
    if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
    }
  }, []);
  
  const handlePaymentCompleted = useCallback(() => {
    setStatus("successful");
    toast({ title: "Betaling Vellykket!", description: `Betaling for ${driver?.name} er fullført.` });
    setTimeout(() => {
      onPaymentSuccess(currentAmount);
    }, 1500);
  }, [onPaymentSuccess, currentAmount, driver?.name, toast]);

  const startPaymentProcess = useCallback(async () => {
    if (!driver) return;
    
    if (currentAmount === 0) {
        handlePaymentCompleted();
        return;
    }

    if (!settings?.zettleLinkId) {
        setError("Zettle Terminal ID er ikke konfigurert i nettstedinnstillingene.");
        setStatus("failed");
        return;
    }
    
    setStatus("initializing");
    setError(null);
    cleanUpSocket();

    try {
      const { webSocketUrl } = await initiateZettlePushPayment({
        linkId: settings.zettleLinkId,
        amount: currentAmount * 100,
        reference: `KARTPASS-${driver.id.slice(0, 8)}-${Date.now()}`
      });
      
      setStatus("connecting_ws");

      const socket = new WebSocket(webSocketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
          setStatus("waiting_for_reader");
      };

      socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          switch(data.eventName) {
              case "PAYMENT_IN_PROGRESS":
                  setStatus("waiting_for_payment");
                  break;
              case "PAYMENT_COMPLETED":
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
          // If the socket closes unexpectedly
           setError("Tilkoblingen til terminalen ble brutt.");
           setStatus("failed");
        }
      };

    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error("Error starting payment process:", errorMessage);
      toast({
        variant: "destructive",
        title: "Betalingsfeil",
        description: errorMessage,
      });
      setStatus("failed");
      setError(errorMessage);
    }
  }, [driver, settings, currentAmount, cleanUpSocket, status, toast, handlePaymentCompleted]);

  useEffect(() => {
    if (!isOpen) {
      cleanUpSocket();
    }
  }, [isOpen, cleanUpSocket]);

  const getStatusContent = () => {
    switch (status) {
      case "idle": return null;
      case "initializing":
        return {
          icon: <LoaderCircle className="h-16 w-16 text-primary animate-spin" />,
          title: "Initialiserer betaling...",
          description: "Klargjør sikker forespørsel.",
        };
      case "connecting_ws":
        return {
          icon: <Wifi className="h-16 w-16 text-primary animate-pulse" />,
          title: "Kobler til terminal...",
          description: "Etablerer sanntids-kobling.",
        };
      case "waiting_for_reader":
         return {
          icon: <CreditCard className="h-16 w-16 text-primary" />,
          title: "Venter på terminal",
          description: "Sendt forespørsel. Sjekk terminal-skjermen.",
        };
      case "waiting_for_payment":
        return {
          icon: <CreditCard className="h-16 w-16 text-accent animate-pulse" />,
          title: "Klar for betaling",
          description: "Fullfør betalingen på kortterminalen.",
        };
      case "successful":
        return {
            icon: <CheckCircle2 className="h-16 w-16 text-green-600" />,
            title: "Betaling Bekreftet!",
            description: "Innsjekking fullført. Lukker vindu...",
        };
      case "cancelled":
        return {
            icon: <XCircle className="h-16 w-16 text-amber-600" />,
            title: "Betaling Avbrutt",
            description: error || "Handlingen ble avbrutt på terminalen.",
        };
      case "failed":
        return {
            icon: <ServerCrash className="h-16 w-16 text-destructive" />,
            title: "Betaling Mislyktes",
            description: error || "En ukjent feil oppstod.",
        };
      default:
        return {
          icon: <LoaderCircle className="h-16 w-16 text-muted-foreground" />,
          title: "Laster...",
          description: "Vennligst vent.",
        };
    }
  };
  
  const statusContent = getStatusContent();

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => {
        // Prevent autofocus on the dialog content if we are not editing
        if (status === 'idle') e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle>Zettle Betaling</DialogTitle>
          <DialogDescription>
            Betaling for {driver?.name}.
          </DialogDescription>
        </DialogHeader>

        {statusContent ? (
            <div className="my-8 flex flex-col items-center gap-4 text-center">
                {statusContent.icon}
                <p className="text-lg font-semibold">{statusContent.title}</p>
                <p className="text-sm text-muted-foreground h-4">{statusContent.description}</p>
            </div>
        ) : (
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
                        <span>Total: {currentAmount},- kr</span>
                        <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}
                <p className="text-sm text-muted-foreground">Produkt: Dagspass</p>
            </div>
        )}
        
        {status === 'idle' && (
             <div className="flex justify-center gap-2 pt-4">
                 <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
                 <Button onClick={startPaymentProcess} disabled={isEditingAmount}>Start Betaling</Button>
            </div>
        )}

        {(status === "failed" || status === "cancelled") && (
            <div className="flex justify-center gap-2">
                 <Button variant="outline" onClick={() => onOpenChange(false)}>Lukk</Button>
                 <Button onClick={startPaymentProcess}>Prøv igjen</Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
