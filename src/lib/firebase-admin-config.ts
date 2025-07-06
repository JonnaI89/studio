'use server';

import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This configuration reuses the service account credentials provided for Google Sheets,
// ensuring the Admin SDK has the necessary permissions to create users,
// especially during local development.

const serviceAccount = {
  // The project ID from your client-side Firebase config
  projectId: "varnacheck",
  // The credentials from environment variables
  clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Check if the necessary credentials are provided in the environment.
const hasCredentials = serviceAccount.clientEmail && serviceAccount.privateKey;

if (!getApps().length) {
  if (hasCredentials) {
    // If credentials are provided, initialize with them.
    // This is typically for local development.
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // If no credentials are provided, initialize without arguments.
    // This is for managed environments like Firebase App Hosting or Cloud Functions,
    // where credentials are automatically discovered.
    admin.initializeApp();
  }
}

export const authAdmin = admin.auth();
