import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This configuration is for server-side operations (Admin SDK).
// It will attempt to use Application Default Credentials, which are automatically
// available in Google Cloud environments like App Hosting and Cloud Workstations.
if (!getApps().length) {
    try {
        admin.initializeApp({
            // The projectId and storageBucket should ideally be automatically
            // discovered from the environment, but we specify them for robustness.
            projectId: 'varnacheck',
            storageBucket: 'varnacheck.appspot.com',
        });
    } catch (error: any) {
        console.error("Firebase Admin SDK Initialization Error:", error.message);
        // Provide a more helpful error message for local development.
        if (error.code === 'auth/credential-not-found') {
            throw new Error(
                'Could not find default credentials. If you are running locally, ' +
                'set up Application Default Credentials by running ' +
                '`gcloud auth application-default login` in your terminal. ' +
                'See https://firebase.google.com/docs/admin/setup#initialize-sdk'
            );
        }
        throw new Error(`Failed to initialize Firebase Admin SDK. Original error: ${error.message}`);
    }
}

export const authAdmin = admin.auth();
// Explicitly get the bucket to ensure it's available.
export const storageAdmin = admin.storage().bucket('varnacheck.appspot.com');
