"use server";

import { v4 as uuidv4 } from 'uuid';
import { getSiteSettings } from './settings-service';

// In a real application, these would be securely stored and managed.
const ZETTLE_API_URL = "https://reader-connect.zettle.com";

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
    // In a real implementation, you would fetch a token and cache it.
    // The actual flow involves a POST to https://oauth.zettle.com/token
    // with grant_type=client_credentials and your client_id/api_key.
    const clientId = process.env.ZETTLE_CLIENT_ID;
    const apiKey = process.env.ZETTLE_API_KEY;

    if (!clientId || !apiKey) {
        console.warn("ZETTLE_CLIENT_ID or ZETTLE_API_KEY is not set. Payment will likely fail.");
        // This will cause the fetch to fail, which is appropriate.
        // Returning a mock token would hide the configuration error.
        throw new Error("Mangler Zettle API-nøkler. Sjekk serverkonfigurasjonen.");
    }
    
    // This is a placeholder for the actual OAuth token exchange.
    // You would use `fetch` here to call the Zettle token endpoint.
    // For now, let's assume this works and we get a token.
    return "production-access-token-from-real-api-call";
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
