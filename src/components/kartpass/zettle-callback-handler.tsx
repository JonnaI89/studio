
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { exchangeCodeForToken } from "@/services/zettle-service";
import { LoaderCircle, CheckCircle, XCircle } from "lucide-react";
import { getFirebaseSiteSettings } from "@/services/firebase-service";

const ZETTLE_LS_STATE_KEY = 'zettle-oauth-state';
const ZETTLE_LS_VERIFIER_KEY = 'zettle-pkce-verifier';


export function ZettleCallbackHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
    const [message, setMessage] = useState("Verifiserer og henter tilgangsnøkkel...");

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const savedState = window.localStorage.getItem(ZETTLE_LS_STATE_KEY);
            const savedVerifier = window.localStorage.getItem(ZETTLE_LS_VERIFIER_KEY);

            if (!code || !state) {
                setStatus("error");
                setMessage("Mangler 'code' eller 'state' i URL-en. Prøv igjen.");
                return;
            }

            if (state !== savedState) {
                setStatus("error");
                setMessage("Ugyldig 'state'. Sikkerhetssjekk feilet. Prøv igjen.");
                return;
            }

            if (!savedVerifier) {
                setStatus("error");
                setMessage("Mangler 'verifier'. Sikkerhetssjekk feilet. Prøv igjen.");
                return;
            }
            
            try {
                const settings = await getFirebaseSiteSettings();
                if (!settings || !settings.zettleClientId) {
                     throw new Error("Zettle Client ID er ikke konfigurert i systemet.");
                }
                const clientId = settings.zettleClientId;

                await exchangeCodeForToken(code, clientId, savedVerifier);
                
                setStatus("success");
                setMessage("Tilkobling vellykket! Omdirigerer deg nå...");
                toast({
                    title: "Zettle-tilkobling Vellykket!",
                    description: "Du kan nå koble til kortlesere og motta betalinger.",
                });

                setTimeout(() => {
                    router.push('/admin/site-settings');
                }, 2000);

            } catch (error) {
                setStatus("error");
                const errorMessage = (error as Error).message;
                setMessage(errorMessage);
                toast({
                    variant: "destructive",
                    title: "Zettle-tilkobling Feilet",
                    description: errorMessage,
                });
            } finally {
                window.localStorage.removeItem(ZETTLE_LS_STATE_KEY);
                window.localStorage.removeItem(ZETTLE_LS_VERIFIER_KEY);
            }
        };

        handleCallback();
    }, [searchParams, router, toast]);

    const renderStatus = () => {
        switch (status) {
            case "processing":
                return <LoaderCircle className="h-8 w-8 animate-spin text-primary" />;
            case "success":
                return <CheckCircle className="h-8 w-8 text-green-600" />;
            case "error":
                return <XCircle className="h-8 w-8 text-destructive" />;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
            {renderStatus()}
            <p className="text-center text-sm text-muted-foreground">{message}</p>
        </div>
    );
}
