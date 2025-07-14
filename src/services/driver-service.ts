
'use server';

import { 
    getFirebaseDrivers, 
    addFirebaseDriver, 
    updateFirebaseDriver,
    getFirebaseDriverById,
    getFirebaseDriverByRfid,
    deleteFirebaseDriver,
    getFirebaseDriversByAuthUid,
} from './firebase-service';
import type { Driver } from '@/lib/types';
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
    const email = driverData.email;
    const password = driverData.email; // Default password is the email

    try {
        // 1. Try to get user by email.
        const userRecord = await authAdmin.getUserByEmail(email);
        authUid = userRecord.uid;
        
        // 2. If user exists, reset their password to the default.
        // This ensures the parent can log in easily after adding a new sibling.
        await authAdmin.updateUser(authUid, { password });

    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            // 3. If user does not exist, create them with the default password.
            const newUserRecord = await authAdmin.createUser({
                email: email,
                password: password,
                emailVerified: false, // Or true, depending on your flow
                displayName: driverData.name,
            });
            authUid = newUserRecord.uid;
        } else {
            // Rethrow other errors (e.g., network issues, invalid email format)
            console.error("Error managing auth user:", error);
            throw new Error(`En feil oppsto under håndtering av bruker: ${error.message}`);
        }
    }
    
    // 4. Now that we have an authUid, create the new driver profile in Firestore.
    const newDriverProfile: Omit<Driver, 'id'> = {
        ...driverData,
        authUid: authUid,
        role: 'driver',
        rfid: normalizeRfid(driverData.rfid),
    };

    try {
        const createdDriver = await addFirebaseDriver(newDriverProfile);
        return createdDriver;
    } catch (error) {
        console.error("Error creating Firestore driver profile:", error);
        // If Firestore creation fails after we've potentially created an auth user,
        // it's a good idea to log this for manual cleanup if necessary.
        throw new Error("Kunne ikke lagre førerprofilen i databasen.");
    }
}
