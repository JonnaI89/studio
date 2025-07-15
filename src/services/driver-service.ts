
'use server';

import {
    getFirebaseDriverProfiles,
    updateFirebaseDriverProfile,
    getFirebaseDriverProfile,
    getFirebaseDriverByRfid,
    deleteFirebaseDriverFromProfile,
    addOrUpdateFirebaseDriverInProfile,
    getFirebaseDriverProfileByAuthUid,
    getFirebaseDriversByAuthUid
} from './firebase-service';
import type { Driver, DriverProfile } from '@/lib/types';

export async function getDriverProfiles(): Promise<DriverProfile[]> {
    return getFirebaseDriverProfiles();
}

export async function getDriverProfile(driverId: string): Promise<Driver | null> {
    return getFirebaseDriverProfile(driverId);
}

export async function getDriverProfileByAuthUid(authUid: string): Promise<DriverProfile | null> {
    return getFirebaseDriverProfileByAuthUid(authUid);
}

export async function getDriversByAuthUid(authUid: string): Promise<Driver[]> {
    return getFirebaseDriversByAuthUid(authUid);
}

export async function getDriverByRfid(rfid: string): Promise<Driver | null> {
    return getFirebaseDriverByRfid(rfid);
}

export async function addOrUpdateDriverInProfile(profileId: string, driver: Omit<Driver, 'id' | 'authUid'> | Driver): Promise<Driver> {
    return addOrUpdateFirebaseDriverInProfile(profileId, driver);
}

export async function deleteDriverFromProfile(driverId: string): Promise<void> {
    return deleteFirebaseDriverFromProfile(driverId);
}
