'use server';

import { db } from '@/lib/firebase-config';
import { collection, doc, getDocs, setDoc, query, where, getDoc, writeBatch, orderBy, deleteDoc } from 'firebase/firestore';
import type { Driver } from '@/lib/types';

const DRIVERS_COLLECTION = 'drivers';

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
