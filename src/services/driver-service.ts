
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

    let authUser: { uid: string };

    try {
        const existingDriversWithEmail = await getFirebaseDriversByEmail(driverData.email);

        if (existingDriversWithEmail.length > 0) {
            authUser = { uid: existingDriversWithEmail[0].id };
        } else {
            const password = driverData.email;
            const userCredential = await createUserWithEmailAndPassword(tempAuth, driverData.email, password);
            authUser = userCredential.user;
        }

        const newDriverProfile: Driver = {
            ...driverData,
            id: authUser.uid,
            role: 'driver',
            rfid: normalizeRfid(driverData.rfid),
        };

        await addDriver(newDriverProfile);

        return newDriverProfile;

    } catch (error: any) {
        console.error("User creation/linking error: ", error);
        if (error.code === 'auth/email-already-in-use') {
             // This is not a fatal error in our new flow. We can proceed.
             // We need to fetch the user's UID to proceed.
             const existingDrivers = await getFirebaseDriversByEmail(driverData.email);
             if (existingDrivers.length > 0) {
                 authUser = { uid: existingDrivers[0].id };
                 const newDriverProfile: Driver = {
                    ...driverData,
                    id: authUser.uid, 
                    role: 'driver',
                    rfid: normalizeRfid(driverData.rfid),
                };
                // We must create a new document with a NEW ID for the sibling
                const siblingDocId = crypto.randomUUID();
                const siblingProfile = {...newDriverProfile, id: siblingDocId};

                // The ID of the driver doc is NOT the same as the auth UID in this case.
                await addFirebaseDriver(siblingProfile);

                return siblingProfile;
             } else {
                 throw new Error("E-post er i bruk, men kunne ikke finne tilknyttet førerprofil.");
             }
        }
        if (error.code === 'auth/invalid-email') {
            throw new Error("E-postadressen er ugyldig.");
        }
        if (error.code === 'auth/weak-password') {
            throw new Error("Passordet er for svakt. Det må være minst seks tegn. Passordet settes lik e-posten.");
        }
        throw new Error("En ukjent feil oppstod under opprettelse av ny fører.");
    } finally {
        await deleteApp(tempApp);
    }
}
