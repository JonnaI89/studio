
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

interface SiteSettingsEditorProps {
  initialSettings: SiteSettings;
}

export function SiteSettingsEditor({ initialSettings }: SiteSettingsEditorProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initialSettings.logoUrl || "");
  const [currentDisplayLogo, setCurrentDisplayLogo] = useState(initialSettings.logoUrl);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateSiteSettings({ logoUrl: logoUrl });
      setCurrentDisplayLogo(logoUrl);
      toast({
        title: "Logo Oppdatert",
        description: "Den nye logo-URLen er lagret.",
      });
    } catch (error) {
      console.error("Logo URL save failed:", error);
      toast({
        variant: "destructive",
        title: "Lagring Feilet",
        description: (error as Error).message || "En feil oppsto under lagring av URL.",
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
          Administrer generelle innstillinger for nettstedet, som f.eks. logoen som vises på forsiden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Lagrer...' : 'Lagre Logo URL'}
        </Button>
      </CardContent>
    </Card>
  );
}
