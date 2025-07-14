"use server";

import { v4 as uuidv4 } from 'uuid';
import { getSiteSettings } from './settings-service';

// In a real application, these would be securely stored and managed.
const ZETTLE_API_URL = "https://reader-connect.zettle.com";
const ZETTLE_OAUTH_URL = "https://oauth.zettle.com/token";

interface ZettlePaymentRequest {
    amount: number; // in cents/øre
    reference: string;
    linkId: string;
}

interface ZettlePaymentResponse {
    paymentId: string;
    websocketUrl: string;
    status: string;
}

async function getZettleAccessToken(): Promise<string> {
    const clientId = process.env.ZETTLE_CLIENT_ID;
    const userAssertionToken = process.env.ZETTLE_USER_ASSERTION_TOKEN;

    if (!clientId || !userAssertionToken) {
        console.error("ZETTLE_CLIENT_ID or ZETTLE_USER_ASSERTION_TOKEN is not set in environment variables.");
        throw new Error("Mangler Zettle API-nøkler eller bruker-token. Sjekk serverkonfigurasjonen.");
    }

    try {
        const response = await fetch(ZETTLE_OAUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'client_id': clientId,
                'assertion': userAssertionToken
            })
        });
        
        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Zettle OAuth Error:", response.status, errorBody);
            throw new Error(`Feil ved henting av Zettle-token: ${errorBody.error_description || response.statusText}`);
        }

        const tokenData = await response.json();
        return tokenData.access_token;

    } catch (error) {
        console.error("Error fetching Zettle access token:", error);
        throw error;
    }
}

export async function createZettlePayment(requestData: { amount: number; reference: string; }): Promise<ZettlePaymentResponse> {
    const settings = await getSiteSettings();
    if (!settings.zettleLinkId) {
        throw new Error("Zettle Terminal ID (Link ID) er ikke satt i nettstedinnstillingene.");
    }

    const request: ZettlePaymentRequest = {
        ...requestData,
        linkId: settings.zettleLinkId,
    };
    
    const accessToken = await getZettleAccessToken();
    const idempotencyKey = uuidv4();

    try {
        const response = await fetch(`${ZETTLE_API_URL}/v1/links/${request.linkId}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify({
                amount: request.amount,
                reference: request.reference,
                // The channel ensures this POS session only gets updates for this payment.
                channel: uuidv4(), 
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Zettle API Error:", response.status, errorBody);
            throw new Error(`Feil fra Zettle API: ${response.statusText}. Sjekk server-logger.`);
        }

        const data = await response.json();

        return {
            paymentId: data.id,
            websocketUrl: data.url,
            status: data.status,
        };

    } catch (error) {
        console.error("Failed to create Zettle payment link:", error);
        if (error instanceof Error) {
            throw error; // Re-throw known errors
        }
        throw new Error("Kunne ikke opprette betalingslenke med Zettle. Sjekk server-logger.");
    }
}
