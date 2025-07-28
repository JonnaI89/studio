
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

export interface ZettleLink {
    id: string;
    type: string;
    claimed: boolean;
    integratorTags: {
        linkId: string;
        deviceName: string;
    }
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
 */
export async function saveZettleSecrets(clientId: string, clientSecret: string): Promise<void> {
    if (!clientId || !clientSecret) {
        throw new Error("Både Client ID og Client Secret må oppgis.");
    }
    // Set document with new credentials, clearing any old token data.
    await setDoc(doc(db, "secrets", ZETTLE_SECRETS_DOC), { clientId, clientSecret });
}

/**
 * Clears the stored Zettle secrets from Firestore.
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
        // Do not clear credentials automatically, let the user decide.
        throw new Error(`Klarte ikke å hente Zettle-token: ${error.error_description || 'Ugyldig Client ID eller Secret'}. Sjekk at legitimasjonen er korrekt.`);
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

/**
 * Fetches the list of already linked/paired card readers from Zettle.
 */
export async function getLinkedReaders(): Promise<ZettleLink[]> {
    const accessToken = await getAccessToken();

    const response = await fetch(`${ZETTLE_READER_API_URL}/links`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        const error = await response.json();
        console.error("Get linked readers error:", error);
        throw new Error(`Kunne ikke hente tilkoblede lesere: ${error.error || 'Ukjent feil'}`);
    }

    const data = await response.json();
    return data.links || [];
}


/**
 * Initiates a payment on a specified reader.
 */
export async function startPayment(linkId: string, amount: number): Promise<{ websocketUrl: string }> {
    const accessToken = await getAccessToken();
    const idempotencyKey = uuidv4();

    const body = {
        amount: amount * 100, // Amount in øre/cents
        currency: 'NOK',
        reference: `KartPass-${uuidv4().substring(0, 8)}`,
    };

    const response = await fetch(`${ZETTLE_READER_API_URL}/links/${linkId}/payment`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error("Start payment error:", error);
        throw new Error(`Kunne ikke starte betaling: ${error.error || 'Ukjent feil'}`);
    }

    return response.json();
}
