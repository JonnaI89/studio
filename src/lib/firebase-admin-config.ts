
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This configuration is for server-side operations (Admin SDK).
// It now uses Application Default Credentials by calling initializeApp() with no arguments.
// This is the standard and most reliable way to authenticate in a Google Cloud environment like Firebase Studio.
if (!getApps().length) {
    admin.initializeApp();
}

const storageBucketName = `varnacheck.appspot.com`;

export const authAdmin = admin.auth();
export const storageAdmin = admin.storage().bucket(storageBucketName);
