
"use server";

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

export async function createZettlePaymentLink(requestData: { amount: number; reference: string; }): Promise<{ url: string; qrCode: string; }> {
    const clientId = process.env.ZETTLE_CLIENT_ID;
    const userAssertionToken = process.env.ZETTLE_USER_ASSERTION_TOKEN;

    if (!clientId || !userAssertionToken) {
        console.error("ZETTLE_CLIENT_ID or ZETTLE_USER_ASSERTION_TOKEN is not set in environment variables.");
        throw new Error("Mangler Zettle API-nøkler eller bruker-token. Sjekk serverkonfigurasjonen.");
    }

    let accessToken = '';

    // Step 1: Get Access Token
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
        accessToken = tokenData.access_token;

    } catch (error) {
        console.error("Error fetching Zettle access token:", error);
        throw error; // Re-throw the error to be caught by the calling function
    }
    
    // Step 2: Create Payment Link using the obtained access token
    const payload: ZettlePaymentLinkRequest = {
        amount: requestData.amount,
        referenceNumber: requestData.reference,
        redirectUrl: "https://kartpass.no/payment-complete"
    }

    try {
        const linkResponse = await fetch(`${ZETTLE_API_URL}/v2/payment-links`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-Idempotency-Key': crypto.randomUUID(),
            },
            body: JSON.stringify(payload),
            cache: 'no-store'
        });

        if (!linkResponse.ok) {
            const errorBody = await linkResponse.text();
            console.error("Zettle API Error (Payment Link):", linkResponse.status, errorBody);
            throw new Error(`Feil fra Zettle API: ${linkResponse.statusText}. Sjekk server-logger.`);
        }

        const data: ZettlePaymentLinkResponse = await linkResponse.json();

        return {
            url: data.url,
            qrCode: data.qrCode
        };

    } catch (error) {
        console.error("Failed to create Zettle payment link:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Kunne ikke opprette betalingslenke med Zettle. Sjekk server-logger.");
    }
}
