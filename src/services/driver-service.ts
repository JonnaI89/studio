
'use server';

import { 
    getFirebaseDrivers, 
    updateFirebaseDriver,
    getFirebaseDriverById,
    getFirebaseDriverByRfid,
    deleteFirebaseDriver,
    getFirebaseDriversByAuthUid,
} from './firebase-service';
import type { Driver } from '@/lib/types';


export async function getDrivers(): Promise<Driver[]> {
    return getFirebaseDrivers();
}

export async function getDriverById(id: string): Promise<Driver | null> {
    return getFirebaseDriverById(id);
}

export async function getDriversByAuthUid(authUid: string): Promise<Driver[]> {
    return getFirebaseDriversByAuthUid(authUid);
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
