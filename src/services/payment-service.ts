
'use server';

import { getFirebaseSiteSettings } from './firebase-service';
import { db } from '@/lib/firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ZETTLE_OAUTH_URL = "https://oauth.zettle.com/token";

interface ZettleTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token: string;
}

/**
 * Exchanges an authorization code from Zettle for a long-lived access and refresh token
 * using the PKCE flow.
 * @param code The temporary authorization code received from Zettle.
 * @param codeVerifier The original code verifier used to generate the code challenge.
 * @returns A boolean indicating if the token exchange was successful.
 */
export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<boolean> {
    try {
        const settings = await getFirebaseSiteSettings();
        const clientId = settings.zettleClientId;

        if (!clientId) {
            console.error("Zettle Client ID is not configured.");
            throw new Error("Zettle Client ID is not configured.");
        }
        
        const redirectUri = process.env.NEXT_PUBLIC_ZETTLE_REDIRECT_URI || 'https://forerportal-azgs.br-dev.site/admin/zettle/callback';
        
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: clientId,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
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
        
        const tokenDocRef = doc(db, "secrets", "zettle");
        const now = new Date();
        const expiryDate = new Date(now.getTime() + data.expires_in * 1000);

        await setDoc(tokenDocRef, {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: expiryDate.toISOString(),
        }, { merge: true });

        console.log("Successfully exchanged code for Zettle tokens using PKCE.");
        return true;

    } catch (error) {
        console.error("Error in exchangeCodeForToken:", error);
        return false;
    }
}

