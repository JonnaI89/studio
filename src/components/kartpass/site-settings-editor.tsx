"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoaderCircle, Upload } from "lucide-react";
import { storage } from "@/lib/firebase-config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateSiteSettings } from "@/services/settings-service";
import Image from "next/image";
import type { SiteSettings } from "@/lib/types";

interface SiteSettingsEditorProps {
  initialSettings: SiteSettings;
}

export function SiteSettingsEditor({ initialSettings }: SiteSettingsEditorProps) {
  const { toast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentLogoUrl, setCurrentLogoUrl] = useState(initialSettings.logoUrl);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!logoFile) {
      toast({
        variant: "destructive",
        title: "Ingen fil valgt",
        description: "Vennligst velg en bildefil for å laste opp.",
      });
      return;
    }

    setIsUploading(true);
    try {
      const logoRef = ref(storage, `site_assets/logo.${logoFile.name.split('.').pop()}`);
      await uploadBytes(logoRef, logoFile);
      const downloadUrl = await getDownloadURL(logoRef);
      
      await updateSiteSettings({ logoUrl: downloadUrl });
      setCurrentLogoUrl(downloadUrl);

      toast({
        title: "Logo Oppdatert",
        description: "Den nye logoen er lastet opp og lagret.",
      });
    } catch (error) {
      console.error("Logo upload failed:", error);
      toast({
        variant: "destructive",
        title: "Opplasting Feilet",
        description: (error as Error).message || "En feil oppsto under opplasting av logoen.",
      });
    } finally {
      setIsUploading(false);
      setLogoFile(null);
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
                {currentLogoUrl ? (
                    <Image src={currentLogoUrl} alt="Nåværende logo" width={200} height={100} className="object-contain" />
                ) : (
                    <p className="text-sm text-muted-foreground">Ingen logo er lastet opp.</p>
                )}
            </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="logo-upload">Last Opp Ny Logo</Label>
          <Input id="logo-upload" type="file" accept="image/*" onChange={handleFileChange} />
        </div>
        <Button onClick={handleUpload} disabled={isUploading || !logoFile}>
          {isUploading ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {isUploading ? 'Laster opp...' : 'Lagre ny logo'}
        </Button>
      </CardContent>
    </Card>
  );
}
