
'use server';

import { getFirebaseSiteSettings } from './firebase-service';
import { db } from '@/lib/firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ZETTLE_OAUTH_URL = "https://oauth.zettle.com/token";
const ZETTLE_API_URL = "https://reader-connect.zettle.com";

interface ZettleTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
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

async function getZettleTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const docRef = doc(db, "secrets", "zettle");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        const isExpired = new Date() >= new Date(data.expiresAt);

        if (isExpired) {
            console.log("Zettle token is expired. Attempting to refresh...");
            const settings = await getFirebaseSiteSettings();
            const clientId = settings.zettleClientId;
            const clientSecret = settings.zettleClientSecret;
            if (!clientId || !clientSecret) {
                console.error("Cannot refresh token: Zettle Client ID or Secret is not configured.");
                throw new Error("Zettle Client ID eller Secret mangler i konfigurasjonen.");
            }
             if (!data.refreshToken) {
                console.error("Cannot refresh token: Refresh token is missing.");
                throw new Error("Mangler refresh token. Vennligst autentiser på nytt.");
            }
            return refreshZettleToken(data.refreshToken, clientId, clientSecret);
        }
        return { accessToken: data.accessToken, refreshToken: data.refreshToken };
    }
    return { accessToken: null, refreshToken: null };
}

async function refreshZettleToken(refreshToken: string, clientId: string, clientSecret: string): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    try {
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
        });

        const response = await fetch(ZETTLE_OAUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Failed to refresh Zettle token:", response.status, errorBody);
            await setDoc(doc(db, "secrets", "zettle"), { accessToken: null, refreshToken: null, expiresAt: null }, { merge: true });
            throw new Error(`Kunne ikke fornye Zettle-nøkkel: ${errorBody.error_description || response.statusText}`);
        }

        const data: ZettleTokenResponse = await response.json();
        await saveZettleTokens(data.access_token, data.refresh_token || refreshToken, data.expires_in);
        console.log("Successfully refreshed Zettle token.");
        return { accessToken: data.access_token, refreshToken: data.refresh_token || refreshToken };
    } catch (error) {
        console.error("Error in refreshZettleToken:", error);
        throw error;
    }
}


async function saveZettleTokens(accessToken: string, refreshToken: string | undefined, expiresIn: number): Promise<void> {
    const docRef = doc(db, "secrets", "zettle");
    const now = new Date();
    const expiryDate = new Date(now.getTime() + expiresIn * 1000);

    const tokenData: any = {
        accessToken,
        expiresAt: expiryDate.toISOString(),
    };

    if (refreshToken) {
        tokenData.refreshToken = refreshToken;
    }

    await setDoc(docRef, tokenData, { merge: true });
}

export async function getLinkedReaders(): Promise<ZettleLink[]> {
    try {
        const { accessToken } = await getZettleTokens();
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
        throw error;
    }
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
        throw new Error(`Kunne ikke koble til leser. Status: ${response.status}. ${errorText}`);
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
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        throw new Error("Kunne ikke koble fra leser.");
    }
}

export async function initiateZettlePayment(request: PaymentRequest): Promise<PaymentResponse> {
    const { accessToken } = await getZettleTokens();
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
    
    return { status: 'completed', amount: request.amount, reference: request.reference };
}
