
'use server';

import {
    getFirebaseDrivers,
    updateFirebaseDriver,
    getFirebaseDriver,
    deleteFirebaseDriver,
    addFirebaseDriver,
} from './firebase-service';
import type { DriverProfile, Driver } from '@/lib/types';

export async function getDrivers(): Promise<Driver[]> {
    return getFirebaseDrivers();
}

export async function getDriverProfile(id: string): Promise<Driver | null> {
    return getFirebaseDriver(id);
}

export async function updateDriver(driver: Driver): Promise<void> {
    return updateFirebaseDriver(driver);
}

export async function deleteDriver(id: string): Promise<void> {
    return deleteFirebaseDriver(id);
}

export async function addDriverProfile(driverData: Omit<Driver, 'id' | 'role'>, uid: string): Promise<void> {
    return addFirebaseDriver(driverData, uid);
}
