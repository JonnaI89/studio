
"use client";

import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoaderCircle, Save, Wifi, Link2, Trash2, XCircle } from "lucide-react";
import { updateSiteSettings } from "@/services/settings-service";
import { getLinkedReaders, claimLinkOffer, deleteLink, type ZettleLink } from "@/services/zettle-service";
import Image from "next/image";
import type { SiteSettings } from "@/lib/types";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
        return url;
    }
    return url;
}

export function SiteSettingsEditor({ initialSettings }: SiteSettingsEditorProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState(initialSettings.logoUrl || "");
  const [weekdayPrice, setWeekdayPrice] = useState(initialSettings.weekdayPrice ?? 250);
  const [weekendPrice, setWeekendPrice] = useState(initialSettings.weekendPrice ?? 350);
  const [zettleClientId, setZettleClientId] = useState(initialSettings.zettleClientId || "");
  const [zettleApiKey, setZettleApiKey] = useState(initialSettings.zettleApiKey || "");
  
  const [linkedReaders, setLinkedReaders] = useState<ZettleLink[]>([]);
  const [isFetchingReaders, setIsFetchingReaders] = useState(false);
  const [claimCode, setClaimCode] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [readerToUnlink, setReaderToUnlink] = useState<ZettleLink | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);


  const displayLogoUrl = useMemo(() => extractImageUrl(logoUrlInput), [logoUrlInput]);

  const fetchReaders = async () => {
    setIsFetchingReaders(true);
    try {
      const readers = await getLinkedReaders();
      setLinkedReaders(readers);
    } catch (error) {
       console.error("Could not fetch readers", error);
       toast({ variant: 'destructive', title: 'Kunne ikke hente lesere', description: (error as Error).message });
    } finally {
      setIsFetchingReaders(false);
    }
  };

  useEffect(() => {
    // Fetch readers only if credentials are provided
    if (initialSettings.zettleClientId && initialSettings.zettleApiKey) {
        fetchReaders();
    }
  }, [initialSettings.zettleClientId, initialSettings.zettleApiKey]);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await updateSiteSettings({ 
        logoUrl: logoUrlInput,
        weekdayPrice: Number(weekdayPrice),
        weekendPrice: Number(weekendPrice),
        zettleClientId: zettleClientId,
        zettleApiKey: zettleApiKey,
       });
      toast({
        title: "Innstillinger Oppdatert",
        description: "De nye innstillingene er lagret.",
      });
      // After saving new credentials, try fetching readers again
      await fetchReaders();
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

  const handleClaimReader = async () => {
    if (!claimCode) {
      toast({ variant: 'destructive', title: 'Kode mangler', description: 'Du må skrive inn koden fra kortleseren.' });
      return;
    }
    setIsClaiming(true);
    try {
      await claimLinkOffer(claimCode, `Forerportalen-Leser-${Math.floor(Math.random() * 1000)}`);
      toast({ title: 'Leser koblet til!', description: 'Den nye kortleseren er nå klar til bruk.' });
      setClaimCode("");
      await fetchReaders();
    } catch (error) {
       toast({ variant: 'destructive', title: 'Tilkobling feilet', description: (error as Error).message });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleUnlinkReader = async () => {
    if (!readerToUnlink) return;
    setIsUnlinking(true);
    try {
      await deleteLink(readerToUnlink.id);
      toast({ title: 'Leser koblet fra', description: 'Kortleseren er fjernet fra din konto.' });
      setReaderToUnlink(null);
      await fetchReaders();
    } catch (error) {
       toast({ variant: 'destructive', title: 'Frakobling feilet', description: (error as Error).message });
    } finally {
      setIsUnlinking(false);
    }
  };

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
            </div>
             <div className="space-y-2">
                <Label htmlFor="zettle-api-key">Zettle API Key (JWT)</Label>
                 <Textarea
                    id="zettle-api-key"
                    placeholder="Lim inn din API-nøkkel (JWT) her"
                    value={zettleApiKey}
                    onChange={(e) => setZettleApiKey(e.target.value)}
                    disabled={isLoading}
                    className="min-h-[120px] font-mono text-xs"
                />
                <p className="text-[0.8rem] text-muted-foreground">
                    Dette er en lang tekst (JSON Web Token) som du genererer i Zettle Developer Portal.
                </p>
            </div>

          <Separator />
          
           <h3 className="text-lg font-medium">Tilkoblede Kortlesere</h3>
           <Card>
              <CardContent className="pt-6">
                  {isFetchingReaders ? (
                    <div className="flex items-center justify-center h-24">
                      <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : linkedReaders.length > 0 ? (
                    <ul className="space-y-3">
                      {linkedReaders.map(reader => (
                        <li key={reader.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                          <div>
                            <p className="font-semibold">{reader.integratorTags?.deviceName || 'Ukjent Enhet'}</p>
                            <p className="text-sm text-muted-foreground">{reader.readerTags?.model} - S/N: {reader.readerTags?.serialNumber}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => setReaderToUnlink(reader)} disabled={isUnlinking}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                     <p className="text-center text-muted-foreground">Ingen kortlesere er koblet til. Fyll inn Client ID og API Key og lagre for å hente.</p>
                  )}
              </CardContent>
           </Card>

           <div className="space-y-2">
              <Label htmlFor="claim-code">Koble til ny leser</Label>
              <div className="flex items-center gap-2">
                <Input
                    id="claim-code"
                    placeholder="Kode fra leserskjerm"
                    value={claimCode}
                    onChange={e => setClaimCode(e.target.value)}
                    disabled={isClaiming}
                />
                <Button onClick={handleClaimReader} disabled={isClaiming || !claimCode}>
                    {isClaiming ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    Koble til
                </Button>
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

          <Button onClick={handleSaveSettings} disabled={isLoading}>
            {isLoading ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Lagrer...' : 'Lagre Innstillinger'}
          </Button>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!readerToUnlink} onOpenChange={(isOpen) => !isOpen && setReaderToUnlink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil koble fra leseren <span className="font-bold">{readerToUnlink?.integratorTags?.deviceName}</span>. Du må pare den på nytt for å bruke den igjen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnlinking}>Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUnlinkReader} 
              disabled={isUnlinking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUnlinking ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Ja, koble fra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
