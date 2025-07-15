
'use server';

import {
    getFirebaseDriverProfiles,
    updateFirebaseDriverProfile,
    getFirebaseDriverProfile,
    getFirebaseDriverByRfid,
    deleteFirebaseProfile,
    addFirebaseDriverProfile
} from './firebase-service';
import type { Driver, DriverProfile } from '@/lib/types';

export async function getDriverProfiles(): Promise<Driver[]> {
    return getFirebaseDriverProfiles();
}

export async function getDriverProfile(id: string): Promise<Driver | null> {
    // This now fetches a single Driver document, not a profile with a list.
    return getFirebaseDriverProfile(id);
}

export async function getDriverByRfid(rfid: string): Promise<Driver | null> {
    return getFirebaseDriverByRfid(rfid);
}

export async function getDriver(profileId: string, driverId: string): Promise<Driver | null> {
    // In the old model, profileId and driverId are the same.
    return getFirebaseDriverProfile(profileId);
}

export async function updateDriver(driver: Driver): Promise<void> {
    await updateFirebaseDriverProfile(driver);
}

export async function deleteDriver(id: string): Promise<void> {
    return deleteFirebaseProfile(id);
}
