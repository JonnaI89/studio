import { db } from '@/lib/firebase-config';
import { collection, doc, getDocs, setDoc, query, where, getDoc, writeBatch, orderBy, deleteDoc } from 'firebase/firestore';
import type { Driver, TrainingSignup, TrainingSettings, SiteSettings } from '@/lib/types';

const DRIVERS_COLLECTION = 'drivers';
const TRAINING_SIGNUPS_COLLECTION = 'trainingSignups';
const SETTINGS_COLLECTION = 'settings';
const TRAINING_SCHEDULE_DOC = 'training_schedule';
const SITE_CONFIG_DOC = 'site_config';


export async function getFirebaseDrivers(): Promise<Driver[]> {
    try {
        if (!db) {
            console.warn("Firestore is not initialized. Returning empty array. Check your Firebase config.");
            return [];
        }
        const driversQuery = query(collection(db, DRIVERS_COLLECTION), orderBy("name"));
        const driversSnapshot = await getDocs(driversQuery);
        const driversList = driversSnapshot.docs.map(doc => doc.data() as Driver);
        return driversList;
    } catch (error) {
        console.error("Error fetching drivers from Firestore: ", error);
        throw new Error("Kunne ikke hente førere fra Firebase.");
    }
}

export async function getFirebaseDriverById(id: string): Promise<Driver | null> {
    try {
        if (!db) {
            throw new Error("Firestore is not initialized. Check your Firebase config.");
        }
        const driverRef = doc(db, DRIVERS_COLLECTION, id);
        const docSnap = await getDoc(driverRef);
        if (docSnap.exists()) {
            return docSnap.data() as Driver;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching driver with ID ${id} from Firestore: `, error);
        throw new Error("Kunne ikke hente fører fra Firebase.");
    }
}

export async function getFirebaseDriverByRfid(rfid: string): Promise<Driver | null> {
    try {
        if (!db) throw new Error("Firestore not initialized");
        const q = query(collection(db, DRIVERS_COLLECTION), where("rfid", "==", rfid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data() as Driver;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching driver with RFID ${rfid} from Firestore: `, error);
        throw new Error("Kunne ikke hente fører med RFID fra Firebase.");
    }
}

export async function addFirebaseDriver(driver: Driver): Promise<void> {
    try {
        if (!db) {
            throw new Error("Firestore is not initialized. Check your Firebase config.");
        }
        // The driver's auth UID is the document ID
        await setDoc(doc(db, DRIVERS_COLLECTION, driver.id), driver);
    } catch (error) {
        console.error("Error adding driver to Firestore: ", error);
        throw new Error("Kunne ikke legge til fører i Firebase.");
    }
}

export async function updateFirebaseDriver(driver: Driver): Promise<void> {
    try {
        if (!db) {
            throw new Error("Firestore is not initialized. Check your Firebase config.");
        }
        const driverRef = doc(db, DRIVERS_COLLECTION, driver.id);
        // Use setDoc with merge option to handle updates and creations gracefully
        await setDoc(driverRef, driver, { merge: true });
    } catch (error) {
        console.error("Error updating driver in Firestore: ", error);
        throw new Error("Kunne ikke oppdatere fører i Firebase.");
    }
}

export async function deleteFirebaseDriver(id: string): Promise<void> {
    try {
        if (!db) {
            throw new Error("Firestore is not initialized. Check your Firebase config.");
        }
        await deleteDoc(doc(db, DRIVERS_COLLECTION, id));
    } catch (error) {
        console.error(`Error deleting driver with ID ${id} from Firestore: `, error);
        throw new Error("Kunne ikke slette fører fra Firebase.");
    }
}

export async function batchAddFirebaseDrivers(drivers: Driver[]): Promise<void> {
    try {
        if (!db) {
            throw new Error("Firestore is not initialized. Check your Firebase config.");
        }
        const batch = writeBatch(db);

        drivers.forEach((driver) => {
            // In batch import, we assume the provided ID is the intended document ID.
            // This might need adjustment if UIDs are to be generated. For now, it uses the sheet's ID.
            const docRef = doc(db, DRIVERS_COLLECTION, driver.id);
            batch.set(docRef, driver);
        });

        await batch.commit();
    } catch (error) {
        console.error("Error batch adding drivers to Firestore: ", error);
        throw new Error("Kunne ikke utføre masseimport til Firebase.");
    }
}

export async function addFirebaseTrainingSignup(signup: Omit<TrainingSignup, 'id'>): Promise<string> {
    try {
        if (!db) throw new Error("Firestore not initialized.");
        const newDocRef = doc(collection(db, TRAINING_SIGNUPS_COLLECTION));
        await setDoc(newDocRef, { ...signup, id: newDocRef.id });
        return newDocRef.id;
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
        
        // The original query with multiple orderBy clauses required a composite index in Firestore.
        // To avoid requiring manual user intervention in the Firebase Console, we can
        // remove the ordering from the query and sort the results in the code instead.
        const q = query(collection(db, TRAINING_SIGNUPS_COLLECTION), where("trainingDate", "==", date));
        const querySnapshot = await getDocs(q);
        
        const signups = querySnapshot.docs.map(doc => doc.data() as TrainingSignup);

        // Sort the results by klasse (class), then by name
        signups.sort((a, b) => {
            const klasseA = a.driverKlasse || "Ukjent Klasse";
            const klasseB = b.driverKlasse || "Ukjent Klasse";
            
            if (klasseA < klasseB) return -1;
            if (klasseA > klasseB) return 1;
            
            // If klasse is the same, sort by name
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

export async function getFirebaseTrainingSettings(): Promise<TrainingSettings> {
    try {
        if (!db) throw new Error("Firestore not initialized");
        const docRef = doc(db, SETTINGS_COLLECTION, TRAINING_SCHEDULE_DOC);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as TrainingSettings;
        }
        // Return a default/empty state if not found, ensuring the app works on first run.
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
