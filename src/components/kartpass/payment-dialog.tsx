
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoaderCircle, CheckCircle2, XCircle, ChevronDown, Wifi } from "lucide-react";
import type { Driver, SiteSettings } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getLinkedReaders, type ZettleLink, startPayment } from "@/services/zettle-service";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPaymentSuccess: (amountPaid: number) => void;
  driver: Driver | null;
  settings: SiteSettings | null;
}

type PaymentStatus = "idle" | "fetchingReaders" | "selectingReader" | "connecting" | "waitingForPayment" | "success" | "error";

export function PaymentDialog({ isOpen, onOpenChange, onPaymentSuccess, driver, settings }: PaymentDialogProps) {
  const { toast } = useToast();
  const calculatedPrice = 250; 
  
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [readers, setReaders] = useState<ZettleLink[]>([]);
  const [selectedReader, setSelectedReader] = useState<ZettleLink | null>(null);
  const [isReaderPopoverOpen, setIsReaderPopoverOpen] = useState(false);
  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);

  const fetchReaders = useCallback(async () => {
    setStatus("fetchingReaders");
    try {
      const fetchedReaders = await getLinkedReaders();
      if (fetchedReaders.length === 0) {
        setErrorMessage("Ingen tilkoblede kortlesere funnet. Gå til Nettstedinnstillinger for å koble til en.");
        setStatus("error");
        return;
      }
      setReaders(fetchedReaders);
      if (fetchedReaders.length === 1) {
        setSelectedReader(fetchedReaders[0]);
      } else {
        setStatus("selectingReader");
      }
    } catch (error) {
      setErrorMessage((error as Error).message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchReaders();
    } else {
      // Cleanup on close
      webSocket?.close();
      setWebSocket(null);
      setStatus("idle");
      setSelectedReader(null);
      setErrorMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const initiatePayment = useCallback(async () => {
    if (!selectedReader) return;

    setStatus("connecting");
    setErrorMessage(null);

    try {
      const { paymentId, websocketUrl } = await startPayment(selectedReader.id, calculatedPrice);

      const ws = new WebSocket(websocketUrl);
      setWebSocket(ws);

      ws.onopen = () => {
        console.log("WebSocket connection established.");
        setStatus("waitingForPayment");
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("WebSocket message received:", message);

        if (message.event === 'PAYMENT_COMPLETED') {
          setStatus("success");
          toast({ title: "Betaling Vellykket!", description: `${driver?.name} er nå sjekket inn.`});
          onPaymentSuccess(calculatedPrice);
          ws.close();
        } else if (message.event === 'PAYMENT_FAILED' || message.event === 'PAYMENT_CANCELLED') {
          setErrorMessage(`Betaling ${message.event === 'PAYMENT_FAILED' ? 'feilet' : 'ble avbrutt'}. Grunn: ${message.payload?.message || 'Ukjent feil'}`);
          setStatus("error");
          ws.close();
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setErrorMessage("En feil oppstod med tilkoblingen til kortleseren.");
        setStatus("error");
      };

      ws.onclose = (event) => {
        console.log("WebSocket connection closed:", event.reason, event.code);
        if (status !== 'success' && status !== 'error') {
            // Only show error if it wasn't closed intentionally after success/error
            setErrorMessage("Tilkoblingen til kortleseren ble brutt.");
            setStatus("error");
        }
      };

    } catch (error) {
      setErrorMessage((error as Error).message);
      setStatus("error");
    }

  }, [selectedReader, calculatedPrice, toast, driver, onPaymentSuccess, status]);
  
  useEffect(() => {
    if (selectedReader && (status === 'selectingReader' || status === 'fetchingReaders')) {
        initiatePayment();
    }
  }, [selectedReader, status, initiatePayment]);


  const renderContent = () => {
    switch(status) {
      case "fetchingReaders":
      case "connecting":
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <LoaderCircle className="h-16 w-16 text-primary animate-spin" />
            <p className="text-lg font-semibold">{status === 'connecting' ? `Kobler til ${selectedReader?.integratorTags?.deviceName || 'leser'}...` : "Henter lesere..."}</p>
          </div>
        );
      case "selectingReader":
        return (
           <div className="flex flex-col items-center gap-4 text-center">
             <h3 className="text-lg font-semibold">Velg kortleser</h3>
            <Popover open={isReaderPopoverOpen} onOpenChange={setIsReaderPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-64 justify-between">
                        {selectedReader ? selectedReader.integratorTags.deviceName : "Velg en leser"}
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Søk etter leser..." />
                        <CommandList>
                            <CommandEmpty>Ingen lesere funnet.</CommandEmpty>
                            <CommandGroup>
                                {readers.map(reader => (
                                    <CommandItem
                                        key={reader.id}
                                        value={reader.id}
                                        onSelect={() => {
                                            setSelectedReader(reader);
                                            setIsReaderPopoverOpen(false);
                                        }}
                                    >
                                        {reader.integratorTags.deviceName}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
          </div>
        )
      case "waitingForPayment":
         return (
          <div className="flex flex-col items-center gap-4 text-center">
            <Wifi className="h-16 w-16 text-primary animate-pulse" />
            <p className="text-lg font-semibold">Venter på betaling...</p>
            <p className="text-muted-foreground">Sett inn eller hold kortet mot leseren for å betale {calculatedPrice},- kr</p>
          </div>
        );
      case "success":
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
            <p className="text-lg font-semibold">Betaling Vellykket!</p>
            <p className="text-muted-foreground">Dialogen lukkes automatisk.</p>
          </div>
        );
      case "error":
         return (
          <div className="flex flex-col items-center gap-4 text-center">
            <XCircle className="h-16 w-16 text-destructive" />
            <p className="text-lg font-semibold">Betaling Feilet</p>
            <p className="text-destructive-foreground bg-destructive/80 p-3 rounded-md max-w-sm">{errorMessage}</p>
             <Button onClick={() => onOpenChange(false)}>Lukk</Button>
          </div>
        );
      default:
        return null;
    }
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Zettle Betaling</DialogTitle>
          <DialogDescription>
             Følg instruksjonene for å fullføre betalingen.
          </DialogDescription>
        </DialogHeader>
        <div className="my-8">
            {renderContent()}
        </div>
        {status !== 'error' && (
            <div className="flex justify-center gap-2 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
