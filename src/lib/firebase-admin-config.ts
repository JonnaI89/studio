
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin';

// This configuration is for server-side operations (Admin SDK).
// It now requires explicit environment variables for credentials to avoid
// issues with Application Default Credentials in some environments.
if (!getApps().length) {
    try {
        const serviceAccount: ServiceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID!,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
            privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        };

        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
            throw new Error("Firebase Admin credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not set in environment variables. Please check your .env.local file.");
        }
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: `${serviceAccount.projectId}.appspot.com`,
        });

    } catch (error: any) {
        console.error("Firebase Admin SDK Initialization Error:", error);
        throw new Error(`Failed to initialize Firebase Admin SDK. Please ensure your environment variables (FIREBASE_PROJECT_ID, etc.) are correct. Original error: ${error.message}`);
    }
}

const storageBucketName = `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;

export const authAdmin = admin.auth();
export const storageAdmin = admin.storage().bucket(storageBucketName);
