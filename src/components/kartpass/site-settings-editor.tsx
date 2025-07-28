
"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoaderCircle, Save, Trash2, PlusCircle, Link2Off } from "lucide-react";
import { updateSiteSettings } from "@/services/settings-service";
import { getLinkedReaders, deleteLink, getZettleSecrets, clearZettleSecrets, saveZettleSecrets, claimLinkOffer } from "@/services/zettle-service";
import type { SiteSettings } from "@/lib/types";
import { Separator } from "../ui/separator";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "../ui/dialog";
import type { ZettleLink, ZettleSecrets } from "@/services/zettle-service";


interface SiteSettingsEditorProps {
  initialSettings: SiteSettings;
}

export function SiteSettingsEditor({ initialSettings }: SiteSettingsEditorProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  
  const [linkedReaders, setLinkedReaders] = useState<ZettleLink[]>([]);
  const [zettleSecrets, setZettleSecrets] = useState<ZettleSecrets | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [readerToUnlink, setReaderToUnlink] = useState<ZettleLink | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const [isClaimLinkOpen, setIsClaimLinkOpen] = useState(false);
  const [claimCode, setClaimCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);

  const fetchData = useCallback(async () => {
    setIsFetchingData(true);
    try {
      const secrets = await getZettleSecrets();
      setZettleSecrets(secrets);
      if (secrets?.accessToken) {
        const readers = await getLinkedReaders();
        setLinkedReaders(readers);
      } else {
        setLinkedReaders([]);
      }
    } catch (error) {
       toast({ variant: 'destructive', title: 'Kunne ikke hente Zettle-data', description: (error as Error).message });
       setLinkedReaders([]);
    } finally {
      setIsFetchingData(false);
    }
  }, [toast]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveCredentials = async () => {
    setIsLoading(true);
    try {
      if (!settings.zettleClientId || !settings.zettleClientSecret) {
        toast({ variant: 'destructive', title: 'Mangler info', description: 'Både Client ID og Client Secret må fylles ut.'});
        setIsLoading(false);
        return;
      }
      await saveZettleSecrets(settings.zettleClientId, settings.zettleClientSecret);
      await updateSiteSettings({logoUrl: settings.logoUrl}); // Save other settings
      toast({ title: "Innstillinger Lagret", description: "Dine Zettle-innstillinger er lagret." });
      await fetchData();
    } catch (error) {
      console.error("Credentials save failed:", error);
      toast({ variant: "destructive", title: "Lagring Feilet", description: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimLink = async () => {
    if (!claimCode || !deviceName) {
      toast({ variant: 'destructive', title: 'Mangler info', description: 'Både kode og navn må fylles ut.' });
      return;
    }
    setIsClaiming(true);
    try {
      await claimLinkOffer(claimCode, deviceName);
      toast({ title: 'Leser tilkoblet!', description: `Leseren '${deviceName}' er nå koblet til.`});
      await fetchData();
      setIsClaimLinkOpen(false);
      setClaimCode("");
      setDeviceName("");
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
      await fetchData();
    } catch (error) {
       toast({ variant: 'destructive', title: 'Frakobling feilet', description: (error as Error).message });
    } finally {
      setIsUnlinking(false);
      setReaderToUnlink(null);
    }
  };

  const handleDisconnectZettle = async () => {
    setIsLoading(true);
    try {
        await clearZettleSecrets();
        setZettleSecrets(null);
        setLinkedReaders([]);
        toast({ title: "Zettle frakoblet", description: "Tilkoblingen til Zettle er fjernet." });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Frakobling feilet', description: (error as Error).message });
    } finally {
        setIsLoading(false);
    }
  }
  
  const isZettleConnected = !!zettleSecrets?.accessToken;

  return (
    <>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Nettstedinnstillinger</CardTitle>
            <CardDescription>
              Endre generelle innstillinger for nettstedet, som logo og Zettle-integrasjon.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="space-y-2">
                  <Label htmlFor="logo-url">URL til Klubblogo</Label>
                  <Input
                    id="logo-url"
                    type="text"
                    placeholder="https://.../logo.png"
                    value={settings.logoUrl || ""}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                    disabled={isLoading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Lim inn en direkte URL til et bilde av logoen. Denne vises i bunnteksten på forsiden.
                  </p>
              </div>
            <Separator />
            <div>
              <h3 className="text-lg font-medium">Zettle-integrasjon</h3>
               <p className="text-sm text-muted-foreground">
                For å ta betalt via Zettle, må du koble til din Zettle-konto med en Client ID og Client Secret fra Zettle Developer Portal.
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="zettle-client-id">Zettle Client ID</Label>
                  <Input
                    id="zettle-client-id"
                    type="password"
                    placeholder="Lim inn din Zettle Client ID her"
                    value={settings.zettleClientId || ""}
                    onChange={(e) => setSettings({ ...settings, zettleClientId: e.target.value })}
                    disabled={isLoading || isZettleConnected}
                  />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="zettle-client-secret">Zettle Client Secret</Label>
                  <Input
                    id="zettle-client-secret"
                    type="password"
                    placeholder="Lim inn din Zettle Client Secret her"
                    value={settings.zettleClientSecret || ""}
                    onChange={(e) => setSettings({ ...settings, zettleClientSecret: e.target.value })}
                    disabled={isLoading || isZettleConnected}
                  />
              </div>
            </div>
             <div className="flex gap-2">
                <Button onClick={handleSaveCredentials} disabled={isLoading}>
                    {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isLoading ? 'Lagrer...' : 'Lagre Zettle-info & Innstillinger'}
                </Button>
                {isZettleConnected && (
                    <Button variant="destructive" onClick={handleDisconnectZettle} disabled={isLoading}>
                         {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Link2Off className="mr-2 h-4 w-4" />}
                        Koble fra Zettle
                    </Button>
                )}
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Tilkoblede Kortlesere</CardTitle>
                    <CardDescription>Administrer kortlesere som er koblet til systemet.</CardDescription>
                </div>
                {isZettleConnected && (
                    <Button variant="outline" onClick={() => setIsClaimLinkOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Koble til ny leser
                    </Button>
                )}
            </div>
          </CardHeader>
          <CardContent>
              {isFetchingData ? (
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
              ) : isZettleConnected ? (
                 <p className="text-center text-muted-foreground py-4">Ingen kortlesere er koblet til. Trykk på knappen for å koble til en.</p>
              ) : (
                <p className="text-center text-muted-foreground py-4">Lagre din Zettle Client ID og Secret over for å se og administrere lesere.</p>
              )}
          </CardContent>
        </Card>
      </div>
      
       <Dialog open={isClaimLinkOpen} onOpenChange={setIsClaimLinkOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Koble til ny kortleser</DialogTitle>
                    <DialogDescription>
                        Skriv inn koden som vises på kortleserens skjerm for å koble den til.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="claim-code">Kode fra leser</Label>
                        <Input
                            id="claim-code"
                            value={claimCode}
                            onChange={(e) => setClaimCode(e.target.value)}
                            placeholder="f.eks. ABC-123"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="device-name">Navn på leser</Label>
                        <Input
                            id="device-name"
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            placeholder="f.eks. Kiosk 1"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="ghost">Avbryt</Button>
                    </DialogClose>
                    <Button onClick={handleClaimLink} disabled={isClaiming}>
                        {isClaiming && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Koble til
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


      <AlertDialog open={!!readerToUnlink} onOpenChange={(isOpen) => !isOpen && setReaderToUnlink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil koble fra leseren <span className="font-bold">{readerToUnlink?.integratorTags?.deviceName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnlinking}>Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUnlinkReader} 
              disabled={isUnlinking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUnlinking ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Ja, koble fra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
