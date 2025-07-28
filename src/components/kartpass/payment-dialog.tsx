
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
import { CreditCard, CheckCircle2, Pencil } from "lucide-react";
import type { Driver, SiteSettings } from "@/lib/types";
import { Input } from "../ui/input";

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPaymentSuccess: (amountPaid: number) => void;
  driver: Driver | null;
  settings: SiteSettings | null;
}

export function PaymentDialog({ isOpen, onOpenChange, onPaymentSuccess, driver, settings }: PaymentDialogProps) {
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
  }, [calculatedPrice, isOpen]);


  const handleConfirmPayment = () => {
    onPaymentSuccess(currentAmount);
  };
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Manuell Betaling</DialogTitle>
          <DialogDescription>
            Betaling for {driver?.name}.
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
                    <span>Total: {currentAmount},- kr</span>
                    <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            )}
            <p className="text-sm text-muted-foreground">Produkt: Dagspass</p>
        </div>
        
        <div className="flex justify-center gap-2 pt-4">
             <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
             <Button onClick={handleConfirmPayment}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Bekreft Betaling
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
