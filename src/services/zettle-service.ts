
'use server';

import { getFirebaseSiteSettings } from './firebase-service';
import { db } from '@/lib/firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const ZETTLE_OAUTH_URL = "https://oauth.zettle.com/token";
const ZETTLE_READER_API_URL = "https://reader-connect.zettle.com/v1/integrator";

interface ZettleTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export interface ZettleLink {
    id: string;
    organizationUuid: string;
    readerTags: {
        model?: string;
        serialNumber?: string;
    };
    integratorTags: Record<string, string>;
    websocket: {
        url: string;
    };
}

// Function to exchange the authorization code for tokens using PKCE
export async function exchangeCodeForTokens(code: string, codeVerifier: string, redirectUri: string) {
    const settings = await getFirebaseSiteSettings();
    const clientId = settings.zettleClientId;

    if (!clientId) {
        throw new Error("Zettle Client ID is not configured.");
    }
    
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
    });
    
    const response = await fetch(ZETTLE_OAUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error("Failed to exchange code for tokens:", response.status, errorBody);
        throw new Error(`Kunne ikke veksle autorisasjonskode mot en permanent nøkkel: ${errorBody.error_description || response.statusText}`);
    }

    const data: ZettleTokenResponse = await response.json();
    
    const now = new Date();
    const expiryDate = new Date(now.getTime() + data.expires_in * 1000);
    
    const tokenDocRef = doc(db, "secrets", "zettle");
    await setDoc(tokenDocRef, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: expiryDate.toISOString(),
    });
    
    console.log("Successfully exchanged code for tokens and saved them.");
    return { success: true };
}

async function getZettleAccessToken(): Promise<string> {
    const tokenDocRef = doc(db, "secrets", "zettle");
    const tokenDocSnap = await getDoc(tokenDocRef);

    if (!tokenDocSnap.exists() || !tokenDocSnap.data()?.refreshToken) {
        console.error("No Zettle refresh token found in database. Please re-authenticate via settings.");
        throw new Error("Mangler Zettle-tilkobling. Gå til Nettstedinnstillinger og koble til på nytt.");
    }

    const tokenData = tokenDocSnap.data();
    const isExpired = new Date() >= new Date(tokenData.expiresAt);

    if (!isExpired) {
        return tokenData.accessToken;
    }

    console.log("Zettle access token expired. Refreshing...");
    const settings = await getFirebaseSiteSettings();
    const clientId = settings.zettleClientId;

    if (!clientId) {
        throw new Error("Zettle Client ID is not configured in settings.");
    }
    
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refreshToken,
        client_id: clientId,
    });

    const response = await fetch(ZETTLE_OAUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error("Failed to refresh Zettle access token:", response.status, errorBody);
        await setDoc(tokenDocRef, {}); 
        throw new Error(`Kunne ikke fornye Zettle-nøkkel: ${errorBody.error_description || response.statusText}. Vennligst koble til på nytt.`);
    }

    const data: ZettleTokenResponse = await response.json();
    const now = new Date();
    const expiryDate = new Date(now.getTime() + data.expires_in * 1000);
    
    await setDoc(tokenDocRef, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: expiryDate.toISOString(),
    }, { merge: true });
    
    console.log("Successfully refreshed and saved new Zettle tokens.");
    return data.access_token;
}


export async function getLinkedReaders(): Promise<ZettleLink[]> {
    const accessToken = await getZettleAccessToken();
    const response = await fetch(`${ZETTLE_READER_API_URL}/links`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Error fetching linked readers:", errorText);
        throw new Error(`Kunne ikke hente tilkoblede lesere. Status: ${response.status}`);
    }
    const data = await response.json();
    return data.links || [];
}

export async function claimLinkOffer(code: string, deviceName: string): Promise<void> {
    const accessToken = await getZettleAccessToken();
    const response = await fetch(`${ZETTLE_READER_API_URL}/link-offers/claim`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'Idempotency-Key': uuidv4(),
        },
        body: JSON.stringify({
            code: code,
            integratorTags: { deviceName: deviceName }
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Kunne ikke koble til leser: ${error.message || response.statusText}`);
    }
}


export async function deleteLink(linkId: string): Promise<void> {
    const accessToken = await getZettleAccessToken();
    const response = await fetch(`${ZETTLE_READER_API_URL}/links/${linkId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        throw new Error("Kunne ikke koble fra leser.");
    }
}


export async function startPayment(linkId: string, amount: number): Promise<{paymentId: string; websocketUrl: string}> {
    const accessToken = await getZettleAccessToken();
    const paymentId = uuidv4();
    const response = await fetch(`${ZETTLE_READER_API_URL}/links/${linkId}/payments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'Idempotency-Key': uuidv4(),
        },
        body: JSON.stringify({
            paymentId: paymentId,
            amount: Math.round(amount * 100), // Beløp i øre
            currency: 'NOK',
        }),
    });
    
    if (!response.ok) {
        const error = await response.json();
        console.error("Error starting payment:", error);
        throw new Error(`Kunne ikke starte betaling: ${error.message || response.statusText}`);
    }
    
    const { websocketUrl } = await response.json();

    return { paymentId, websocketUrl };
}
