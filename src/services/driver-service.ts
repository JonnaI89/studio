'use server';

import { 
    getFirebaseDrivers, 
    addFirebaseDriver, 
    updateFirebaseDriver,
    getFirebaseDriverById,
    getFirebaseDriverByRfid,
    deleteFirebaseDriver
} from './firebase-service';
import type { Driver } from '@/lib/types';
import { authAdmin } from '@/lib/firebase-admin-config';
import { format } from 'date-fns';

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
    if (!authAdmin) {
        throw new Error("Admin SDK er ikke initialisert. Registrering kan ikke fullføres.");
    }
    
    if (!driverData.email) {
        throw new Error("E-post er påkrevd for å opprette en ny fører.");
    }

    try {
        const password = format(new Date(driverData.dob), "ddMMyyyy");
        const userRecord = await authAdmin.createUser({
            email: driverData.email,
            emailVerified: false,
            password: password,
            displayName: driverData.name,
            disabled: false,
        });

        const newDriver: Driver = {
            ...driverData,
            id: userRecord.uid,
            role: 'driver',
        };
        await addDriver(newDriver);
        return newDriver;

    } catch (error: any) {
        console.error("Error creating user in backend: ", error);
        if (error.code === 'auth/email-already-exists') {
            throw new Error("En bruker med denne e-postadressen finnes allerede.");
        }
        if (error.code === 'auth/invalid-password') {
             throw new Error("Passordet er ugyldig. Det må være en streng med minst seks tegn.");
        }
        throw new Error("En feil oppstod under opprettelse av ny fører. Den kan være relatert til at serveren ikke har tilstrekkelige rettigheter.");
    }
}
