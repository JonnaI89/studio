
'use server';

import { 
    getFirebaseDrivers, 
    addFirebaseDriver, 
    updateFirebaseDriver,
    getFirebaseDriverById,
    getFirebaseDriverByRfid,
    deleteFirebaseDriver,
    getFirebaseDriverByEmail,
    getFirebaseDriversByAuthUid
} from './firebase-service';
import { authAdmin } from '@/lib/firebase-admin-config';
import type { Driver } from '@/lib/types';
import { normalizeRfid } from '@/lib/utils';


export async function getDrivers(): Promise<Driver[]> {
    return getFirebaseDrivers();
}

export async function getDriversByAuthUid(authUid: string): Promise<Driver[]> {
    return getFirebaseDriversByAuthUid(authUid);
}


export async function getDriverById(id: string): Promise<Driver | null> {
    return getFirebaseDriverById(id);
}

export async function getDriverByRfid(rfid: string): Promise<Driver | null> {
    return getFirebaseDriverByRfid(rfid);
}

export async function updateDriver(driver: Driver): Promise<void> {
    return updateFirebaseDriver(driver);
}

export async function deleteDriver(id: string): Promise<void> {
    return deleteFirebaseDriver(id);
}

export async function createDriverAndUser(driverData: Omit<Driver, 'id' | 'role' | 'authUid'>): Promise<Driver> {
    if (!driverData.email) {
        throw new Error("E-post er påkrevd for å opprette en ny fører.");
    }
    if (!authAdmin) {
        throw new Error("Firebase Admin SDK er ikke initialisert. Handlingen kan ikke fullføres.");
    }

    const email = driverData.email;
    const password = driverData.email;
    
    let authUid: string;
    let existingUser = null;

    try {
        existingUser = await authAdmin.getUserByEmail(email);
        authUid = existingUser.uid;
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            // User does not exist, create a new one
            const newUserRecord = await authAdmin.createUser({
                email: email,
                emailVerified: false,
                password: password,
            });
            authUid = newUserRecord.uid;
        } else {
            // Some other error occurred
            console.error("Error fetching user by email:", error);
            throw new Error("En feil oppstod ved verifisering av bruker.");
        }
    }
    
    // Nå har vi en authUid, enten fra en eksisterende eller ny bruker.
    // Opprett førerprofilen i databasen.
    const newDriverProfile: Omit<Driver, 'id'> = {
        ...driverData,
        authUid: authUid,
        role: 'driver',
        rfid: normalizeRfid(driverData.rfid),
    };

    const newDriverId = await addFirebaseDriver(newDriverProfile);

    return {
        ...newDriverProfile,
        id: newDriverId,
    };
}

