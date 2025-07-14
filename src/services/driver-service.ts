
'use server';

import { 
    getFirebaseDrivers, 
    addFirebaseDriver, 
    updateFirebaseDriver,
    getFirebaseDriverById,
    getFirebaseDriverByRfid,
    deleteFirebaseDriver,
    getFirebaseDriversByAuthUid,
    getAnyFirebaseDriverByAuthUid,
} from './firebase-service';
import type { Driver } from '@/lib/types';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '@/lib/firebase-config';
import { normalizeRfid } from '@/lib/utils';
import { authAdmin } from '@/lib/firebase-admin-config';

export async function getDrivers(): Promise<Driver[]> {
    return getFirebaseDrivers();
}

export async function getDriverById(id: string): Promise<Driver | null> {
    return getFirebaseDriverById(id);
}

export async function getDriverByRfid(rfid: string): Promise<Driver | null> {
    return getFirebaseDriverByRfid(rfid);
}

export async function getDriversByAuthUid(authUid: string): Promise<Driver[]> {
    return getFirebaseDriversByAuthUid(authUid);
}


export async function addDriver(driver: Driver): Promise<void> {
    const newDriver = await addFirebaseDriver(driver);
    return;
}

export async function updateDriver(driver: Driver): Promise<void> {
    return updateFirebaseDriver(driver);
}

export async function deleteDriver(id: string): Promise<void> {
    // Note: this doesn't delete the auth user, which is correct
    // in a sibling scenario. Deleting auth users would need a separate process.
    return deleteFirebaseDriver(id);
}

export async function createDriverAndUser(driverData: Omit<Driver, 'id' | 'authUid' | 'role'>): Promise<Driver> {
    if (!driverData.email) {
        throw new Error("E-post er påkrevd for å opprette en ny fører.");
    }
    if (!authAdmin) {
        throw new Error("Auth Admin SDK er ikke initialisert. Kan ikke opprette bruker.");
    }

    let authUid: string;
    let userExists = true;

    // 1. Check if a user with this email already exists in Firebase Auth
    try {
        const userRecord = await authAdmin.getUserByEmail(driverData.email);
        authUid = userRecord.uid;
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            userExists = false;
        } else {
            // Rethrow other errors
            throw error;
        }
    }
    
    // 2. If the user does not exist, create them in Firebase Auth
    if (!userExists) {
        // We must use a temporary client-side auth instance to create a user,
        // as the Admin SDK can't create users with email/password directly
        // without more complex flows.
        const tempAppName = `temp-user-creation-${crypto.randomUUID()}`;
        const tempApp = initializeApp(firebaseConfig, tempAppName);
        const tempAuth = getAuth(tempApp);

        try {
            const password = driverData.email; // Default password
            const userCredential = await createUserWithEmailAndPassword(tempAuth, driverData.email, password);
            authUid = userCredential.user.uid;
        } catch(e: any) {
            console.error("Error creating auth user in temp app", e);
            throw e;
        } finally {
            await deleteApp(tempApp);
        }
    }

    // 3. Now, create the new driver profile in Firestore.
    // This will get its own unique Firestore document ID.
    const newDriverProfile: Omit<Driver, 'id'> = {
        ...driverData,
        authUid: authUid!,
        role: 'driver',
        rfid: normalizeRfid(driverData.rfid),
    };

    try {
        const createdDriver = await addFirebaseDriver(newDriverProfile);
        return createdDriver;
    } catch (error) {
        console.error("Error creating Firestore driver profile:", error);
        // If Firestore creation fails, we should ideally delete the auth user if we just created them.
        // This is complex and left out for now, but a production system might need this.
        throw new Error("Kunne ikke lagre førerprofilen i databasen.");
    }
}
