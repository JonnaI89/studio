
'use server';

import { getFirebaseSiteSettings, updateFirebaseSiteSettings } from './firebase-service';
import { db } from '@/lib/firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const ZETTLE_OAUTH_URL = "https://oauth.zettle.com";
const ZETTLE_READER_API_URL = "https://reader-connect.zettle.com/v1";

const ZETTLE_SECRETS_DOC = 'zettle-secrets';

// PKCE Helper functions
async function generatePkceChallenge() {
    const verifier = uuidv4() + uuidv4();
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const base64Url = btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    return { verifier, challenge: base64Url };
}

export async function getOauthUrl(clientId: string): Promise<{oauthUrl: string, state: string, verifier: string}> {
    const { verifier, challenge } = await generatePkceChallenge();
    const state = uuidv4();
    
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/zettle/callback`;

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: 'READ:USERINFO WRITE:PAYMENT',
        redirect_uri: redirectUri,
        state: state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
    });

    return {
      oauthUrl: `${ZETTLE_OAUTH_URL}/authorize?${params.toString()}`,
      state,
      verifier
    };
}

export async function exchangeCodeForToken(code: string, clientId: string, verifier: string): Promise<void> {
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/zettle/callback`;

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        redirect_uri: redirectUri,
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
        throw new Error(`Failed to get token: ${error.error_description || 'Unknown error'}`);
    }

    const tokens = await response.json();
    
    const expiryDate = new Date(new Date().getTime() + tokens.expires_in * 1000);

    // Securely store tokens in Firestore
    await setDoc(doc(db, "secrets", ZETTLE_SECRETS_DOC), {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: expiryDate.toISOString(),
    });
}

async function getAccessToken(): Promise<string> {
    const tokenDocRef = doc(db, "secrets", ZETTLE_SECRETS_DOC);
    const tokenDocSnap = await getDoc(tokenDocRef);

    if (!tokenDocSnap.exists()) {
        throw new Error("Zettle not connected. Please connect on the settings page.");
    }

    const tokenData = tokenDocSnap.data();
    const isExpired = new Date() >= new Date(tokenData.expiresAt);

    if (!isExpired) {
        return tokenData.accessToken;
    }
    
    // Token is expired, refresh it
    console.log("Zettle token expired, refreshing...");
    const settings = await getFirebaseSiteSettings();
    if (!settings.zettleClientId) {
        throw new Error("Zettle Client ID not configured.");
    }
    
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: settings.zettleClientId,
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
        // If refresh fails, might need re-authentication
        throw new Error("Could not refresh Zettle token. Please try reconnecting.");
    }

    const newTokens = await response.json();
    const newExpiryDate = new Date(new Date().getTime() + newTokens.expires_in * 1000);

    await setDoc(doc(db, "secrets", ZETTLE_SECRETS_DOC), {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        expiresAt: newExpiryDate.toISOString(),
    });
    
    return newTokens.access_token;
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

export async function claimLinkOffer(code: string, deviceName: string): Promise<void> {
    const accessToken = await getAccessToken();
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
    const accessToken = await getAccessToken();
    const response = await fetch(`${ZETTLE_READER_API_URL}/links/${linkId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
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
