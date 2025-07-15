
'use server';

import { authAdmin } from '@/lib/firebase-admin-config';

export async function createFirebaseUser(email: string, password?: string) {
    if (!authAdmin) {
        throw new Error("Firebase Admin Auth is not initialized.");
    }

    try {
        const userRecord = await authAdmin.createUser({
            email: email,
            password: password || email, // Use email as password if not provided
            emailVerified: true,
        });
        return userRecord;
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            throw new Error('En bruker med denne e-posten finnes allerede.');
        }
        console.error("Error creating user with Admin SDK:", error);
        throw new Error('Kunne ikke opprette ny bruker.');
    }
}
