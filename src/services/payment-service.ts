
"use server";

import { getFirebaseSiteSettings, updateFirebaseSiteSettings } from './firebase-service';
import { db } from '@/lib/firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// This service is being rebuilt to correctly implement the Zettle Reader Connect API flow.
// The core functionality will be to handle OAuth for Zettle and manage reader links.

const ZETTLE_OAUTH_URL = "https://oauth.zettle.com/token";

interface ZettleTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token: string;
}

/**
 * Exchanges an authorization code from Zettle for a long-lived access and refresh token.
 * This is the crucial second step in the OAuth2 flow.
 * @param code The temporary authorization code received from Zettle after user login.
 * @returns A boolean indicating if the token exchange was successful.
 */
export async function exchangeCodeForToken(code: string): Promise<boolean> {
    try {
        const settings = await getFirebaseSiteSettings();
        const clientId = settings.zettleClientId;
        
        // This is a server-side secret and should be stored securely, not in client-side code.
        // For this context, we will use a hardcoded value, but in a real production environment,
        // this would come from a secure source like Google Secret Manager or environment variables.
        const clientSecret = "IZSEC3ad1f975-7fd8-463e-b641-8504d2681fec"; 

        if (!clientId || !clientSecret) {
            console.error("Zettle Client ID or Secret is not configured.");
            throw new Error("Zettle Client ID or Secret is not configured.");
        }

        const redirectUri = 'https://forerportal--varnacheck.europe-west4.hosted.app/admin/zettle/callback';

        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
        });

        const response = await fetch(ZETTLE_OAUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Zettle token exchange failed:", response.status, errorBody);
            throw new Error(`Failed to exchange code for token: ${errorBody.error_description || response.statusText}`);
        }

        const data: ZettleTokenResponse = await response.json();
        
        // Securely store the received tokens for future use.
        const tokenDocRef = doc(db, "secrets", "zettle");
        const now = new Date();
        const expiryDate = new Date(now.getTime() + data.expires_in * 1000);

        await setDoc(tokenDocRef, {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: expiryDate.toISOString(),
        }, { merge: true });

        console.log("Successfully exchanged code for Zettle tokens.");
        return true;

    } catch (error) {
        console.error("Error in exchangeCodeForToken:", error);
        return false;
    }
}
