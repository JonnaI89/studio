
'use server';

import {
    getFirebaseDriverProfiles,
    updateFirebaseDriverProfile,
    getFirebaseDriverProfile,
    deleteFirebaseDriverProfile,
    addFirebaseDriverProfile,
    getFirebaseDriverByRfid
} from './firebase-service';
import type { DriverProfile, Driver } from '@/lib/types';

export async function getDriverProfiles(): Promise<DriverProfile[]> {
    return getFirebaseDriverProfiles();
}

export async function getDriverProfile(id: string): Promise<DriverProfile | null> {
    return getFirebaseDriverProfile(id);
}

// This function now returns the specific driver and the profile they belong to
export async function getDriverByRfid(rfid: string): Promise<{ driver: Driver, profile: DriverProfile } | null> {
    return getFirebaseDriverByRfid(rfid);
}

export async function updateDriverProfile(profile: DriverProfile): Promise<void> {
    return updateFirebaseDriverProfile(profile);
}

export async function deleteDriverProfile(id: string): Promise<void> {
    return deleteFirebaseDriverProfile(id);
}

export async function addDriverProfile(profileData: Omit<DriverProfile, 'id' | 'role' | 'drivers'>, firstDriver: Omit<Driver, 'id'>, uid: string): Promise<void> {
    return addFirebaseDriverProfile(profileData, firstDriver, uid);
}
