'use server';

import { 
    getFirebaseDrivers, 
    addFirebaseDriver, 
    updateFirebaseDriver,
    getFirebaseDriverById,
    getFirebaseDriverByRfid,
    deleteFirebaseDriver
} from './firebase-service';
import { signUp } from './auth-service';
import type { Driver } from '@/lib/types';
import { normalizeRfid } from '@/lib/utils';


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

    try {
        const user = await signUp(driverData.email, driverData.email);
        
        const newDriverProfile: Omit<Driver, 'id'> = {
            ...driverData,
            role: 'driver',
            rfid: normalizeRfid(driverData.rfid),
        };
        
        await addFirebaseDriver(newDriverProfile, user.uid);
        
        return {
            ...newDriverProfile,
            id: user.uid,
        };

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            throw new Error("En fører med denne e-postadressen finnes allerede.");
        }
        console.error("Error creating user and driver:", error);
        throw new Error("En ukjent feil oppsto under opprettelse av ny fører.");
    }
}

export async function getDriversByAuthUid(authUid: string): Promise<Driver[]> {
    const driver = await getFirebaseDriverById(authUid);
    return driver ? [driver] : [];
}
