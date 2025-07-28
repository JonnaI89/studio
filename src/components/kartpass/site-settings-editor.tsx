
"use client";

import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoaderCircle, Save, Wifi } from "lucide-react";
import { updateSiteSettings } from "@/services/settings-service";
import Image from "next/image";
import type { SiteSettings } from "@/lib/types";
import { Separator } from "../ui/separator";
import React from "react";

interface SiteSettingsEditorProps {
  initialSettings: SiteSettings;
}

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
  const [zettleClientId, setZettleClientId] = useState(initialSettings.zettleClientId || "");


  const displayLogoUrl = useMemo(() => extractImageUrl(logoUrlInput), [logoUrlInput]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateSiteSettings({ 
        logoUrl: logoUrlInput,
        weekdayPrice: Number(weekdayPrice),
        weekendPrice: Number(weekendPrice),
        zettleClientId: zettleClientId,
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

  const handleConnectZettle = () => {
      // Use the actual origin of the window, which will match what Zettle expects.
      const redirectUri = `${window.location.origin}/admin/zettle/callback`;
      const state = crypto.randomUUID();
      // Lagre state i localStorage for å verifisere den senere
      localStorage.setItem('zettle_oauth_state', state);

      const params = new URLSearchParams({
          response_type: 'code',
          client_id: zettleClientId,
          redirect_uri: redirectUri,
          scope: 'READ:USERINFO WRITE:USERINFO READ:PAYMENT WRITE:PAYMENT',
          state: state,
      });

      window.location.href = `https://oauth.zettle.com/authorize?${params.toString()}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nettstedinnstillinger</CardTitle>
        <CardDescription>
          Administrer generelle innstillinger for nettstedet, som priser, Zettle-terminal og klubblogo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Zettle Betalingsintegrasjon</h3>
             <div className="space-y-2">
              <Label htmlFor="zettle-client-id">Zettle Client ID</Label>
              <Input
                id="zettle-client-id"
                type="text"
                placeholder="Lim inn Client ID her"
                value={zettleClientId}
                onChange={(e) => setZettleClientId(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-[0.8rem] text-muted-foreground">
                Denne ID-en henter du fra Zettle Developer Portal.
              </p>
            </div>
            <Button onClick={handleConnectZettle} disabled={!zettleClientId}>
                <Wifi className="mr-2 h-4 w-4" />
                Koble til Zettle
            </Button>
             <p className="text-[0.8rem] text-muted-foreground">
                Trykk her for å (re)autentisere applikasjonen mot Zettle. Du vil bli sendt til Zettle for innlogging.
              </p>
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
  );
}
