import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

if (!getApps().length) {
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
        throw new Error(
            'FATAL: Missing Google Service Account credentials in .env.local. ' +
            'Please ensure GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY are set correctly.'
        );
    }
    
    // The private key from a .env file often has its newlines escaped as "\\n".
    // We need to replace these with actual newline characters "\n".
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    const serviceAccount = {
      project_id: "varnacheck",
      client_email: clientEmail,
      private_key: formattedPrivateKey,
    };

    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
            storageBucket: 'varnacheck.appspot.com',
        });
    } catch (error: any) {
        // Add more detailed error logging to help debug credential issues
        console.error("Firebase Admin SDK Initialization Error:", error.message);
        throw new Error(`Failed to initialize Firebase Admin SDK. Check your credentials. Original error: ${error.message}`);
    }
}

export const authAdmin = admin.auth();
export const storageAdmin = admin.storage().bucket('varnacheck.appspot.com');
