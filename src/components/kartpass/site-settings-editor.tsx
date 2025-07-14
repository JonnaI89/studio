
"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoaderCircle, Save } from "lucide-react";
import { updateSiteSettings } from "@/services/settings-service";
import Image from "next/image";
import type { SiteSettings } from "@/lib/types";
import { Separator } from "../ui/separator";

interface SiteSettingsEditorProps {
  initialSettings: SiteSettings;
}

export function SiteSettingsEditor({ initialSettings }: SiteSettingsEditorProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initialSettings.logoUrl || "");
  const [weekdayPrice, setWeekdayPrice] = useState(initialSettings.weekdayPrice || 250);
  const [weekendPrice, setWeekendPrice] = useState(initialSettings.weekendPrice || 350);
  const [zettleLinkId, setZettleLinkId] = useState(initialSettings.zettleLinkId || "");
  const [currentDisplayLogo, setCurrentDisplayLogo] = useState(initialSettings.logoUrl);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateSiteSettings({ 
        logoUrl: logoUrl,
        weekdayPrice: Number(weekdayPrice),
        weekendPrice: Number(weekendPrice),
        zettleLinkId: zettleLinkId,
       });
      setCurrentDisplayLogo(logoUrl);
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
            <h3 className="text-lg font-medium">Zettle Betalingsterminal</h3>
             <div className="space-y-2">
              <Label htmlFor="zettle-link-id">Aktiv Zettle Terminal ID</Label>
              <Input
                id="zettle-link-id"
                type="text"
                placeholder="Lim inn 'linkId' fra Postman her"
                value={zettleLinkId}
                onChange={(e) => setZettleLinkId(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-[0.8rem] text-muted-foreground">
                Dette er ID-en som kobler systemet til en spesifikk kortterminal (PayPal Reader).
              </p>
            </div>
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
                    {currentDisplayLogo ? (
                        <Image src={currentDisplayLogo} alt="Nåværende logo" width={200} height={100} className="object-contain" />
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
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
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
