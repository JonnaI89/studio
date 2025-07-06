"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, LoaderCircle } from "lucide-react";
import type { Driver } from "@/lib/types";

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  driver: Driver | null;
}

export function PaymentDialog({ isOpen, onOpenChange, onConfirm, driver }: PaymentDialogProps) {
  if (!driver) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zettle Betaling</DialogTitle>
          <DialogDescription>
            Fullfør betalingen for {driver.name} på Zettle-terminalen.
          </DialogDescription>
        </DialogHeader>
        <div className="my-8 flex flex-col items-center gap-4 text-center">
            <CreditCard className="h-16 w-16 text-primary" />
            <p className="text-lg font-semibold">Venter på betaling...</p>
            <div className="flex items-center gap-2 text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>Ikke lukk dette vinduet.</span>
            </div>
            <div className="mt-4 w-full rounded-md border p-4">
                <p className="font-bold text-xl">Total: 100,- kr</p>
                <p className="text-sm text-muted-foreground">Produkt: Dagspass</p>
            </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button onClick={onConfirm}>Bekreft Betaling</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
