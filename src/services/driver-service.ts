'use server';

import { 
    getFirebaseDrivers, 
    addFirebaseDriver, 
    updateFirebaseDriver,
    getFirebaseDriverById,
    getFirebaseDriverByRfid,
    deleteFirebaseDriver,
    getFirebaseDriversByAuthUid
} from './firebase-service';
import { signUp, signIn } from './auth-service';
import type { Driver } from '@/lib/types';
import { normalizeRfid } from '@/lib/utils';
import { User } from 'firebase/auth';


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

export async function createDriverAndUser(driverData: Omit<Driver, 'id' | 'role'>): Promise<Driver> {
    if (!driverData.email) {
        throw new Error("E-post er påkrevd for å opprette en ny fører.");
    }

    let user: User;

    try {
        // Attempt to sign up the new user
        user = await signUp(driverData.email, driverData.email);
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            // If the user already exists, sign in to get the user object (and thus the UID)
            try {
                user = await signIn(driverData.email, driverData.email);
            } catch (signInError: any) {
                 // This might happen if the password was changed.
                 console.error("Sign-in failed for existing user during new driver creation:", signInError);
                 throw new Error("En bruker med denne e-posten finnes, men innlogging med e-post som passord feilet. Passordet kan være endret.");
            }
        } else {
            // For any other sign-up error, re-throw it.
            console.error("Error creating user and driver:", error);
            throw new Error("En feil oppstod under opprettelse av ny fører.");
        }
    }
    
    // By this point, `user` should be defined, either from sign-up or sign-in.
    const newDriverProfile: Omit<Driver, 'id'> = {
        ...driverData,
        authUid: user.uid, // Add the auth UID to the profile
        role: 'driver',
        rfid: normalizeRfid(driverData.rfid),
    };

    const newDriverId = await addFirebaseDriver(newDriverProfile);
    
    return {
        ...newDriverProfile,
        id: newDriverId,
    };
}
