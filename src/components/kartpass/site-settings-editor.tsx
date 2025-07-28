
"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoaderCircle, Save, Wifi, Trash2, XCircle, Link as LinkIcon } from "lucide-react";
import { updateSiteSettings } from "@/services/settings-service";
import { getLinkedReaders, deleteLink, type ZettleLink, claimLinkOffer } from "@/services/zettle-service";
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
import { Dialog, DialogClose, DialogFooter, DialogTrigger } from "../ui/dialog";
import { DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";


interface SiteSettingsEditorProps {
  initialSettings: SiteSettings;
}

// Helper function to generate a random string for PKCE
function generateRandomString(length: number) {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// Helper function to create a SHA-256 hash then base64url encode it
async function generateCodeChallenge(verifier: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return window.btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export function SiteSettingsEditor({ initialSettings }: SiteSettingsEditorProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [zettleClientId, setZettleClientId] = useState(initialSettings.zettleClientId || "905349c9-d4f1-40ae-adec-8d110fec2fea");
  
  const [linkedReaders, setLinkedReaders] = useState<ZettleLink[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [readerToUnlink, setReaderToUnlink] = useState<ZettleLink | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  const fetchReaders = useCallback(async () => {
    setIsFetchingData(true);
    try {
      const readers = await getLinkedReaders();
      setLinkedReaders(readers);
    } catch (error) {
       // This can fail if not authenticated, which is normal initially.
       console.warn("Could not fetch readers", (error as Error).message);
    } finally {
      setIsFetchingData(false);
    }
  }, []);

  useEffect(() => {
    fetchReaders();
  }, [fetchReaders]);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await updateSiteSettings({ zettleClientId });
      toast({
        title: "Innstillinger Oppdatert",
        description: "Client ID er lagret.",
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

  const handleZettleConnect = async () => {
    if (!zettleClientId) {
        toast({ variant: 'destructive', title: 'Client ID mangler', description: 'Du må lagre en Zettle Client ID før du kan koble til.' });
        return;
    }
    
    const codeVerifier = generateRandomString(128);
    sessionStorage.setItem('zettle_code_verifier', codeVerifier);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    const scopes = "READ:USERINFO WRITE:PAYMENT";
    const redirectUri = "https://varnacheck.firebaseapp.com/zettle/callback";
    const state = generateRandomString(16); // CSRF token

    const authUrl = `https://oauth.zettle.com/authorize?response_type=code&client_id=${zettleClientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    
    window.location.href = authUrl;
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
      <Card>
        <CardHeader>
          <CardTitle>Zettle-integrasjon</CardTitle>
          <CardDescription>
            Administrer tilkoblingen til Zettle for betaling med kortleser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="zettle-client-id">Zettle Client ID</Label>
                <Input
                  id="zettle-client-id"
                  type="text"
                  placeholder="Lim inn din Zettle Client ID her"
                  value={zettleClientId}
                  onChange={(e) => setZettleClientId(e.target.value)}
                  disabled={isLoading}
                />
            </div>
          
            <div className="flex gap-2">
                <Button onClick={handleSaveSettings} disabled={isLoading}>
                    {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isLoading ? 'Lagrer...' : 'Lagre Client ID'}
                </Button>
                 <Button onClick={handleZettleConnect} variant="secondary" disabled={isLoading || !zettleClientId}>
                    <Wifi className="mr-2 h-4 w-4" />
                    Koble til / Autentiser med Zettle
                </Button>
            </div>

          <Separator />
          
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Tilkoblede Kortlesere</h3>
                <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Koble til ny leser
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

           <Card>
              <CardContent className="pt-6">
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
                     <p className="text-center text-muted-foreground py-4">Ingen kortlesere er koblet til. Autentiser med Zettle og koble deretter til en ny leser.</p>
                  )}
              </CardContent>
           </Card>
        </CardContent>
      </Card>
      
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
