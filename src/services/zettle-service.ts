"use server";

import { v4 as uuidv4 } from 'uuid';

// In a real application, these would be securely stored and managed.
// For now, they are placeholders.
const ZETTLE_CLIENT_ID = process.env.ZETTLE_CLIENT_ID || "test-client-id";
const ZETTLE_API_KEY = process.env.ZETTLE_API_KEY || "test-api-key";
const ZETTLE_API_URL = "https://reader.zettle.com";

interface ZettlePaymentRequest {
    amount: number; // in cents/øre
    reference: string;
}

interface ZettlePaymentResponse {
    paymentId: string;
    websocketUrl: string;
    status: string;
}


async function getZettleAccessToken(): Promise<string> {
    // In a real implementation, you would fetch a token and cache it.
    // For this mock, we are just returning a placeholder.
    // The actual flow involves a POST to https://oauth.zettle.com/token
    // with grant_type=client_credentials and your client_id/api_key.
    if (!process.env.ZETTLE_CLIENT_ID || !process.env.ZETTLE_API_KEY) {
        console.warn("ZETTLE_CLIENT_ID or ZETTLE_API_KEY is not set. Using mock token.");
        return "mock-access-token";
    }
    
    // This is a placeholder for the actual OAuth token exchange.
    // You would use `fetch` here to call the Zettle token endpoint.
    return "production-access-token-from-real-api-call";
}


export async function createZettlePayment(request: ZettlePaymentRequest): Promise<ZettlePaymentResponse> {
    const accessToken = await getZettleAccessToken();
    const idempotencyKey = uuidv4();

    try {
        const response = await fetch(`${ZETTLE_API_URL}/v1/links`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify({
                amount: request.amount,
                reference: request.reference,
                // The channel determines how WebSocket messages are routed.
                // A unique channel per request ensures this POS session only gets updates for this payment.
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
        throw new Error("Kunne ikke opprette betalingslenke med Zettle. Sjekk server-logger.");
    }
}
