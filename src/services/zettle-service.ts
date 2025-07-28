
'use server';

import { getFirebaseSiteSettings } from './firebase-service';
import { db } from '@/lib/firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ZETTLE_OAUTH_URL = "https://oauth.zettle.com/token";
const ZETTLE_READER_API_URL = "https://reader-connect.zettle.com";

interface ZettleTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
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

// Function to exchange the authorization code for tokens using PKCE
export async function exchangeCodeForTokens(code: string, codeVerifier: string, redirectUri: string) {
    const settings = await getFirebaseSiteSettings();
    const clientId = settings.zettleClientId;

    if (!clientId) {
        throw new Error("Zettle Client ID is not configured.");
    }
    
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
    });
    
    const response = await fetch(ZETTLE_OAUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error("Failed to exchange code for tokens:", response.status, errorBody);
        throw new Error(`Kunne ikke veksle autorisasjonskode mot en permanent nøkkel: ${errorBody.error_description || response.statusText}`);
    }

    const data: ZettleTokenResponse = await response.json();
    
    // Save the new tokens and their expiry
    const now = new Date();
    const expiryDate = new Date(now.getTime() + data.expires_in * 1000);
    
    const tokenDocRef = doc(db, "secrets", "zettle");
    await setDoc(tokenDocRef, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: expiryDate.toISOString(),
    });
    
    console.log("Successfully exchanged code for tokens and saved them.");
    return { success: true };
}


async function getZettleAccessToken(): Promise<string | null> {
    const tokenDocRef = doc(db, "secrets", "zettle");
    const tokenDocSnap = await getDoc(tokenDocRef);

    if (!tokenDocSnap.exists()) {
        console.log("No Zettle token found in database.");
        return null;
    }

    const tokenData = tokenDocSnap.data();
    const isExpired = new Date() >= new Date(tokenData.expiresAt);

    if (!isExpired) {
        return tokenData.accessToken;
    }

    // Token is expired, use refresh token to get a new one
    console.log("Zettle access token expired. Refreshing...");
    const settings = await getFirebaseSiteSettings();
    const clientId = settings.zettleClientId;

    if (!clientId) {
        throw new Error("Zettle Client ID is not configured.");
    }
     if (!tokenData.refreshToken) {
        throw new Error("Refresh token is missing. Please re-authenticate.");
    }

    try {
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: tokenData.refreshToken,
            client_id: clientId,
        });

        const response = await fetch(ZETTLE_OAUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Failed to refresh Zettle access token:", response.status, errorBody);
            // This might happen if refresh token is revoked. Clear the stored tokens.
            await setDoc(tokenDocRef, {});
            throw new Error(`Kunne ikke fornye Zettle-nøkkel: ${errorBody.error_description || response.statusText}. Vennligst koble til på nytt.`);
        }

        const data: ZettleTokenResponse = await response.json();
        
        const now = new Date();
        const expiryDate = new Date(now.getTime() + data.expires_in * 1000);
        await setDoc(tokenDocRef, {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: expiryDate.toISOString(),
        });
        
        console.log("Successfully refreshed and saved new Zettle tokens.");
        return data.access_token;

    } catch (error) {
        console.error("Error in getZettleAccessToken (refresh flow):", error);
        throw error;
    }
}


export async function getLinkedReaders(): Promise<ZettleLink[]> {
    try {
        const accessToken = await getZettleAccessToken();
        if (!accessToken) {
             console.log("Not authenticated with Zettle, cannot fetch readers.");
             return [];
        }

        const response = await fetch(`${ZETTLE_READER_API_URL}/v1/links`, {
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
        return [];
    }
}

export async function deleteLink(linkId: string): Promise<void> {
    const accessToken = await getZettleAccessToken();
    if (!accessToken) {
        throw new Error("Ikke autentisert med Zettle.");
    }

    const response = await fetch(`${ZETTLE_READER_API_URL}/v1/links/${linkId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        throw new Error("Kunne ikke koble fra leser.");
    }
}

    