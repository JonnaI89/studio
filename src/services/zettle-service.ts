"use server";

// This service is obsolete and will be replaced by payment-service.ts
// It is kept for reference during the refactoring process.

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

interface ZettlePairingResponse {
    status: 'generated' | 'completed' | 'failed';
    pairingCode?: string;
    linkId?: string;
    webSocketUrl?: string;
}

async function getZettleAccessToken(): Promise<string> {
    const clientId = process.env.ZETTLE_CLIENT_ID;
    const userAssertionToken = process.env.ZETTLE_USER_ASSERTION_TOKEN;

    if (!clientId || !userAssertionToken) {
        console.error("ZETTLE_CLIENT_ID or ZETTLE_USER_ASSERTION_TOKEN is not set in environment variables.");
        throw new Error("Mangler Zettle API-nøkler eller bruker-token. Sjekk serverkonfigurasjonen.");
    }

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
    return tokenData.access_token;
}
