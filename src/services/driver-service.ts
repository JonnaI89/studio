
'use server';

import { 
    getFirebaseDrivers, 
    addFirebaseDriver, 
    updateFirebaseDriver,
    getFirebaseDriverById,
    getFirebaseDriverByRfid,
    deleteFirebaseDriver,
    getFirebaseDriversByEmail
} from './firebase-service';
import type { Driver } from '@/lib/types';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, type User as FirebaseAuthUser } from 'firebase/auth';
import { firebaseConfig } from '@/lib/firebase-config';
import { normalizeRfid } from '@/lib/utils';

// This is the main service file for the application.
// It uses Firebase as the data source. All components should use these functions.

export async function getDrivers(): Promise<Driver[]> {
    return getFirebaseDrivers();
}

export async function getDriverById(id: string): Promise<Driver | null> {
    return getFirebaseDriverById(id);
}

export async function getDriverByRfid(rfid: string): Promise<Driver | null> {
    return getFirebaseDriverByRfid(rfid);
}

export async function getDriversByEmail(email: string): Promise<Driver[]> {
    return getFirebaseDriversByEmail(email);
}


export async function addDriver(driver: Driver): Promise<void> {
    return addFirebaseDriver(driver);
}

export async function updateDriver(driver: Driver): Promise<void> {
    return updateFirebaseDriver(driver);
}

export async function deleteDriver(id: string): Promise<void> {
    return deleteFirebaseDriver(id);
}

export async function createDriverAndUser(driverData: Omit<Driver, 'id' | 'role'>): Promise<Driver> {
    if (!driverData.email) {
        throw new Error("E-post er påkrevd for å opprette en ny fører.");
    }

    const tempAppName = `temp-user-creation-${crypto.randomUUID()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    let authUid: string;

    try {
        const existingUsers = await getDriversByEmail(driverData.email);
        
        if (existingUsers.length > 0) {
            // An auth user with this email already exists, reuse their UID.
            // All siblings will share the same Auth UID, but have different document IDs.
            // We can get the auth UID from any of the existing profiles.
            authUid = existingUsers[0].id;
        } else {
            // No user with this email exists, create a new Firebase Auth user.
            const password = driverData.email; // Default password
            const userCredential = await createUserWithEmailAndPassword(tempAuth, driverData.email, password);
            authUid = userCredential.user.uid;
        }

        // We now have an auth UID (either new or existing).
        // Create the new driver profile in Firestore.
        // It's crucial that this new driver gets its *own* unique document ID.
        // The driver's `id` field will store the *auth* UID for linking purposes.
        const newDriverProfile: Omit<Driver, 'id'> & { id: string } = {
            ...driverData,
            id: authUid, // The shared Auth UID
            role: 'driver',
            rfid: normalizeRfid(driverData.rfid),
        };

        // Let Firestore generate a unique ID for the document itself.
        const createdDriver = await addFirebaseDriver(newDriverProfile);
        return createdDriver;

    } catch (error: any) {
        console.error("User creation/linking error: ", error);
        // We handle specific auth errors that might occur during the creation step.
        if (error.code === 'auth/invalid-email') {
            throw new Error("E-postadressen er ugyldig.");
        }
        if (error.code === 'auth/weak-password') {
            throw new Error("Passordet er for svakt. Det må være minst seks tegn. Passordet settes lik e-posten.");
        }
        // This error shouldn't happen with the new logic, but is kept for safety.
        if (error.code === 'auth/email-already-in-use') {
             throw new Error("E-post er i bruk, men kunne ikke finne tilknyttet førerprofil. Prøv igjen, eller kontakt admin.");
        }
        throw new Error("En ukjent feil oppstod under opprettelse av ny fører.");
    } finally {
        await deleteApp(tempApp);
    }
}
