
'use server';

import {
    getFirebaseDriverProfiles,
    updateFirebaseDriverProfile,
    getFirebaseDriverProfile,
    getFirebaseDriverProfileByEmail,
    getFirebaseDriverByRfid,
    deleteFirebaseDriverFromProfile,
    addFirebaseDriverToProfile,
    createFirebaseDriverProfile,
    getFirebaseDriverFromProfile,
} from './firebase-service';
import type { Driver, DriverProfile } from '@/lib/types';
import { createFirebaseUser } from './auth-server-service';

export async function getDriverProfiles(): Promise<DriverProfile[]> {
    return getFirebaseDriverProfiles();
}

export async function getDriverProfile(id: string): Promise<DriverProfile | null> {
    return getFirebaseDriverProfile(id);
}

export async function getDriverByRfid(rfid: string): Promise<Driver | null> {
    return getFirebaseDriverByRfid(rfid);
}

export async function getDriver(profileId: string, driverId: string): Promise<Driver | null> {
    return getFirebaseDriverFromProfile(profileId, driverId);
}

export async function updateDriver(profileId: string, driver: Driver): Promise<void> {
    const profile = await getFirebaseDriverProfile(profileId);
    if (!profile) {
        throw new Error("Profil ikke funnet for å oppdatere fører.");
    }
    const driverIndex = profile.drivers.findIndex(d => d.id === driver.id);
    if (driverIndex === -1) {
        throw new Error("Fører ikke funnet i profilen.");
    }
    profile.drivers[driverIndex] = driver;
    await updateFirebaseDriverProfile(profile);
}

export async function deleteDriver(profileId: string, driverId: string): Promise<void> {
    return deleteFirebaseDriverFromProfile(profileId, driverId);
}

export async function addNewDriver(driverData: Omit<Driver, 'id'>, existingProfileEmail?: string): Promise<DriverProfile> {
    if (existingProfileEmail) {
        // Find existing profile by email and add driver to it
        const profile = await getFirebaseDriverProfileByEmail(existingProfileEmail);
        if (!profile) {
            throw new Error(`Fant ingen profil med e-post: ${existingProfileEmail}`);
        }
        const newDriver = await addFirebaseDriverToProfile(profile.id, driverData);
        profile.drivers.push(newDriver);
        return profile;
    } else {
        // Create new user and new profile
        const user = await createFirebaseUser(driverData.email, driverData.email);
        const newProfile = await createFirebaseDriverProfile(driverData, user.uid);
        return newProfile;
    }
}
