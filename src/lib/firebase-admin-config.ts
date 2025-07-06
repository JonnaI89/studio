import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This configuration reuses the service account credentials provided for Google Sheets,
// ensuring the Admin SDK has the necessary permissions to create users,
// especially during local development.

const serviceAccount = {
  // The project ID from your client-side Firebase config
  project_id: "varnacheck",
  // The credentials from environment variables, using snake_case as required by the Admin SDK
  client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Check if the necessary credentials are provided in the environment.
const hasCredentials = serviceAccount.client_email && serviceAccount.private_key;
const storageBucket = "varnacheck.appspot.com"; // From firebase-config.ts

if (!getApps().length) {
  if (hasCredentials) {
    // If credentials are provided, initialize with them.
    // This is for local development.
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: storageBucket,
    });
  } else {
    // If no credentials are provided, initialize without arguments.
    // This is for managed environments like Firebase App Hosting or Cloud Functions,
    // where credentials are automatically discovered.
    admin.initializeApp({
      storageBucket: storageBucket,
    });
  }
}

export const authAdmin = admin.auth();
export const storageAdmin = admin.storage().bucket(storageBucket);
