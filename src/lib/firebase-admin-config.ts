
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This configuration is for server-side operations (Admin SDK).
// It uses Application Default Credentials, which is the standard and most
// reliable way for a server running in a Google Cloud environment to authenticate.
// It automatically finds the necessary credentials from the environment.
if (!getApps().length) {
    try {
        admin.initializeApp();
        console.log("Firebase Admin SDK initialisert med Application Default Credentials.");
    } catch (error) {
        console.error("FATAL: Kunne ikke initialisere Firebase Admin SDK. Sørg for at applikasjonen kjører i et miljø med korrekte Google Cloud-legitimasjoner.", error);
        // Throwing here will make it clear during startup if initialization fails.
        throw new Error("Kritisk feil ved initialisering av Firebase Admin SDK.");
    }
}

const storageBucketName = 'varnacheck.appspot.com';

// Ensure the app is initialized before trying to access services.
export const authAdmin = getApps().length > 0 ? admin.auth() : null;
export const storageAdmin = getApps().length > 0 ? admin.storage().bucket(storageBucketName) : null;
