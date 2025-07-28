
'use server';

import { getFirebaseSiteSettings, updateFirebaseSiteSettings } from './firebase-service';
import { db } from '@/lib/firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ZETTLE_OAUTH_URL = "https://oauth.zettle.com/token";
const ZETTLE_API_URL = "https://reader-connect.zettle.com";

interface ZettleTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token: string;
}

interface ZettleLink {
    id: string;
    organizationUuid: string;
    readerTags: {
        model?: string;
        serialNumber?: string;
    };
    integratorTags: Record<string, string>;
}


async function getZettleTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const docRef = doc(db, "secrets", "zettle");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        // TODO: Check if token is expired and refresh if needed
        return { accessToken: data.accessToken, refreshToken: data.refreshToken };
    }
    return { accessToken: null, refreshToken: null };
}

async function saveZettleTokens(accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
    const docRef = doc(db, "secrets", "zettle");
    const now = new Date();
    const expiryDate = new Date(now.getTime() + expiresIn * 1000);

    await setDoc(docRef, {
        accessToken,
        refreshToken,
        expiresAt: expiryDate.toISOString(),
    }, { merge: true });
}

export async function exchangeCodeForToken(code: string): Promise<boolean> {
    try {
        const settings = await getFirebaseSiteSettings();
        const clientId = settings.zettleClientId;
        // Dette er en server-side hemmelighet. Den skal ikke eksponeres på klienten.
        // I et produksjonsmiljø hentes denne fra en sikker konfigurasjon (f.eks. environment variable).
        const clientSecret = "IZSEC3ad1f975-7fd8-463e-b641-8504d2681fec";

        if (!clientId || !clientSecret) {
            throw new Error("Mangler Zettle Client ID eller Secret i konfigurasjonen.");
        }

        const redirectUri = 'https://forerportal--varnacheck.europe-west4.hosted.app/admin/zettle/callback';

        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
        });

        const response = await fetch(ZETTLE_OAUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Zettle token exchange error:", response.status, errorBody);
            throw new Error(`Feil ved utveksling av kode: ${response.statusText}`);
        }

        const data: ZettleTokenResponse = await response.json();
        await saveZettleTokens(data.access_token, data.refresh_token, data.expires_in);
        
        return true;

    } catch (error) {
        console.error("Feil i exchangeCodeForToken:", error);
        return false;
    }
}

export async function getLinkedReaders(): Promise<ZettleLink[]> {
    const { accessToken } = await getZettleTokens();
    if (!accessToken) {
        throw new Error("Ikke autentisert med Zettle.");
    }

    const response = await fetch(`${ZETTLE_API_URL}/v1/links`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error("Kunne ikke hente tilkoblede lesere.");
    }
    return response.json();
}

export async function claimLinkOffer(code: string, deviceName: string): Promise<ZettleLink> {
     const { accessToken } = await getZettleTokens();
    if (!accessToken) {
        throw new Error("Ikke autentisert med Zettle.");
    }

    const response = await fetch(`${ZETTLE_API_URL}/v1/link-offers/claim`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            code: code,
            tags: { deviceName }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Claim link offer error:", errorText);
        throw new Error(`Kunne ikke koble til leser. Status: ${response.status}`);
    }

    return response.json();
}

export async function deleteLink(linkId: string): Promise<void> {
    const { accessToken } = await getZettleTokens();
    if (!accessToken) {
        throw new Error("Ikke autentisert med Zettle.");
    }

    const response = await fetch(`${ZETTLE_API_URL}/v1/links/${linkId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error("Kunne ikke koble fra leser.");
    }
}
