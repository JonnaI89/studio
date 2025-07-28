
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2 } from "lucide-react";
import type { Driver, SiteSettings } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPaymentSuccess: (amountPaid: number) => void;
  driver: Driver | null;
  settings: SiteSettings | null;
}

export function PaymentDialog({ isOpen, onOpenChange, onPaymentSuccess, driver, settings }: PaymentDialogProps) {
  const { toast } = useToast();
  
  // This is a placeholder for a more complex price calculation logic
  const calculatedPrice = 250; 
  
  if (!isOpen) return null;

  const handleManualConfirmation = () => {
    onPaymentSuccess(calculatedPrice);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Manuell Betalingsbekreftelse</DialogTitle>
          <DialogDescription>
             Bruk den separate kortterminalen til å ta betalt. Bekreft når betalingen er fullført.
          </DialogDescription>
        </DialogHeader>
        <div className="my-8 flex flex-col items-center gap-4 text-center">
            <CreditCard className="h-16 w-16 text-primary" />
            <p className="text-lg font-semibold">Klar for betaling</p>
        </div>
        <div className="mt-4 w-full rounded-md border p-4 text-center space-y-4">
            <p className="font-bold text-xl">Totalbeløp: {calculatedPrice},- kr</p>
            <p className="text-sm text-muted-foreground">Produkt: Dagspass Trening</p>
        </div>
        <div className="flex justify-center gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button onClick={handleManualConfirmation}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Bekreft Betaling & Sjekk inn
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

    