
"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, LoaderCircle, Wifi, CheckCircle2, XCircle } from "lucide-react";
import type { Driver, SiteSettings } from "@/lib/types";
import { createZettlePayment } from "@/services/zettle-service";
import { useToast } from "@/hooks/use-toast";

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPaymentSuccess: () => void;
  driver: Driver | null;
  settings: SiteSettings | null;
}

type PaymentStatus = "idle" | "initializing" | "waiting_for_terminal" | "in_progress" | "successful" | "failed" | "cancelled";

export function PaymentDialog({ isOpen, onOpenChange, onPaymentSuccess, driver, settings }: PaymentDialogProps) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const socketRef = useRef<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const price = (() => {
    if (!settings) return 250;
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 for Sunday, 6 for Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return isWeekend ? settings.weekendPrice ?? 350 : settings.weekdayPrice ?? 250;
  })();

  const cleanupSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const startPaymentProcess = async () => {
    if (!driver) return;
    setStatus("initializing");
    setError(null);
    cleanupSocket(); // Ensure no old sockets are lingering

    try {
      const paymentData = await createZettlePayment({
        amount: price * 100, // Zettle expects amount in øre/cents
        reference: `KARTPASS-${driver.id.slice(0, 8)}-${Date.now()}`
      });

      if (!paymentData.websocketUrl || !paymentData.paymentId) {
        throw new Error("Mottok ikke gyldig data fra Zettle API.");
      }

      const newSocket = io(paymentData.websocketUrl, {
        transports: ["websocket"],
        reconnection: false, // Handle reconnection manually if needed
        autoConnect: true,
      });

      socketRef.current = newSocket;

      newSocket.on("connect", () => {
        setStatus("waiting_for_terminal");
      });

      newSocket.on("message", (message: string) => {
        try {
          const parsedMessage = JSON.parse(message);
          console.log("Zettle Message:", parsedMessage);

          if (parsedMessage.event === 'payment-update' || parsedMessage.payload?.type === 'PAYMENT_RESPONSE') {
              const paymentStatus = parsedMessage.payload?.status;
              if (paymentStatus === 'in-progress') {
                  setStatus("in_progress");
              } else if (paymentStatus === 'successful') {
                  setStatus("successful");
                  cleanupSocket();
                  setTimeout(() => {
                    onPaymentSuccess();
                  }, 1500); 
              } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
                  setStatus(paymentStatus);
                  setError(parsedMessage.payload?.message || "Betalingen ble avbrutt eller feilet.");
                  cleanupSocket();
              }
          }
        } catch (e) {
            console.error("Failed to parse WebSocket message:", e);
        }
      });
      
      newSocket.on('disconnect', () => {
          if (status !== 'successful' && status !== 'failed' && status !== 'cancelled') {
             setError("Koblingen til betalingsterminalen ble brutt.");
             setStatus("failed");
          }
          cleanupSocket();
      });
      
      newSocket.on('connect_error', (err) => {
          setError(`WebSocket-tilkobling feilet: ${err.message}`);
          setStatus('failed');
          cleanupSocket();
      });

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
  };

  useEffect(() => {
    if (isOpen && driver) {
      startPaymentProcess();
    } else {
      cleanupSocket();
      setStatus("idle");
      setError(null);
    }

    return () => {
      cleanupSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, driver]);


  const getStatusContent = () => {
    switch (status) {
      case "initializing":
        return {
          icon: <LoaderCircle className="h-16 w-16 text-primary animate-spin" />,
          title: "Initialiserer betaling...",
          description: "Kobler til Zettle-systemet.",
        };
      case "waiting_for_terminal":
        return {
          icon: <Wifi className="h-16 w-16 text-primary animate-pulse" />,
          title: "Venter på terminal...",
          description: "Sendt til terminal. Fullfør betalingen der.",
        };
      case "in_progress":
        return {
          icon: <CreditCard className="h-16 w-16 text-primary" />,
          title: "Betaling pågår...",
          description: "Følg instruksjonene på kortterminalen.",
        };
      case "successful":
        return {
            icon: <CheckCircle2 className="h-16 w-16 text-green-600" />,
            title: "Betaling Vellykket!",
            description: "Innsjekking fullført. Lukker vindu...",
        };
      case "failed":
      case "cancelled":
        return {
            icon: <XCircle className="h-16 w-16 text-destructive" />,
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
  
  const { icon, title, description } = getStatusContent();

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(e) => {
          if (status === 'in_progress' || status === 'waiting_for_terminal') {
              e.preventDefault()
          }
      }}>
        <DialogHeader>
          <DialogTitle>Zettle Betaling</DialogTitle>
          <DialogDescription>
            Automatisk betaling for {driver?.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="my-8 flex flex-col items-center gap-4 text-center">
          {icon}
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground h-4">{description}</p>
          
          <div className="mt-4 w-full rounded-md border p-4">
            <p className="font-bold text-xl">Total: {price},- kr</p>
            <p className="text-sm text-muted-foreground">Produkt: Dagspass</p>
          </div>
        </div>
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
