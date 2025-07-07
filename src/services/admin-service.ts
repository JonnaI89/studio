
'use server';

import { authAdmin } from '@/lib/firebase-admin-config';
import admin from 'firebase-admin';

// The return type should be a plain object, as complex objects like UserRecord
// might not serialize correctly across the server-client boundary.
interface NewUserResponse {
  uid: string;
}

export async function createAuthUser(email: string, password: string): Promise<NewUserResponse> {
  if (!authAdmin) {
     throw new Error("Firebase Admin SDK er ikke initialisert. Sjekk serverloggene for feil under oppstart og verifiser miljøvariablene.");
  }

  try {
    const userRecord = await authAdmin.createUser({
      email: email,
      password: password,
      emailVerified: true, // Since an admin is creating it, we can mark it as verified.
    });
    return { uid: userRecord.uid };
  } catch (error: any) {
    console.error("Error creating user with Admin SDK:", error);
    
    switch (error.code) {
        case 'auth/email-already-exists':
            throw new Error('En bruker med denne e-postadressen finnes allerede.');
        case 'auth/invalid-password':
            throw new Error('Passordet må være på minst 6 tegn.');
        case 'auth/invalid-email':
            throw new Error('E-postadressen er ugyldig.');
        case 'auth/internal-error':
            throw new Error('En intern feil i Firebase-autentisering oppsto. Dette kan skyldes feilkonfigurerte legitimasjonsbeskrivelser.');
        default:
             // Include the original error code for better debugging if it's something unexpected.
            throw new Error(`Kunne ikke opprette en ny autentisert bruker. Feilkode: ${error.code || 'UKJENT'}`);
    }
  }
}
