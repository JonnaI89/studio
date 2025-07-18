
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
    getFirebaseDriver,
    getFirebaseRace,
} from './firebase-service';
import type { Race, RaceSignup, Driver } from '@/lib/types';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

export type RaceSignupWithDriver = RaceSignup & {
    driver: Driver | null;
};

export async function createRace(raceData: Omit<Race, 'id' | 'createdAt' | 'status'>): Promise<Race> {
    return createFirebaseRace(raceData);
}

export async function getRaces(): Promise<Race[]> {
    return getFirebaseRaces();
}

export async function getRaceById(raceId: string): Promise<Race | null> {
    return getFirebaseRace(raceId);
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
    
    const signupsWithDrivers = await Promise.all(
        signups.map(async (signup) => {
            const driver = await getFirebaseDriver(signup.driverId);
            return {
                ...signup,
                driver: driver,
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
