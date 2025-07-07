
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin';

// This configuration is for server-side operations (Admin SDK).
// It now uses Application Default Credentials, the standard and most reliable
// way to authenticate in a Google Cloud environment like Firebase Studio.
if (!getApps().length) {
    admin.initializeApp({
        storageBucket: `varnacheck.appspot.com`,
    });
}

const storageBucketName = `varnacheck.appspot.com`;

export const authAdmin = admin.auth();
export const storageAdmin = admin.storage().bucket(storageBucketName);
