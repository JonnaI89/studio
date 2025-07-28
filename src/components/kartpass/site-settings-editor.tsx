
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoaderCircle, Save, Wifi, Trash2, XCircle } from "lucide-react";
import { updateSiteSettings } from "@/services/settings-service";
import { getLinkedReaders, deleteLink, type ZettleLink } from "@/services/zettle-service";
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
  const [zettleClientId, setZettleClientId] = useState(initialSettings.zettleClientId || "");
  
  const [linkedReaders, setLinkedReaders] = useState<ZettleLink[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [readerToUnlink, setReaderToUnlink] = useState<ZettleLink | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const fetchReaders = async () => {
    setIsFetchingData(true);
    try {
      const readers = await getLinkedReaders();
      setLinkedReaders(readers);
    } catch (error) {
       console.error("Could not fetch readers", error);
       // Do not toast here as it can be annoying if settings are just not configured yet
    } finally {
      setIsFetchingData(false);
    }
  };

  useEffect(() => {
    fetchReaders();
  }, []);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await updateSiteSettings({ 
        zettleClientId: zettleClientId,
       });
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
    
    // 1. Create a code verifier
    const codeVerifier = generateRandomString(128);
    // 2. Store it in sessionStorage
    sessionStorage.setItem('zettle_code_verifier', codeVerifier);

    // 3. Create a code challenge
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // 4. Build the authorization URL
    const scopes = "READ:USERINFO WRITE:PAYMENT";
    const redirectUri = `${window.location.origin}/zettle/callback`;
    const state = generateRandomString(16); // CSRF token

    const authUrl = `https://oauth.zettle.com/authorize?response_type=code&client_id=${zettleClientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    
    // 5. Redirect the user
    window.location.href = authUrl;
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
                    {isLoading ? <LoaderCircle className="mr-2" /> : <Save className="mr-2" />}
                    {isLoading ? 'Lagrer...' : 'Lagre Client ID'}
                </Button>
                 <Button onClick={handleZettleConnect} variant="secondary" disabled={isLoading || !zettleClientId}>
                    <Wifi className="mr-2" />
                    Koble til Zettle
                </Button>
            </div>

          <Separator />
          
           <h3 className="text-lg font-medium">Tilkoblede Kortlesere</h3>
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
                     <p className="text-center text-muted-foreground">Ingen kortlesere er koblet til. Lagre din Client ID og trykk "Koble til Zettle".</p>
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
              Dette vil koble fra leseren <span className="font-bold">{readerToUnlink?.integratorTags?.deviceName}</span>. Du kan koble den til på nytt via Zettle-portalen.
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

    