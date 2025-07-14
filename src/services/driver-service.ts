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
import { signUp } from './auth-service';
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

export async function createDriverAndUser(driverData: Omit<Driver, 'id' | 'role'>): Promise<Driver> {
    if (!driverData.email) {
        throw new Error("E-post er påkrevd for å opprette en ny fører.");
    }
    
    try {
        const userCredential = await signUp(driverData.email, driverData.email);
        
        const newDriverProfile: Omit<Driver, 'id'> = {
            ...driverData,
            role: 'driver',
            rfid: normalizeRfid(driverData.rfid),
        };

        const newDriverId = await addFirebaseDriver(newDriverProfile, userCredential.user.uid);
        
        return {
            ...newDriverProfile,
            id: newDriverId,
        };

    } catch (error: any) {
        console.error("Error creating user and driver:", error);
        if (error.code === 'auth/email-already-in-use') {
             throw new Error("E-postadressen er allerede i bruk av en annen fører.");
        }
        throw new Error("En feil oppstod under opprettelse av ny fører.");
    }
}
