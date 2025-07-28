"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoaderCircle, Save, Wifi, CheckCircle2, XCircle, ServerCrash } from "lucide-react";
import { updateSiteSettings } from "@/services/settings-service";
import Image from "next/image";
import type { SiteSettings } from "@/lib/types";
import { Separator } from "../ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { initiateZettlePairing } from "@/services/payment-service";

interface SiteSettingsEditorProps {
  initialSettings: SiteSettings;
}

type PairingStatus = "idle" | "initializing" | "waiting_for_code" | "successful" | "failed";

function extractImageUrl(url: string): string {
    if (!url) return '';
    try {
        const urlObject = new URL(url);
        if (urlObject.hostname === 'www.google.com' && urlObject.pathname === '/imgres') {
            const imgUrl = urlObject.searchParams.get('imgurl');
            if (imgUrl) return imgUrl;
        }
    } catch (e) {
        // Not a valid URL, return original string
        return url;
    }
    return url;
}

export function SiteSettingsEditor({ initialSettings }: SiteSettingsEditorProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState(initialSettings.logoUrl || "");
  const [weekdayPrice, setWeekdayPrice] = useState(initialSettings.weekdayPrice || 250);
  const [weekendPrice, setWeekendPrice] = useState(initialSettings.weekendPrice || 350);
  const [zettleLinkId, setZettleLinkId] = useState(initialSettings.zettleLinkId || "");

  const [isPairing, setIsPairing] = useState(false);
  const [pairingStatus, setPairingStatus] = useState<PairingStatus>("idle");
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const socketRef = React.useRef<WebSocket | null>(null);

  const displayLogoUrl = useMemo(() => extractImageUrl(logoUrlInput), [logoUrlInput]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateSiteSettings({ 
        logoUrl: logoUrlInput,
        weekdayPrice: Number(weekdayPrice),
        weekendPrice: Number(weekendPrice),
        zettleLinkId: zettleLinkId,
       });
      toast({
        title: "Innstillinger Oppdatert",
        description: "De nye innstillingene er lagret.",
      });
    } catch (error) {
      console.error("Settings save failed:", error);
      toast({
        variant: "destructive",
        title: "Lagring Feilet",
        description: (error as Error).message || "En feil oppsto under lagring.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const cleanUpSocket = useCallback(() => {
    if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
    }
  }, []);

  const startPairing = async () => {
    setIsPairing(true);
    setPairingStatus("initializing");
    setPairingCode(null);
    setPairingError(null);
    cleanUpSocket();

    try {
        const response = await initiateZettlePairing();
        if (response.pairingCode && response.webSocketUrl) {
            setPairingCode(response.pairingCode);
            setPairingStatus("waiting_for_code");

            const socket = new WebSocket(response.webSocketUrl);
            socketRef.current = socket;

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.eventName === "LINK_COMPLETED" && data.payload.linkId) {
                    setZettleLinkId(data.payload.linkId);
                    setPairingStatus("successful");
                    toast({ title: "Paring Vellykket!", description: "Ny terminal er nå koblet til." });
                    cleanUpSocket();
                }
            };
            socket.onerror = () => {
                 setPairingError("Tilkoblingsfeil under paring.");
                 setPairingStatus("failed");
            };
            socket.onclose = () => {
                 if (pairingStatus !== 'successful') {
                    setPairingError("Tilkoblingen for paring ble brutt.");
                    setPairingStatus("failed");
                 }
            };
        } else {
            setPairingError(response.status || "Kunne ikke hente paringskode.");
            setPairingStatus("failed");
        }
    } catch (error) {
        setPairingError((error as Error).message);
        setPairingStatus("failed");
    }
  };

  const getPairingStatusContent = () => {
    switch(pairingStatus) {
        case "initializing":
            return { icon: <LoaderCircle className="h-16 w-16 text-primary animate-spin" />, title: "Starter paring...", description: "Kontakter Zettle for å generere kode." };
        case "waiting_for_code":
            return { icon: <Wifi className="h-16 w-16 text-primary animate-pulse" />, title: "Klar for paring", description: "Tast inn koden under på kortterminalen." };
        case "successful":
            return { icon: <CheckCircle2 className="h-16 w-16 text-green-600" />, title: "Paring Vellykket!", description: "Ny Terminal ID er lagret. Husk å trykke lagre." };
        case "failed":
            return { icon: <ServerCrash className="h-16 w-16 text-destructive" />, title: "Paring Feilet", description: pairingError };
        default: return null;
    }
  }
  
  const pairingStatusContent = getPairingStatusContent();


  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Nettstedinnstillinger</CardTitle>
        <CardDescription>
          Administrer generelle innstillinger for nettstedet, som priser, Zettle-terminal og klubblogo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Zettle Betalingsterminal</h3>
             <div className="space-y-2">
              <Label htmlFor="zettle-link-id">Aktiv Zettle Terminal ID</Label>
              <Input
                id="zettle-link-id"
                type="text"
                placeholder="Denne fylles ut automatisk etter vellykket paring"
                value={zettleLinkId}
                onChange={(e) => setZettleLinkId(e.target.value)}
                disabled={isLoading}
                readOnly
              />
              <p className="text-[0.8rem] text-muted-foreground">
                Denne ID-en kobler systemet til en spesifikk kortterminal (PayPal Reader).
              </p>
            </div>
            <Button variant="outline" onClick={() => { setIsPairing(true); startPairing(); }}>
                <Wifi className="mr-2 h-4 w-4" />
                Start paring med ny terminal
            </Button>
        </div>

        <Separator />

        <div className="space-y-4">
            <h3 className="text-lg font-medium">Priser for dagspass</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="weekday-price">Pris Hverdag (kr)</Label>
                    <Input
                        id="weekday-price"
                        type="number"
                        placeholder="250"
                        value={weekdayPrice}
                        onChange={(e) => setWeekdayPrice(Number(e.target.value))}
                        disabled={isLoading}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="weekend-price">Pris Helg (kr)</Label>
                    <Input
                        id="weekend-price"
                        type="number"
                        placeholder="350"
                        value={weekendPrice}
                        onChange={(e) => setWeekendPrice(Number(e.target.value))}
                        disabled={isLoading}
                    />
                </div>
            </div>
        </div>
        
        <Separator />

        <div className="space-y-4">
            <h3 className="text-lg font-medium">Klubblogo</h3>
            <div className="space-y-2">
                <Label>Nåværende Logo</Label>
                <div className="p-4 border rounded-md flex justify-center items-center bg-muted/40 min-h-[100px]">
                    {displayLogoUrl ? (
                        <Image src={displayLogoUrl} alt="Nåværende logo" width={200} height={100} className="object-contain" />
                    ) : (
                        <p className="text-sm text-muted-foreground">Ingen logo er angitt.</p>
                    )}
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo-url">Logo URL</Label>
              <Input
                id="logo-url"
                type="url"
                placeholder="https://eksempel.com/logo.png"
                value={logoUrlInput}
                onChange={(e) => setLogoUrlInput(e.target.value)}
                disabled={isLoading}
              />
            </div>
        </div>

        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Lagrer...' : 'Lagre Innstillinger'}
        </Button>
      </CardContent>
    </Card>

    <Dialog open={isPairing} onOpenChange={setIsPairing}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Par ny Zettle Terminal</DialogTitle>
                <DialogDescription>
                    Følg instruksjonene for å koble en ny kortleser til systemet.
                </DialogDescription>
            </DialogHeader>
            <div className="my-8 flex flex-col items-center gap-4 text-center">
                 {pairingStatusContent && (
                    <>
                        {pairingStatusContent.icon}
                        <p className="text-lg font-semibold">{pairingStatusContent.title}</p>
                        <p className="text-sm text-muted-foreground h-4">{pairingStatusContent.description}</p>
                    </>
                 )}
                 {pairingStatus === 'waiting_for_code' && pairingCode && (
                    <div className="mt-4 text-4xl font-mono tracking-widest bg-muted p-4 rounded-lg">
                        {pairingCode}
                    </div>
                 )}
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Lukk</Button>
                </DialogClose>
                 {(pairingStatus === 'failed') && (
                    <Button onClick={startPairing}>Prøv igjen</Button>
                 )}
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
