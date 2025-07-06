'use server';

import { authAdmin } from '@/lib/firebase-admin-config';

// The return type should be a plain object, as complex objects like UserRecord
// might not serialize correctly across the server-client boundary.
interface NewUserResponse {
  uid: string;
}

export async function createAuthUser(email: string, password: string): Promise<NewUserResponse> {
  try {
    const userRecord = await authAdmin.createUser({
      email: email,
      password: password,
      emailVerified: true, // Since an admin is creating it, we can mark it as verified.
    });
    return { uid: userRecord.uid };
  } catch (error: any) {
    console.error("Error creating user with Admin SDK:", error);
    
    if (error.code === 'auth/email-already-exists') {
        throw new Error('En bruker med denne e-postadressen finnes allerede.');
    }
    if (error.code === 'auth/invalid-password') {
        throw new Error('Passordet må være på minst 6 tegn.');
    }
    throw new Error('Kunne ikke opprette en ny autentisert bruker.');
  }
}
