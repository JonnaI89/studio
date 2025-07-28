
'use server';

import { getFirebaseSiteSettings } from './firebase-service';
import { db } from '@/lib/firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const ZETTLE_OAUTH_URL = "https://oauth.zettle.com";
const ZETTLE_READER_API_URL = "https://reader-connect.zettle.com/v1";

const ZETTLE_SECRETS_DOC = 'zettle-secrets';

async function getAccessToken(): Promise<string> {
    const tokenDocRef = doc(db, "secrets", ZETTLE_SECRETS_DOC);
    const tokenDocSnap = await getDoc(tokenDocRef);
    const settings = await getFirebaseSiteSettings();
    const clientId = settings.zettleClientId;

    if (!clientId) {
        throw new Error("Zettle Client ID er ikke konfigurert i systemet.");
    }
    
    // Check if token exists and is not expired
    if (tokenDocSnap.exists()) {
        const tokenData = tokenDocSnap.data();
        const isExpired = new Date() >= new Date(tokenData.expiresAt);
        if (!isExpired) {
            return tokenData.accessToken;
        }
    }

    // If no token or expired, get a new one using client_credentials
    console.log("Fetching new Zettle access token...");
    
    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        scope: 'READ:USERINFO READ:POS WRITE:POS',
    });

    const response = await fetch(`${ZETTLE_OAUTH_URL}/token`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString(),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error("Zettle token fetch error:", error);
        throw new Error(`Failed to get token: ${error.error_description || 'Unknown error'}`);
    }

    const tokens = await response.json();
    const expiryDate = new Date(new Date().getTime() + tokens.expires_in * 1000);

    // Securely store the token in Firestore
    await setDoc(doc(db, "secrets", ZETTLE_SECRETS_DOC), {
        accessToken: tokens.access_token,
        expiresAt: expiryDate.toISOString(),
    });

    return tokens.access_token;
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
