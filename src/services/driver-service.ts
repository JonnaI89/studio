
'use server';

import { 
    getFirebaseDrivers, 
    addFirebaseDriver, 
    updateFirebaseDriver,
    getFirebaseDriverById,
    getFirebaseDriverByRfid,
    deleteFirebaseDriver,
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
        throw new Error("Firebase Admin Auth er ikke initialisert på serveren.");
    }

    try {
        const userRecord = await authAdmin.createUser({
            email: driverData.email,
            password: driverData.email,
            emailVerified: true,
        });

        const newDriverProfile: Omit<Driver, 'id'> = {
            ...driverData,
            role: 'driver',
            rfid: normalizeRfid(driverData.rfid),
        };
        
        await addFirebaseDriver(newDriverProfile, userRecord.uid);
        
        return {
            ...newDriverProfile,
            id: userRecord.uid,
        };

    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            throw new Error("En fører med denne e-postadressen finnes allerede.");
        }
        if (error.code === 'auth/invalid-password') {
             throw new Error("Passordet er ugyldig. Det må være minst 6 tegn.");
        }
        console.error("Error creating user with Admin SDK:", error);
        throw new Error("En ukjent feil oppsto under opprettelse av ny fører.");
    }
}
