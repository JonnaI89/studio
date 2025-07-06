import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This configuration reuses the service account credentials provided for Google Sheets,
// ensuring the Admin SDK has the necessary permissions to create users,
// especially during local development.

if (!getApps().length) {
    const serviceAccount = {
      // The project ID from your client-side Firebase config
      project_id: "varnacheck",
      // The credentials from environment variables, using snake_case as required by the Admin SDK
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    // This setup assumes a development environment where credentials are provided via .env.local.
    // If client_email or private_key are missing, this will now throw a clearer error instead of failing silently.
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: 'varnacheck.appspot.com',
    });
}

export const authAdmin = admin.auth();
export const storageAdmin = admin.storage().bucket('varnacheck.appspot.com');
