
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
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
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

// This function now runs on the client and uses a temporary Firebase app instance
// to create a new user without logging out the current admin.
export async function createDriverAndUser(driverData: Omit<Driver, 'id' | 'role'>): Promise<Driver> {
    if (!driverData.email) {
        throw new Error("E-post er påkrevd for å opprette en ny fører.");
    }
    
    // Use a unique name for the temporary app instance to avoid conflicts.
    const tempAppName = `temp-user-creation-${crypto.randomUUID()}`;
    
    // Initialize the temporary secondary app.
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
        const password = driverData.email;
        
        // Before creating a new auth user, check if one already exists for this email.
        const existingDriversWithEmail = await getDriversByEmail(driverData.email);
        
        let user;

        if (existingDriversWithEmail.length > 0) {
            // An auth user for this email already exists. We can re-use their UID.
            // We find one of the existing profiles to get the auth user ID. It should be the same for all.
            const existingDriver = await getDriverById(existingDriversWithEmail[0].id);
            if (!existingDriver) throw new Error("Could not find existing driver profile to link new sibling.");
            
            // We can't get the UID directly, but we assume the ID on the profile is the UID.
            // This is a safe assumption based on our `addDriver` logic.
            user = { uid: existingDriver.id };

        } else {
            // No user exists with this email, so create a new one.
            const userCredential = await createUserWithEmailAndPassword(tempAuth, driverData.email, password);
            user = userCredential.user;
        }


        const newDriver: Driver = {
            ...driverData,
            id: user.uid,
            role: 'driver',
            rfid: normalizeRfid(driverData.rfid), // Ensure the returned object has normalized RFID
        };

        // Add the corresponding driver profile to Firestore.
        // This uses the primary Firestore instance and is allowed from the client.
        await addDriver(newDriver);

        return newDriver;

    } catch (error: any) {
        console.error("Client-side user creation error: ", error);
        if (error.code === 'auth/email-already-in-use') {
            // This case should now be handled gracefully by our check above, but we keep the catch for safety.
            throw new Error("En bruker med denne e-postadressen finnes allerede.");
        }
        if (error.code === 'auth/invalid-email') {
             throw new Error("E-postadressen er ugyldig.");
        }
        if (error.code === 'auth/weak-password') {
             throw new Error("Passordet er for svakt. Det må være minst seks tegn. Passordet settes lik e-posten.");
        }
        throw new Error("En ukjent feil oppstod under opprettelse av ny fører.");
    } finally {
        // IMPORTANT: Clean up the temporary app instance to avoid memory leaks.
        await deleteApp(tempApp);
    }
}
