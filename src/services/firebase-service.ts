
'use server';

import { db } from '@/lib/firebase-config';
import { collection, doc, getDocs, setDoc, query, where, getDoc, writeBatch, orderBy, deleteDoc, addDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Driver, TrainingSignup, TrainingSettings, SiteSettings, Race, RaceSignup, CheckinHistoryEntry, DriverProfile } from '@/lib/types';
import { normalizeRfid } from '@/lib/utils';
import { isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

const DRIVERS_COLLECTION = 'drivers';
const TRAINING_SIGNUPS_COLLECTION = 'trainingSignups';
const SETTINGS_COLLECTION = 'settings';
const TRAINING_SCHEDULE_DOC = 'training_schedule';
const SITE_CONFIG_DOC = 'site_config';
const RACES_COLLECTION = 'races';
const RACE_SIGNUPS_COLLECTION = 'raceSignups';
const CHECKIN_HISTORY_COLLECTION = 'checkinHistory';


export async function getFirebaseDriverProfiles(): Promise<DriverProfile[]> {
    try {
        if (!db) {
            console.warn("Firestore is not initialized. Returning empty array. Check your Firebase config.");
            return [];
        }
        const profilesQuery = query(collection(db, DRIVERS_COLLECTION), orderBy("email"));
        const profilesSnapshot = await getDocs(profilesQuery);
        return profilesSnapshot.docs.map(doc => doc.data() as DriverProfile);
    } catch (error) {
        console.error("Error fetching driver profiles from Firestore: ", error);
        throw new Error("Kunne ikke hente førerprofiler fra Firebase.");
    }
}

export async function getFirebaseDriverProfile(id: string): Promise<DriverProfile | null> {
    try {
        if (!db) throw new Error("Firestore is not initialized.");
        const profileRef = doc(db, DRIVERS_COLLECTION, id);
        const docSnap = await getDoc(profileRef);
        if (docSnap.exists()) {
            return docSnap.data() as DriverProfile;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching driver profile with ID ${id} from Firestore: `, error);
        throw new Error("Kunne ikke hente førerprofil fra Firebase.");
    }
}

export async function getFirebaseDriverProfileByEmail(email: string): Promise<DriverProfile | null> {
    try {
        if (!db) throw new Error("Firestore not initialized");
        const q = query(collection(db, DRIVERS_COLLECTION), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docData = querySnapshot.docs[0];
            return docData.data() as DriverProfile;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching profile with email ${email}: `, error);
        throw new Error("Kunne ikke hente profil med e-post fra Firebase.");
    }
}


export async function getFirebaseDriverByRfid(rfid: string): Promise<Driver | null> {
    try {
        if (!db) throw new Error("Firestore not initialized");
        const normalized = normalizeRfid(rfid);
        const q = query(collection(db, DRIVERS_COLLECTION), where("drivers", "array-contains", { rfid: normalized }));

        const profilesSnapshot = await getDocs(collection(db, DRIVERS_COLLECTION));
        for (const doc of profilesSnapshot.docs) {
            const profile = doc.data() as DriverProfile;
            const foundDriver = profile.drivers.find(d => normalizeRfid(d.rfid) === normalized);
            if (foundDriver) {
                return foundDriver;
            }
        }
        return null;
    } catch (error) {
        console.error(`Error fetching driver with RFID ${rfid} from Firestore: `, error);
        throw new Error("Kunne ikke hente fører med RFID fra Firebase.");
    }
}

export async function createFirebaseDriverProfile(driverData: Omit<Driver, 'id'>, authUid: string): Promise<DriverProfile> {
    try {
        if (!db) throw new Error("Firestore is not initialized.");
        
        const newDriver: Driver = {
            ...driverData,
            id: crypto.randomUUID(),
            rfid: normalizeRfid(driverData.rfid),
        };

        const newProfile: DriverProfile = {
            id: authUid,
            email: driverData.email,
            role: 'driver',
            drivers: [newDriver],
        };
        
        const docRef = doc(db, DRIVERS_COLLECTION, authUid);
        await setDoc(docRef, newProfile);
        return newProfile;
    } catch (error) {
        console.error("Error creating driver profile in Firestore: ", error);
        throw new Error("Kunne ikke opprette førerprofil i databasen.");
    }
}

export async function addFirebaseDriverToProfile(profileId: string, driverData: Omit<Driver, 'id'>): Promise<Driver> {
    if (!db) throw new Error("Firestore is not initialized.");
    const newDriver: Driver = {
        ...driverData,
        id: crypto.randomUUID(),
        rfid: normalizeRfid(driverData.rfid),
    };
    const profileRef = doc(db, DRIVERS_COLLECTION, profileId);
    await updateDoc(profileRef, {
        drivers: arrayUnion(newDriver)
    });
    return newDriver;
}


export async function updateFirebaseDriverProfile(profile: DriverProfile): Promise<void> {
    try {
        if (!db) throw new Error("Firestore not initialized.");
        const profileRef = doc(db, DRIVERS_COLLECTION, profile.id);
        await setDoc(profileRef, profile, { merge: true });
    } catch (error) {
        console.error("Error updating driver profile in Firestore: ", error);
        throw new Error("Kunne ikke oppdatere førerprofil i Firebase.");
    }
}

export async function deleteFirebaseDriverFromProfile(profileId: string, driverId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized.");
    const profile = await getFirebaseDriverProfile(profileId);
    if (!profile) throw new Error("Profile not found");

    const driverToRemove = profile.drivers.find(d => d.id === driverId);
    if (!driverToRemove) throw new Error("Driver not found in profile");

    const profileRef = doc(db, DRIVERS_COLLECTION, profileId);
    await updateDoc(profileRef, {
        drivers: arrayRemove(driverToRemove)
    });
}

export async function getFirebaseDriverFromProfile(profileId: string, driverId: string): Promise<Driver | null> {
    const profile = await getFirebaseDriverProfile(profileId);
    return profile?.drivers.find(d => d.id === driverId) || null;
}


export async function deleteFirebaseProfile(id: string): Promise<void> {
    try {
        if (!db) {
            throw new Error("Firestore is not initialized. Check your Firebase config.");
        }
        await deleteDoc(doc(db, DRIVERS_COLLECTION, id));
    } catch (error) {
        console.error(`Error deleting profile with ID ${id} from Firestore: `, error);
        throw new Error("Kunne ikke slette profil fra Firebase.");
    }
}


export async function addFirebaseTrainingSignup(signupData: Omit<TrainingSignup, 'id'>): Promise<TrainingSignup> {
    try {
        if (!db) throw new Error("Firestore not initialized.");
        const newDocRef = doc(collection(db, TRAINING_SIGNUPS_COLLECTION));
        const newSignup: TrainingSignup = { ...signupData, id: newDocRef.id };
        await setDoc(newDocRef, newSignup);
        return newSignup;
    } catch (error) {
        console.error("Error adding training signup to Firestore: ", error);
        throw new Error("Kunne ikke legge til treningspåmelding.");
    }
}

export async function deleteFirebaseTrainingSignup(id: string): Promise<void> {
    try {
        if (!db) {
            throw new Error("Firestore is not initialized. Check your Firebase config.");
        }
        await deleteDoc(doc(db, TRAINING_SIGNUPS_COLLECTION, id));
    } catch (error) {
        console.error(`Error deleting training signup with ID ${id} from Firestore: `, error);
        throw new Error("Kunne ikke fjerne påmelding fra Firebase.");
    }
}

export async function getFirebaseTrainingSignupsByDate(date: string): Promise<TrainingSignup[]> {
    try {
        if (!db) throw new Error("Firestore not initialized.");
        
        const q = query(collection(db, TRAINING_SIGNUPS_COLLECTION), where("trainingDate", "==", date));
        const querySnapshot = await getDocs(q);
        
        const signups = querySnapshot.docs.map(doc => doc.data() as TrainingSignup);

        signups.sort((a, b) => {
            const klasseA = a.driverKlasse || "Ukjent Klasse";
            const klasseB = b.driverKlasse || "Ukjent Klasse";
            
            if (klasseA < klasseB) return -1;
            if (klasseA > klasseB) return 1;
            
            if (a.driverName < b.driverName) return -1;
            if (a.driverName > b.driverName) return 1;

            return 0;
        });

        return signups;
    } catch (error) {
        console.error(`Error fetching signups for date ${date}: `, error);
        throw new Error("En feil oppstod under henting av påmeldinger. Vennligst prøv igjen.");
    }
}

export async function getFirebaseTrainingSignupsByDriver(driverId: string): Promise<TrainingSignup[]> {
    try {
        if (!db) throw new Error("Firestore not initialized.");
        
        const q = query(collection(db, TRAINING_SIGNUPS_COLLECTION), where("driverId", "==", driverId));
        const querySnapshot = await getDocs(q);
        
        const signups = querySnapshot.docs.map(doc => doc.data() as TrainingSignup);

        return signups;
    } catch (error) {
        console.error(`Error fetching training signups for driver ${driverId}: `, error);
        throw new Error("En feil oppstod under henting av påmeldinger for trening.");
    }
}


export async function getFirebaseTrainingSettings(): Promise<TrainingSettings> {
    try {
        if (!db) throw new Error("Firestore not initialized");
        const docRef = doc(db, SETTINGS_COLLECTION, TRAINING_SCHEDULE_DOC);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as TrainingSettings;
        }
        return { id: 'main', year: new Date().getFullYear(), rules: [] };
    } catch (error) {
        console.error("Error fetching training settings from Firestore: ", error);
        throw new Error("Kunne ikke hente treningsinnstillinger.");
    }
}

export async function updateFirebaseTrainingSettings(settings: TrainingSettings): Promise<void> {
    try {
        if (!db) throw new Error("Firestore not initialized");
        const docRef = doc(db, SETTINGS_COLLECTION, TRAINING_SCHEDULE_DOC);
        await setDoc(docRef, settings);
    } catch (error) {
        console.error("Error updating training settings in Firestore: ", error);
        throw new Error("Kunne ikke lagre treningsinnstillinger.");
    }
}

export async function getFirebaseSiteSettings(): Promise<SiteSettings> {
    try {
        if (!db) throw new Error("Firestore not initialized");
        const docRef = doc(db, SETTINGS_COLLECTION, SITE_CONFIG_DOC);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as SiteSettings;
        }
        return {};
    } catch (error) {
        console.error("Error fetching site settings from Firestore: ", error);
        throw new Error("Kunne ikke hente nettstedsinnstillinger.");
    }
}

export async function updateFirebaseSiteSettings(settings: SiteSettings): Promise<void> {
    try {
        if (!db) throw new Error("Firestore not initialized");
        const docRef = doc(db, SETTINGS_COLLECTION, SITE_CONFIG_DOC);
        await setDoc(docRef, settings, { merge: true });
    } catch (error) {
        console.error("Error updating site settings in Firestore: ", error);
        throw new Error("Kunne ikke lagre nettstedsinnstillinger.");
    }
}

// Races
export async function createFirebaseRace(raceData: Omit<Race, 'id' | 'createdAt' | 'status'>): Promise<Race> {
    try {
        if (!db) throw new Error("Firestore not initialized.");
        const raceWithMetadata = {
            ...raceData,
            status: 'upcoming' as const,
            createdAt: new Date().toISOString(),
        };
        const docRef = await addDoc(collection(db, RACES_COLLECTION), raceWithMetadata);
        const newRace: Race = { ...raceWithMetadata, id: docRef.id };
        await setDoc(docRef, newRace);
        return newRace;
    } catch (error) {
        console.error("Error creating race in Firestore: ", error);
        throw new Error("Kunne ikke opprette nytt løp.");
    }
}

export async function getFirebaseRaces(): Promise<Race[]> {
    try {
        if (!db) throw new Error("Firestore not initialized.");
        const racesQuery = query(collection(db, RACES_COLLECTION), orderBy("date", "desc"));
        const racesSnapshot = await getDocs(racesQuery);
        return racesSnapshot.docs.map(doc => doc.data() as Race);
    } catch (error) {
        console.error("Error fetching races from Firestore: ", error);
        throw new Error("Kunne ikke hente løp.");
    }
}

export async function getFirebaseRacesForDate(date: string): Promise<Race[]> {
    try {
      if (!db) throw new Error("Firestore not initialized.");
      const targetDate = parseISO(date);

      // Fetch all races and filter in the code to avoid complex composite indexes
      const allRaces = await getFirebaseRaces();

      const activeRaces = allRaces.filter(race => {
        const startDate = startOfDay(parseISO(race.date));
        const endDate = race.endDate ? endOfDay(parseISO(race.endDate)) : endOfDay(startDate);
        return isWithinInterval(targetDate, { start: startDate, end: endDate });
      });
      
      return activeRaces;
    } catch (error) {
      console.error(`Error fetching or filtering races for date ${date}: `, error);
      throw new Error("Kunne ikke hente løp for den valgte datoen.");
    }
}


export async function updateFirebaseRace(race: Race): Promise<void> {
    try {
        if (!db) throw new Error("Firestore not initialized.");
        const raceRef = doc(db, RACES_COLLECTION, race.id);
        await setDoc(raceRef, race, { merge: true });
    } catch (error) {
        console.error("Error updating race in Firestore: ", error);
        throw new Error("Kunne ikke oppdatere løp.");
    }
}

export async function deleteFirebaseRace(id: string): Promise<void> {
    try {
        if (!db) throw new Error("Firestore not initialized.");
        await deleteDoc(doc(db, RACES_COLLECTION, id));
    } catch (error) {
        console.error(`Error deleting race with ID ${id} from Firestore: `, error);
        throw new Error("Kunne ikke slette løp.");
    }
}

// Race Signups
export async function addFirebaseRaceSignup(signupData: Omit<RaceSignup, 'id'>): Promise<RaceSignup> {
    try {
        if (!db) throw new Error("Firestore not initialized.");

        const q = query(
            collection(db, RACE_SIGNUPS_COLLECTION),
            where("raceId", "==", signupData.raceId),
            where("driverId", "==", signupData.driverId)
        );
        const existingSignup = await getDocs(q);
        if (!existingSignup.empty) {
            throw new Error("Føreren er allerede påmeldt dette løpet.");
        }

        const signupWithMetadata = {
            ...signupData,
            signedUpAt: new Date().toISOString(),
        };
        const docRef = await addDoc(collection(db, RACE_SIGNUPS_COLLECTION), signupWithMetadata);
        const newSignup: RaceSignup = { ...signupWithMetadata, id: docRef.id };
        await setDoc(docRef, newSignup);
        return newSignup;
    } catch (error) {
        console.error("Error adding race signup to Firestore: ", error);
        throw error;
    }
}

export async function getFirebaseRaceSignups(raceId: string): Promise<RaceSignup[]> {
    try {
        if (!db) throw new Error("Firestore not initialized.");
        const q = query(collection(db, RACE_SIGNUPS_COLLECTION), where("raceId", "==", raceId));
        const snapshot = await getDocs(q);
        const signups = snapshot.docs.map(doc => doc.data() as RaceSignup);
        
        // Sort in-memory to avoid needing a composite index in Firestore
        signups.sort((a, b) => {
            const klasseA = a.driverKlasse || 'Z-Ukjent Klasse';
            const klasseB = b.driverKlasse || 'Z-Ukjent Klasse';
            
            const klasseCompare = klasseA.localeCompare(klasseB);
            if (klasseCompare !== 0) return klasseCompare;
            
            return a.driverName.localeCompare(b.driverName);
        });

        return signups;
    } catch (error) {
        console.error(`Error fetching signups for race ${raceId}: `, error);
        throw new Error("Kunne ikke hente påmeldinger for løpet.");
    }
}

export async function getFirebaseRaceSignupsByDriver(driverId: string): Promise<RaceSignup[]> {
    try {
        if (!db) throw new Error("Firestore not initialized.");
        const q = query(collection(db, RACE_SIGNUPS_COLLECTION), where("driverId", "==", driverId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as RaceSignup);
    } catch (error) {
        console.error(`Error fetching signups for driver ${driverId}: `, error);
        throw new Error("Kunne ikke hente førerens påmeldinger.");
    }
}

export async function deleteFirebaseRaceSignup(id: string): Promise<void> {
    try {
        if (!db) throw new Error("Firestore not initialized.");
        await deleteDoc(doc(db, RACE_SIGNUPS_COLLECTION, id));
    } catch (error) {
        console.error(`Error deleting race signup with ID ${id}: `, error);
        throw new Error("Kunne ikke fjerne påmelding.");
    }
}

export async function addFirebaseCheckinHistory(entryData: Omit<CheckinHistoryEntry, 'id'>): Promise<CheckinHistoryEntry> {
    try {
        if (!db) throw new Error("Firestore not initialized.");
        const newDocRef = doc(collection(db, CHECKIN_HISTORY_COLLECTION));
        const newEntry: CheckinHistoryEntry = { ...entryData, id: newDocRef.id };
        await setDoc(newDocRef, newEntry);
        return newEntry;
    } catch (error) {
        console.error("Error adding check-in history to Firestore: ", error);
        throw new Error("Kunne ikke lagre innsjekking i historikken.");
    }
}

export async function getFirebaseCheckinHistoryForDate(date: string): Promise<CheckinHistoryEntry[]> {
    try {
        if (!db) throw new Error("Firestore not initialized.");
        const q = query(
            collection(db, CHECKIN_HISTORY_COLLECTION), 
            where("checkinDate", "==", date)
        );
        const querySnapshot = await getDocs(q);
        const entries = querySnapshot.docs.map(doc => doc.data() as CheckinHistoryEntry);
        
        // Sort in-memory to avoid needing a composite index
        entries.sort((a, b) => b.checkinTime.localeCompare(a.checkinTime));

        return entries;
    } catch (error) {
        console.error(`Error fetching check-in history for date ${date}: `, error);
        throw new Error("Kunne ikke hente innsjekkingshistorikk for i dag.");
    }
}

export async function deleteFirebaseCheckinHistory(id: string): Promise<void> {
    try {
        if (!db) {
            throw new Error("Firestore is not initialized.");
        }
        await deleteDoc(doc(db, CHECKIN_HISTORY_COLLECTION, id));
    } catch (error) {
        console.error(`Error deleting checkin history with ID ${id} from Firestore: `, error);
        throw new Error("Kunne ikke slette innsjekking fra databasen.");
    }
}
