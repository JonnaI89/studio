"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoaderCircle, Save, Wifi, Trash2, XCircle, Link as LinkIcon } from "lucide-react";
import { updateSiteSettings } from "@/services/settings-service";
import { getLinkedReaders, deleteLink, claimLinkOffer, type ZettleLink } from "@/services/zettle-service";
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
import { Dialog, DialogClose, DialogTrigger } from "../ui/dialog";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";

interface SiteSettingsEditorProps {
  initialSettings: SiteSettings;
}

export function SiteSettingsEditor({ initialSettings }: SiteSettingsEditorProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  
  const [linkedReaders, setLinkedReaders] = useState<ZettleLink[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [readerToUnlink, setReaderToUnlink] = useState<ZettleLink | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  const fetchReaders = useCallback(async () => {
    // Only fetch if keys are present
    if (!settings.zettleClientId) {
      setIsFetchingData(false);
      setLinkedReaders([]);
      return;
    };
    setIsFetchingData(true);
    try {
      const readers = await getLinkedReaders();
      setLinkedReaders(readers);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Kunne ikke hente lesere', description: (error as Error).message });
    } finally {
      setIsFetchingData(false);
    }
  }, [settings.zettleClientId, toast]);


  useEffect(() => {
    fetchReaders();
  }, [fetchReaders]);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await updateSiteSettings(settings);
      toast({
        title: "Innstillinger Lagret",
        description: "Dine innstillinger er lagret.",
      });
      // After saving new settings, we might need to re-fetch readers
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

  const handleUnlinkReader = async () => {
    if (!readerToUnlink) return;
    setIsUnlinking(true);
    try {
      await deleteLink(readerToUnlink.id);
      toast({ title: 'Leser koblet fra', description: 'Kortleseren er fjernet fra din konto.' });
      await fetchReaders();
    } catch (error) {
       toast({ variant: 'destructive', title: 'Frakobling feilet', description: (error as Error).message });
    } finally {
      setIsUnlinking(false);
      setReaderToUnlink(null);
    }
  };

  const handleClaimLink = async () => {
    if (!claimCode || !deviceName) {
      toast({ variant: 'destructive', title: 'Mangler informasjon', description: "Både kode og navn må fylles ut." });
      return;
    }
    setIsClaiming(true);
    try {
      await claimLinkOffer(claimCode, deviceName);
      toast({ title: 'Leser tilkoblet!', description: `Leseren "${deviceName}" er nå koblet til.`});
      setClaimCode('');
      setDeviceName('');
      await fetchReaders();
      setIsLinkDialogOpen(false);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Tilkobling feilet', description: (error as Error).message });
    } finally {
      setIsClaiming(false);
    }
  }

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
                For å ta betalt via Zettle, må du oppgi din Client ID.
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="zettle-client-id">Zettle Client ID</Label>
                  <Input
                    id="zettle-client-id"
                    type="text"
                    placeholder="Lim inn din Zettle Client ID her"
                    value={settings.zettleClientId || ""}
                    onChange={(e) => setSettings({ ...settings, zettleClientId: e.target.value })}
                    disabled={isLoading}
                  />
              </div>
            </div>
             <div className="flex gap-2">
                <Button onClick={handleSaveSettings} disabled={isLoading}>
                    {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isLoading ? 'Lagrer...' : 'Lagre Innstillinger'}
                </Button>
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
                <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" disabled={!settings.zettleClientId}>
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Koble til ny leser via kode
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Koble til ny leser</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="claim-code">Kode fra leserskjerm</Label>
                                <Input id="claim-code" value={claimCode} onChange={(e) => setClaimCode(e.target.value)} placeholder="ABC123DE" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="device-name">Navn på leser</Label>
                                <Input id="device-name" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="F.eks. Kiosk 1" />
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
              ) : (
                 <p className="text-center text-muted-foreground py-4">Ingen kortlesere er koblet til. Fyll inn Client ID og lagre for å aktivere.</p>
              )}
          </CardContent>
        </Card>
      </div>
      
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
              {isUnlinking ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Ja, koble fra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
