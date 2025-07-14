
'use server';

import { 
    getFirebaseDrivers, 
    addFirebaseDriver, 
    updateFirebaseDriver,
    getFirebaseDriverById,
    getFirebaseDriverByRfid,
    deleteFirebaseDriver,
    getFirebaseDriverByEmail
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
    
    const email = driverData.email;
    const password = driverData.email; 

    // Sjekk om en fører med denne e-posten allerede eksisterer
    const existingDriver = await getFirebaseDriverByEmail(email);
    if (existingDriver) {
        throw new Error(`En bruker med e-posten ${email} finnes allerede. E-post må være unik.`);
    }

    // This is now called on the server, but it uses the client-side SDK.
    // This is not ideal, but it avoids the Admin SDK credential issue in this environment.
    // A proper implementation would have this as a client-callable function.
    try {
      const user = await signUp(email, password);
    
      const newDriverProfile: Driver = {
          ...driverData,
          id: user.uid, // Kobler fører-ID direkte til Auth-ID
          role: 'driver',
          rfid: normalizeRfid(driverData.rfid),
      };

      await addFirebaseDriver(newDriverProfile);
      return newDriverProfile;

    } catch (error: any) {
        console.error("Error creating user or profile:", error);
        // Provide a more user-friendly error message
        if (error.code === 'auth/email-already-in-use') {
            throw new Error(`E-posten ${email} er allerede registrert.`);
        }
        if (error.code === 'auth/weak-password') {
            throw new Error('Passordet er for svakt. Det må være minst 6 tegn.');
        }
        throw new Error(`En feil oppsto under opprettelse av bruker: ${error.message}`);
    }
}
