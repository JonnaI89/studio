
"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoaderCircle, Save, XCircle, CheckCircle, Link2Off } from "lucide-react";
import { getZettleSecrets, saveZettleSecrets, clearZettleSecrets, getAccessToken } from "@/services/zettle-service";
import type { ZettleSecrets } from "@/services/zettle-service";
import { Separator } from "../ui/separator";

export function SiteSettingsEditor({ initialSettings }: { initialSettings: { logoUrl?: string }}) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initialSettings.logoUrl || "");
  
  const [zettleClientId, setZettleClientId] = useState("");
  const [zettleClientSecret, setZettleClientSecret] = useState("");
  const [zettleStatus, setZettleStatus] = useState<"unknown" | "loading" | "connected" | "disconnected" | "error">("loading");
  const [zettleError, setZettleError] = useState<string | null>(null);

  const checkZettleStatus = useCallback(async () => {
    setZettleStatus("loading");
    setZettleError(null);
    try {
      const secrets = await getZettleSecrets();
      if (secrets?.accessToken && secrets.expiresAt && new Date().getTime() < new Date(secrets.expiresAt).getTime()) {
        setZettleStatus("connected");
      } else if (secrets?.clientId) {
        // Has credentials but token might be expired or missing, let's try to get one silently
        try {
            await getAccessToken();
            setZettleStatus("connected");
        } catch (silentError) {
            setZettleStatus("error");
            setZettleError("Kunne ikke fornye Zettle-tilkoblingen. Sjekk legitimasjonen din og lagre på nytt.");
        }
      } 
      else {
        setZettleStatus("disconnected");
      }
    } catch (error) {
      setZettleStatus("error");
      setZettleError((error as Error).message);
    }
  }, []);

  useEffect(() => {
    checkZettleStatus();
  }, [checkZettleStatus]);

  const handleSaveAndConnect = async () => {
    setIsSaving(true);
    setZettleError(null);
    try {
      if (!zettleClientId || !zettleClientSecret) {
        throw new Error("Både Client ID og Client Secret må fylles ut.");
      }
      await saveZettleSecrets(zettleClientId, zettleClientSecret);
      await getAccessToken(); // This will fetch and store the token
      toast({ title: "Zettle Tilkoblet!", description: "Tilkoblingen til Zettle var vellykket." });
      await checkZettleStatus();
      setZettleClientId("");
      setZettleClientSecret("");
    } catch (error) {
      console.error("Zettle connection failed:", error);
      toast({ variant: "destructive", title: "Tilkobling Feilet", description: (error as Error).message });
      await checkZettleStatus();
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDisconnect = async () => {
    setIsSaving(true);
    try {
        await clearZettleSecrets();
        toast({ title: "Zettle Frakoblet" });
        await checkZettleStatus();
    } catch (error) {
        toast({ variant: "destructive", title: "Frakobling feilet", description: (error as Error).message });
    } finally {
        setIsSaving(false);
    }
  }

  const renderStatus = () => {
      switch(zettleStatus) {
          case 'loading':
              return <div className="flex items-center gap-2 text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Laster status...</div>
          case 'connected':
              return <div className="flex items-center gap-2 text-green-600 font-semibold"><CheckCircle className="h-4 w-4" /> Tilkoblet</div>
          case 'disconnected':
               return <div className="flex items-center gap-2 text-muted-foreground"><XCircle className="h-4 w-4" /> Ikke tilkoblet</div>
          case 'error':
              return <div className="flex flex-col gap-2 text-destructive font-semibold"><div className="flex items-center gap-2"><XCircle className="h-4 w-4" /> Tilkoblingsfeil</div> <p className="text-xs font-normal">{zettleError}</p></div>
      }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Nettstedinnstillinger</CardTitle>
          <CardDescription>
            Administrer Zettle-integrasjonen for betalinger.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-lg space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium">Zettle-integrasjon</h3>
                <p className="text-sm text-muted-foreground">
                  Koble til Zettle for å aktivere betaling med kortleser.
                </p>
              </div>
              <div className="p-2 bg-muted rounded-md min-w-[150px] flex justify-center">
                {renderStatus()}
              </div>
            </div>

            {zettleStatus !== 'connected' && (
              <div className="space-y-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Lim inn din API-legitimasjon fra Zettle Developer-portalen for å koble til.</p>
                <div className="space-y-2">
                    <Label htmlFor="zettle-client-id">Zettle Client ID</Label>
                    <Input
                      id="zettle-client-id"
                      type="password"
                      placeholder="Lim inn din Zettle Client ID her"
                      value={zettleClientId}
                      onChange={(e) => setZettleClientId(e.target.value)}
                      disabled={isSaving}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="zettle-client-secret">Zettle Client Secret</Label>
                    <Input
                      id="zettle-client-secret"
                      type="password"
                      placeholder="Lim inn din Zettle Client Secret her"
                      value={zettleClientSecret}
                      onChange={(e) => setZettleClientSecret(e.target.value)}
                      disabled={isSaving}
                    />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              {zettleStatus !== 'connected' ? (
                  <Button onClick={handleSaveAndConnect} disabled={isSaving}>
                      {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {isSaving ? 'Kobler til...' : 'Lagre og Koble til'}
                  </Button>
              ) : (
                  <Button variant="destructive" onClick={handleDisconnect} disabled={isSaving}>
                       {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Link2Off className="mr-2 h-4 w-4" />}
                      Koble fra Zettle
                  </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
