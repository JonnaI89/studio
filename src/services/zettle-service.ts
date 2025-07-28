
'use server';

import { getFirebaseSiteSettings } from './firebase-service';
import { db } from '@/lib/firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ZETTLE_OAUTH_URL = "https://oauth.zettle.com/token";
const ZETTLE_API_URL = "https://reader-connect.zettle.com";

interface ZettleTokenResponse {
    access_token: string;
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
}

interface PaymentRequest {
    amount: number; // In NOK
    reference: string;
    readerId: string;
}

interface PaymentResponse {
    status: 'pending' | 'completed' | 'canceled' | 'failed';
    amount?: number;
    reference?: string;
}

async function getZettleAccessToken(): Promise<string | null> {
    const tokenDocRef = doc(db, "secrets", "zettle");
    const tokenDocSnap = await getDoc(tokenDocRef);

    if (tokenDocSnap.exists()) {
        const data = tokenDocSnap.data();
        const isExpired = new Date() >= new Date(data.expiresAt);
        if (!isExpired) {
            return data.accessToken;
        }
    }
    
    // If token doesn't exist or is expired, fetch a new one
    console.log("Fetching new Zettle access token using Assertion Grant flow.");
    const settings = await getFirebaseSiteSettings();
    const clientId = settings.zettleClientId;
    const apiKey = settings.zettleApiKey;

    if (!clientId || !apiKey) {
        throw new Error("Zettle Client ID or API Key is not configured in settings.");
    }

    try {
        const body = new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            client_id: clientId,
            assertion: apiKey,
        });

        const response = await fetch(ZETTLE_OAUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Failed to fetch Zettle access token:", response.status, errorBody);
            throw new Error(`Kunne ikke hente Zettle-nøkkel: ${errorBody.error_description || response.statusText}`);
        }

        const data: ZettleTokenResponse = await response.json();
        
        // Save the new token and its expiry
        const now = new Date();
        const expiryDate = new Date(now.getTime() + data.expires_in * 1000);
        await setDoc(tokenDocRef, {
            accessToken: data.access_token,
            expiresAt: expiryDate.toISOString(),
        });
        
        console.log("Successfully fetched and saved new Zettle access token.");
        return data.access_token;

    } catch (error) {
        console.error("Error in getZettleAccessToken:", error);
        throw error; // Re-throw to be caught by calling function
    }
}


export async function getLinkedReaders(): Promise<ZettleLink[]> {
    try {
        const accessToken = await getZettleAccessToken();
        if (!accessToken) {
             console.log("Not authenticated with Zettle, cannot fetch readers.");
             return [];
        }

        const response = await fetch(`${ZETTLE_API_URL}/v1/links`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error fetching linked readers:", errorText);
            throw new Error(`Kunne ikke hente tilkoblede lesere. Status: ${response.status}`);
        }
        const data = await response.json();
        return data.links || [];
    } catch (error) {
        console.error("Exception in getLinkedReaders:", error);
        // Don't throw here, as it might just mean credentials are not set yet.
        // Return an empty array and let the UI handle it.
        return [];
    }
}

export async function claimLinkOffer(code: string, deviceName: string): Promise<ZettleLink> {
    const accessToken = await getZettleAccessToken();
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
        throw new Error(`Kunne ikke koble til leser. Status: ${response.status}. ${errorText}`);
    }
    return response.json();
}

export async function deleteLink(linkId: string): Promise<void> {
    const accessToken = await getZettleAccessToken();
    if (!accessToken) {
        throw new Error("Ikke autentisert med Zettle.");
    }

    const response = await fetch(`${ZETTLE_API_URL}/v1/links/${linkId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        throw new Error("Kunne ikke koble fra leser.");
    }
}

export async function initiateZettlePayment(request: PaymentRequest): Promise<PaymentResponse> {
    const accessToken = await getZettleAccessToken();
    if (!accessToken) {
        throw new Error("Ikke autentisert med Zettle.");
    }
    
    // Convert NOK to øre for Zettle API
    const amountInOre = Math.round(request.amount * 100);

    const response = await fetch(`${ZETTLE_API_URL}/v1/links/${request.readerId}/payment`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: amountInOre,
            reference: request.reference
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Zettle payment initiation error:", errorText);
        let userMessage = "Kunne ikke starte betalingen på kortleseren.";
        if (response.status === 409) {
            userMessage = "Kortleseren er opptatt. Vennligst fullfør eller avbryt den pågående handlingen på leseren.";
        }
        throw new Error(userMessage);
    }
    
    // This is a simplification. A real implementation would connect to a WebSocket 
    // using a URL from the response to get real-time updates.
    // Here we'll just return a simplified success state.
    const responseData = await response.json();
    
    // For now, we assume completion as we are not using WebSockets yet.
    return { status: 'completed', amount: request.amount, reference: request.reference };
}
