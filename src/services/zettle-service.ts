
'use server';

import { db } from '@/lib/firebase-config';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const ZETTLE_OAUTH_URL = "https://oauth.zettle.com";
const ZETTLE_READER_API_URL = "https://reader-connect.zettle.com/v1";
const ZETTLE_SECRETS_DOC = 'zettle-secrets';

export interface ZettleSecrets {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
}

export async function saveZettleSecrets(clientId: string, clientSecret: string): Promise<void> {
    await setDoc(doc(db, "secrets", ZETTLE_SECRETS_DOC), { 
        clientId, 
        clientSecret 
    }, { merge: true });
}

export async function getAccessToken(): Promise<string> {
    const tokenDocRef = doc(db, "secrets", ZETTLE_SECRETS_DOC);
    const tokenDocSnap = await getDoc(tokenDocRef);

    if (!tokenDocSnap.exists()) {
        throw new Error("Zettle-legitimasjon ikke funnet. Vennligst lagre Client ID og Secret i innstillingene.");
    }
    
    let tokenData = tokenDocSnap.data() as Partial<ZettleSecrets>;
    const isExpired = !tokenData.expiresAt || new Date() >= new Date(tokenData.expiresAt);

    if (isExpired) {
        if (!tokenData.clientId || !tokenData.clientSecret) {
            throw new Error("Mangler Client ID eller Secret. Kan ikke fornye token.");
        }

        const grantType = tokenData.refreshToken ? 'refresh_token' : 'client_credentials';
        const body = new URLSearchParams({ grant_type });
        
        if (grantType === 'refresh_token') {
            body.append('refresh_token', tokenData.refreshToken!);
        }
        
        const authHeader = 'Basic ' + Buffer.from(`${tokenData.clientId}:${tokenData.clientSecret}`).toString('base64');

        const response = await fetch(`${ZETTLE_OAUTH_URL}/token`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': authHeader,
            },
            body: body.toString(),
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.error("Zettle token fetch/refresh error:", error);
            await clearZettleSecrets(); // Clear secrets if refresh fails
            throw new Error(`Klarte ikke å hente/fornye Zettle-token: ${error.error_description || 'Ukjent feil'}. Prøv å lagre legitimasjon på nytt.`);
        }
        
        const newTokens = await response.json();
        const expiryDate = new Date(new Date().getTime() + newTokens.expires_in * 1000);

        tokenData = {
            ...tokenData,
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token,
            expiresAt: expiryDate.toISOString(),
        };

        await setDoc(tokenDocRef, tokenData, { merge: true });
        return newTokens.access_token;
    }
    
    return tokenData.accessToken!;
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

export async function claimLinkOffer(code: string, deviceName: string): Promise<void> {
    const accessToken = await getAccessToken();
    const response = await fetch(`${ZETTLE_READER_API_URL}/links`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'Idempotency-Key': uuidv4(),
        },
        body: JSON.stringify({
            code: code.trim(),
            integratorTags: { deviceName },
        }),
    });
    
    if (!response.ok) {
        const error = await response.json();
        console.error('Error claiming link offer:', error);
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
