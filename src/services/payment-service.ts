
"use server";

import { v4 as uuidv4 } from 'uuid';

const ZETTLE_API_URL = "https://pusher.zettle.com";
const ZETTLE_OAUTH_URL = "https://oauth.zettle.com/token";

// MERK: Denne filen vil bli bygget om for å bruke OAuth2 Code Grant med PKCE,
// som er den korrekte metoden for "Reader Connect API".
// Den gamle "Assertion Grant"-flyten som var her tidligere er fjernet.

export interface ZettlePairingResponse {
    status: 'generated' | 'completed' | 'failed';
    pairingCode?: string;
    linkId?: string;
    webSocketUrl?: string;
}

export async function initiateZettlePairing(): Promise<ZettlePairingResponse> {
    // TODO: Implementer OAuth2-flyt for å hente access token.
    // Dette er en placeholder inntil den nye autentiseringsmetoden er på plass.
    console.error("initiateZettlePairing er ikke implementert med den nye OAuth-flyten enda.");
    throw new Error("Paring med Zettle er under ombygging til korrekt autentiseringsmetode.");
}
