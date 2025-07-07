
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This configuration is for server-side operations (Admin SDK).
// It now uses explicit credentials from environment variables with strict validation.
if (!getApps().length) {
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        console.error("Firebase Admin SDK-autentiseringsfeil: Nødvendige miljøvariabler (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) mangler. Appen kan ikke utføre administrative handlinger.");
        // We don't throw an error here, but admin actions will fail later with a clear message.
    } else {
        try {
            const privateKey = serviceAccount.privateKey.replace(/\\n/g, '\n');
            
            if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
                throw new Error("FIREBASE_PRIVATE_KEY er feilformatert. Mangler '-----BEGIN PRIVATE KEY-----'.");
            }
            if (!privateKey.endsWith('-----END PRIVATE KEY-----\n') && !privateKey.endsWith('-----END PRIVATE KEY-----')) {
                 throw new Error("FIREBASE_PRIVATE_KEY er feilformatert. Mangler '-----END PRIVATE KEY-----'.");
            }

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: serviceAccount.projectId,
                    clientEmail: serviceAccount.clientEmail,
                    privateKey: privateKey,
                }),
            });
            console.log("Firebase Admin SDK initialisert med legitimasjon fra miljøvariabler.");
        } catch(error) {
             console.error("FATAL: Kunne ikke initialisere Firebase Admin SDK. Sjekk at miljøvariablene er korrekte.", error);
             // Re-throwing to make it clear initialization failed during startup.
             throw error; 
        }
    }
}

const storageBucketName = `varnacheck.appspot.com`;

export const authAdmin = admin.apps.length ? admin.auth() : null;
export const storageAdmin = admin.apps.length ? admin.storage().bucket(storageBucketName) : null;
