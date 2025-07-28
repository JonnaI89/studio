
'use server';

import { getFirebaseSiteSettings } from './firebase-service';
import { db } from '@/lib/firebase-config';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const ZETTLE_OAUTH_URL = "https://oauth.zettle.com";
const ZETTLE_READER_API_URL = "https://reader-connect.zettle.com/v1";
const ZETTLE_SECRETS_DOC = 'zettle-secrets';

// This is the static redirect URI that must be added to the Zettle Developer Portal
const REDIRECT_URI = 'https://varnacheck.firebaseapp.com/zettle/callback';

export interface ZettleSecrets {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
}

// PKCE Helper functions
async function generateCodeVerifier() {
    const rando = new Uint8Array(32);
    crypto.getRandomValues(rando);
    return Buffer.from(rando).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Buffer.from(hash).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function getAuthorizationUrl(): Promise<{ url: string; state: string; codeVerifier: string }> {
    const settings = await getFirebaseSiteSettings();
    const clientId = settings.zettleClientId;

    if (!clientId) {
        throw new Error("Zettle Client ID is not configured.");
    }

    const state = uuidv4();
    const codeVerifier = await generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        scope: 'READ:USERINFO READ:POS',
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    return {
        url: `${ZETTLE_OAUTH_URL}/authorize?${params.toString()}`,
        state,
        codeVerifier,
    };
}


export async function exchangeCodeForToken(code: string, verifier: string): Promise<void> {
    const settings = await getFirebaseSiteSettings();
    const clientId = settings.zettleClientId;

    if (!clientId) {
        throw new Error("Zettle Client ID is not configured.");
    }

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
    });
    
    const response = await fetch(`${ZETTLE_OAUTH_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error("Zettle token exchange error:", error);
        throw new Error(`Failed to exchange code for token: ${error.error_description || 'Unknown error'}`);
    }

    const tokens = await response.json();
    const expiryDate = new Date(new Date().getTime() + tokens.expires_in * 1000);

    await setDoc(doc(db, "secrets", ZETTLE_SECRETS_DOC), {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: expiryDate.toISOString(),
    });
}


async function getRefreshedAccessToken(): Promise<string> {
    const tokenDocRef = doc(db, "secrets", ZETTLE_SECRETS_DOC);
    const tokenDocSnap = await getDoc(tokenDocRef);

    if (!tokenDocSnap.exists()) {
        throw new Error("Zettle not connected. Please connect from settings.");
    }
    
    const tokenData = tokenDocSnap.data() as ZettleSecrets;
    const settings = await getFirebaseSiteSettings();

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: settings.zettleClientId!,
        refresh_token: tokenData.refreshToken,
    });

    const response = await fetch(`${ZETTLE_OAUTH_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });
    
    if (!response.ok) {
        const error = await response.json();
        console.error("Zettle token refresh error:", error);
        await clearZettleSecrets(); // Clear secrets if refresh fails
        throw new Error("Failed to refresh Zettle token. Please reconnect.");
    }
    
    const newTokens = await response.json();
    const expiryDate = new Date(new Date().getTime() + newTokens.expires_in * 1000);

    await setDoc(doc(db, "secrets", ZETTLE_SECRETS_DOC), {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        expiresAt: expiryDate.toISOString(),
    });

    return newTokens.access_token;
}


async function getAccessToken(): Promise<string> {
    const tokenDocRef = doc(db, "secrets", ZETTLE_SECRETS_DOC);
    const tokenDocSnap = await getDoc(tokenDocRef);

    if (!tokenDocSnap.exists()) {
        throw new Error("Zettle account not connected.");
    }
    
    const tokenData = tokenDocSnap.data() as ZettleSecrets;
    const isExpired = new Date() >= new Date(tokenData.expiresAt);

    if (isExpired) {
        return getRefreshedAccessToken();
    }
    
    return tokenData.accessToken;
}

export async function getZettleSecrets(): Promise<ZettleSecrets | null> {
    const tokenDocRef = doc(db, "secrets", ZETTLE_SECRETS_DOC);
    const tokenDocSnap = await getDoc(tokenDocRef);
    if (tokenDocSnap.exists()) {
        return tokenDocSnap.data() as ZettleSecrets;
    }
    return null;
}

export async function clearZettleSecrets(): Promise<void> {
    await deleteDoc(doc(db, "secrets", ZETTLE_SECRETS_DOC));
}


export interface ZettleLink {
    id: string;
    organizationUuid: string;
    readerTags: {
        model?: string;
        serialNumber?: string;
    };
    integratorTags: {
        deviceName: string;
    };
    websocket: {
        url: string;
    };
}


export async function getLinkedReaders(): Promise<ZettleLink[]> {
    const accessToken = await getAccessToken();
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

export async function deleteLink(linkId: string): Promise<void> {
    const accessToken = await getAccessToken();
    const response = await fetch(`${ZETTLE_READER_API_URL}/links/${linkId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error("Failed to delete link:", errorData);
        throw new Error("Kunne ikke koble fra leser.");
    }
}


export async function startPayment(linkId: string, amount: number): Promise<{paymentId: string; websocketUrl: string}> {
    const accessToken = await getAccessToken();
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
