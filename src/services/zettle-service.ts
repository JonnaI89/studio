
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
    accessToken?: string;
    expiresAt?: string; // ISO 8601 format
}

/**
 * Retrieves the Zettle secrets (client ID/secret) from Firestore.
 */
export async function getZettleSecrets(): Promise<ZettleSecrets | null> {
    const secretsDocRef = doc(db, "secrets", ZETTLE_SECRETS_DOC);
    const docSnap = await getDoc(secretsDocRef);
    if (docSnap.exists()) {
        return docSnap.data() as ZettleSecrets;
    }
    return null;
}

/**
 * Saves the Zettle Client ID and Client Secret to Firestore.
 * This function should be called from the admin settings page.
 */
export async function saveZettleSecrets(clientId: string, clientSecret: string): Promise<void> {
    if (!clientId || !clientSecret) {
        throw new Error("Både Client ID og Client Secret må oppgis.");
    }
    await setDoc(doc(db, "secrets", ZETTLE_SECRETS_DOC), { clientId, clientSecret }, { merge: true });
}

/**
 * Clears the stored Zettle secrets from a Firestore.
 */
export async function clearZettleSecrets(): Promise<void> {
    await deleteDoc(doc(db, "secrets", ZETTLE_SECRETS_DOC));
}


/**
 * Gets a valid access token. If the stored token is missing or expired,
 * it fetches a new one using the client_credentials grant type.
 * This is the core authentication function for server-to-server communication.
 */
export async function getAccessToken(): Promise<string> {
    const secretsDocRef = doc(db, "secrets", ZETTLE_SECRETS_DOC);
    const docSnap = await getDoc(secretsDocRef);

    if (!docSnap.exists()) {
        throw new Error("Zettle-legitimasjon er ikke lagret. Gå til innstillinger for å legge dem til.");
    }

    const secrets = docSnap.data() as ZettleSecrets;
    const { accessToken, expiresAt, clientId, clientSecret } = secrets;

    // Check if token exists and is not expired (with a 60-second buffer)
    if (accessToken && expiresAt && new Date().getTime() < new Date(expiresAt).getTime() - 60000) {
        return accessToken;
    }

    // --- Token is missing or expired, fetch a new one ---
    if (!clientId || !clientSecret) {
        throw new Error("Client ID eller Client Secret mangler i databasen.");
    }

    const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({ grant_type: 'client_credentials' });

    const response = await fetch(`${ZETTLE_OAUTH_URL}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': authHeader,
        },
        body: body.toString(),
        cache: 'no-store', // Ensure we always get a fresh response
    });

    if (!response.ok) {
        const error = await response.json();
        console.error("Zettle token fetch error:", error);
        // Clear bad credentials to allow user to re-enter
        await clearZettleSecrets();
        throw new Error(`Klarte ikke å hente Zettle-token: ${error.error_description || 'Ugyldig Client ID eller Secret'}. Legitimasjon er nullstilt. Vennligst prøv å lagre på nytt.`);
    }

    const newTokens = await response.json();
    const newExpiryDate = new Date(new Date().getTime() + newTokens.expires_in * 1000);

    const newSecrets: ZettleSecrets = {
        ...secrets,
        accessToken: newTokens.access_token,
        expiresAt: newExpiryDate.toISOString(),
    };

    await setDoc(secretsDocRef, newSecrets, { merge: true });
    
    return newSecrets.accessToken!;
}


// --- Reader Connect API Functions ---

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

/**
 * Fetches all card readers linked to the Zettle organization.
 */
export async function getLinkedReaders(): Promise<ZettleLink[]> {
    const accessToken = await getAccessToken();
    const response = await fetch(`${ZETTLE_READER_API_URL}/links`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Error fetching linked readers:", errorText);
        throw new Error(`Kunne ikke hente tilkoblede lesere. Status: ${response.status}`);
    }
    const data = await response.json();
    return data.links || [];
}

/**
 * Claims a link offer from a reader, pairing it with the organization.
 */
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
        throw new Error(`Kunne ikke koble til leser: ${error.developerMessage || response.statusText}`);
    }
}

/**
 * Deletes a link, unpairing a reader from the organization.
 */
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

/**
 * Initiates a payment on a specific reader.
 * Returns the paymentId and a temporary WebSocket URL for this transaction.
 */
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
            amount: Math.round(amount * 100), // Amount in the smallest currency unit (øre)
            currency: 'NOK',
        }),
    });
    
    if (!response.ok) {
        const error = await response.json();
        console.error("Error starting payment:", error);
        throw new Error(`Kunne ikke starte betaling: ${error.developerMessage || response.statusText}`);
    }
    
    const { websocketUrl } = await response.json();

    return { paymentId, websocketUrl };
}
