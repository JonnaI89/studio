
"use server";

import { v4 as uuidv4 } from 'uuid';

const ZETTLE_API_URL = "https://pusher.zettle.com";
const ZETTLE_OAUTH_URL = "https://oauth.zettle.com/token";

interface ZettlePushRequest {
    linkId: string;
    amount: number; // in cents/øre
    reference: string;
}

interface ZettlePushResponse {
    paymentId: string;
    webSocketUrl: string;
}

export async function initiateZettlePushPayment(requestData: ZettlePushRequest): Promise<ZettlePushResponse> {
    
    const clientId = process.env.ZETTLE_CLIENT_ID;
    const userAssertionToken = process.env.ZETTLE_USER_ASSERTION_TOKEN;

    if (!clientId || !userAssertionToken) {
        console.error("ZETTLE_CLIENT_ID or ZETTLE_USER_ASSERTION_TOKEN is not set in environment variables.");
        throw new Error("Mangler Zettle API-nøkler eller bruker-token. Sjekk serverkonfigurasjonen.");
    }
    
    try {
        const tokenResponse = await fetch(ZETTLE_OAUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'client_id': clientId,
                'assertion': userAssertionToken
            }),
            cache: 'no-store'
        });
        
        if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.json();
            console.error("Zettle OAuth Error:", tokenResponse.status, errorBody);
            throw new Error(`Feil ved henting av Zettle-token: ${errorBody.error_description || tokenResponse.statusText}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        const { linkId, amount, reference } = requestData;

        const payload = {
            amount: amount,
            referenceNumber: reference,
        };

        const pushResponse = await fetch(`${ZETTLE_API_URL}/v2/links/${linkId}/pushes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-Idempotency-Key': uuidv4(),
            },
            body: JSON.stringify(payload),
            cache: 'no-store'
        });

        if (!pushResponse.ok) {
            const errorBody = await pushResponse.text();
            console.error("Zettle API Error (Push Payment):", pushResponse.status, errorBody);
            throw new Error(`Feil fra Zettle API: ${pushResponse.statusText}. Sjekk server-logger.`);
        }

        const data: ZettlePushResponse = await pushResponse.json();

        return {
            paymentId: data.paymentId,
            webSocketUrl: data.webSocketUrl,
        };

    } catch (error) {
        console.error("Failed to initiate Zettle push payment:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Kunne ikke initiere betaling på terminal. Sjekk server-logger.");
    }
}
