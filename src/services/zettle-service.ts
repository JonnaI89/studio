
"use server";

import { v4 as uuidv4 } from 'uuid';

const ZETTLE_API_URL = "https://pusher.zettle.com";
const ZETTLE_OAUTH_URL = "https://oauth.zettle.com/token";

interface ZettlePaymentLinkRequest {
    amount: number; // in cents/øre
    referenceNumber: string;
    redirectUrl: string;
}

interface ZettlePaymentLinkResponse {
    id: string;
    url: string;
    qrCode: string;
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
            }),
            cache: 'no-store' // Important to prevent caching of the token request
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

export async function createZettlePaymentLink(requestData: { amount: number; reference: string; }): Promise<{ url: string; qrCode: string; }> {
    const accessToken = await getZettleAccessToken();

    const payload: ZettlePaymentLinkRequest = {
        amount: requestData.amount,
        referenceNumber: requestData.reference,
        redirectUrl: "https://kartpass.no/payment-complete" // A placeholder confirmation page
    }

    try {
        const response = await fetch(`${ZETTLE_API_URL}/v2/payment-links`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-Idempotency-Key': uuidv4(),
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Zettle API Error (Payment Link):", response.status, errorBody);
            throw new Error(`Feil fra Zettle API: ${response.statusText}. Sjekk server-logger.`);
        }

        const data: ZettlePaymentLinkResponse = await response.json();

        return {
            url: data.url,
            qrCode: data.qrCode
        };

    } catch (error) {
        console.error("Failed to create Zettle payment link:", error);
        if (error instanceof Error) {
            throw error; // Re-throw known errors
        }
        throw new Error("Kunne ikke opprette betalingslenke med Zettle. Sjekk server-logger.");
    }
}
