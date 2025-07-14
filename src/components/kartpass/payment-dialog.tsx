
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
import { CreditCard, LoaderCircle, CheckCircle2, XCircle, QrCode } from "lucide-react";
import type { Driver, SiteSettings } from "@/lib/types";
import { createZettlePaymentLink } from "@/services/zettle-service";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPaymentSuccess: () => void;
  driver: Driver | null;
  settings: SiteSettings | null;
}

type PaymentStatus = "idle" | "initializing" | "waiting_for_payment" | "successful" | "failed";

export function PaymentDialog({ isOpen, onOpenChange, onPaymentSuccess, driver, settings }: PaymentDialogProps) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const price = (() => {
    if (!settings) return 250;
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 for Sunday, 6 for Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return isWeekend ? settings.weekendPrice ?? 350 : settings.weekdayPrice ?? 250;
  })();

  const startPaymentProcess = async () => {
    if (!driver) return;
    setStatus("initializing");
    setError(null);
    setPaymentLink(null);
    setQrCodeUrl(null);

    try {
      const paymentData = await createZettlePaymentLink({
        amount: price * 100, // Zettle expects amount in øre/cents
        reference: `KARTPASS-${driver.id.slice(0, 8)}-${Date.now()}`
      });

      if (!paymentData.url || !paymentData.qrCode) {
        throw new Error("Mottok ikke gyldig data fra Zettle API.");
      }
      
      setPaymentLink(paymentData.url);
      setQrCodeUrl(paymentData.qrCode);
      setStatus("waiting_for_payment");

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
      setStatus("idle");
      setError(null);
      setPaymentLink(null);
      setQrCodeUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, driver]);

  const handleManualConfirmation = () => {
      setStatus("successful");
      setTimeout(() => {
        onPaymentSuccess();
      }, 1500);
  }

  const getStatusContent = () => {
    switch (status) {
      case "initializing":
        return {
          icon: <LoaderCircle className="h-16 w-16 text-primary animate-spin" />,
          title: "Initialiserer betaling...",
          description: "Oppretter en sikker betalingslenke.",
        };
      case "waiting_for_payment":
        return {
          icon: <QrCode className="h-16 w-16 text-primary" />,
          title: "Klar for betaling",
          description: "Skann QR-koden eller bruk lenken under.",
        };
      case "successful":
        return {
            icon: <CheckCircle2 className="h-16 w-16 text-green-600" />,
            title: "Betaling Bekreftet!",
            description: "Innsjekking fullført. Lukker vindu...",
        };
      case "failed":
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zettle Betaling</DialogTitle>
          <DialogDescription>
            Betaling for {driver?.name}.
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

        {status === 'waiting_for_payment' && qrCodeUrl && (
            <div className="flex flex-col items-center gap-4">
                <div className="p-2 border bg-white rounded-lg">
                    <Image src={qrCodeUrl} alt="QR-kode for betaling" width={256} height={256} />
                </div>
                 <Link href={paymentLink || '#'} target="_blank" className="text-sm text-primary hover:underline">
                    Åpne betalingslenke i ny fane
                </Link>
                <p className="text-xs text-muted-foreground max-w-sm">
                    Når betalingen er fullført i Zettle-appen eller via kundens enhet, bekreft manuelt under.
                </p>
                <Button onClick={handleManualConfirmation} className="w-full bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="mr-2 h-4 w-4"/>
                    Bekreft Betaling & Sjekk Inn
                </Button>
            </div>
        )}
        
        {(status === "failed") && (
            <div className="flex justify-center gap-2">
                 <Button variant="outline" onClick={() => onOpenChange(false)}>Lukk</Button>
                 <Button onClick={startPaymentProcess}>Prøv igjen</Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
