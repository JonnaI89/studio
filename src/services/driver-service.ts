
'use server';

import { 
    getFirebaseDrivers, 
    addFirebaseDriver, 
    updateFirebaseDriver,
    getFirebaseDriverById,
    getFirebaseDriverByRfid,
    deleteFirebaseDriver,
    checkIfDriverExistsByEmail
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
     if (!authAdmin) {
        throw new Error("Auth Admin SDK er ikke initialisert. Kan ikke opprette bruker.");
    }

    const email = driverData.email;
    const password = driverData.email;

    // Sjekk om en fører med denne e-posten allerede eksisterer
    const emailExists = await checkIfDriverExistsByEmail(email);
    if (emailExists) {
        throw new Error(`En bruker med e-posten ${email} finnes allerede. E-post må være unik.`);
    }

    let newUserRecord;
    try {
         newUserRecord = await authAdmin.createUser({
            email: email,
            password: password,
            emailVerified: true,
            displayName: driverData.name,
        });
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            throw new Error(`En bruker med e-posten ${email} finnes allerede i systemet.`);
        }
        console.error("Error creating auth user:", error);
        throw new Error(`En feil oppsto under opprettelse av bruker: ${error.message}`);
    }
   

    const newDriverProfile: Driver = {
        ...driverData,
        id: newUserRecord.uid, // Kobler fører-ID direkte til Auth-ID
        role: 'driver',
        rfid: normalizeRfid(driverData.rfid),
    };

    try {
        await addFirebaseDriver(newDriverProfile);
        return newDriverProfile;
    } catch (error) {
        await authAdmin.deleteUser(newUserRecord.uid);
        console.error("Error creating Firestore driver profile:", error);
        throw new Error("Kunne ikke lagre førerprofilen i databasen. Auth-brukeren ble rullet tilbake.");
    }
}
