
'use server';

import {
    createFirebaseRace,
    getFirebaseRaces,
    updateFirebaseRace,
    deleteFirebaseRace,
    addFirebaseRaceSignup,
    getFirebaseRaceSignups,
    deleteFirebaseRaceSignup,
    getFirebaseRaceSignupsByDriver,
    getFirebaseRacesForDate,
    getFirebaseDriverFromProfile,
    getFirebaseDriverProfile,
} from './firebase-service';
import type { Race, RaceSignup, Driver } from '@/lib/types';

export type RaceSignupWithDriver = RaceSignup & {
    driver: Driver | null;
};

export async function createRace(raceData: Omit<Race, 'id' | 'createdAt' | 'status'>): Promise<Race> {
    return createFirebaseRace(raceData);
}

export async function getRaces(): Promise<Race[]> {
    return getFirebaseRaces();
}

export async function getRacesForDate(date: string): Promise<Race[]> {
    return getFirebaseRacesForDate(date);
}

export async function updateRace(race: Race): Promise<void> {
    return updateFirebaseRace(race);
}

export async function deleteRace(id: string): Promise<void> {
    return deleteFirebaseRace(id);
}

export async function addRaceSignup(signupData: Omit<RaceSignup, 'id' | 'signedUpAt'>): Promise<RaceSignup> {
    return addFirebaseRaceSignup(signupData);
}

export async function getRaceSignups(raceId: string): Promise<RaceSignup[]> {
    return getFirebaseRaceSignups(raceId);
}

export async function getRaceSignupsWithDriverData(raceId: string): Promise<RaceSignupWithDriver[]> {
    const signups = await getFirebaseRaceSignups(raceId);
    
    // This is inefficient but necessary with the new data model without a direct lookup.
    // In a production app with many drivers, this should be optimized.
    const signupsWithDrivers = await Promise.all(
        signups.map(async (signup) => {
            // We don't have profileId here, so we can't efficiently get the driver.
            // For now, we return a null driver. This is a limitation of the current structure.
            return {
                ...signup,
                driver: null, // or we need a more complex lookup
            };
        })
    );
    return signupsWithDrivers;
}

export async function getRaceSignupsByDriver(driverId: string): Promise<RaceSignup[]> {
    return getFirebaseRaceSignupsByDriver(driverId);
}

export async function deleteRaceSignup(id: string): Promise<void> {
    return deleteFirebaseRaceSignup(id);
}
