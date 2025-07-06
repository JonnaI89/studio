'use server';

import { db } from '@/lib/firebase-config';
import { collection, doc, getDocs, setDoc, updateDoc, writeBatch, query, orderBy } from 'firebase/firestore';
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

export async function addFirebaseDriver(driver: Driver): Promise<void> {
    try {
        if (!db) {
            throw new Error("Firestore is not initialized. Check your Firebase config.");
        }
        // Use the driver's custom ID as the document ID in Firestore
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

export async function batchAddFirebaseDrivers(drivers: Driver[]): Promise<void> {
    try {
        if (!db) {
            throw new Error("Firestore is not initialized. Check your Firebase config.");
        }
        const batch = writeBatch(db);

        drivers.forEach((driver) => {
            const docRef = doc(db, DRIVERS_COLLECTION, driver.id);
            batch.set(docRef, driver);
        });

        await batch.commit();
    } catch (error) {
        console.error("Error batch adding drivers to Firestore: ", error);
        throw new Error("Kunne ikke utføre masseimport til Firebase.");
    }
}
