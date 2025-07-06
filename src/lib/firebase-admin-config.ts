import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// In a managed environment like Firebase App Hosting or Cloud Functions,
// initializeApp() can be called without arguments. It will automatically
// discover the service account credentials from the environment.
if (!getApps().length) {
  admin.initializeApp();
}

export const authAdmin = admin.auth();
