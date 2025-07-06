'use server';

import { getDriversFromSheet } from './google-sheets-service';
import { batchAddFirebaseDrivers } from './firebase-service';

export async function importFromSheetsToFirebase(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        console.log("Starting import from Google Sheets to Firebase...");
        const driversToImport = await getDriversFromSheet();

        if (driversToImport.length === 0) {
            console.log("No drivers found in Google Sheet to import.");
            return { success: true, count: 0, error: "Ingen førere funnet i Google Sheet å importere." };
        }

        console.log(`Found ${driversToImport.length} drivers to import. Batch writing to Firestore...`);
        await batchAddFirebaseDrivers(driversToImport);

        console.log("Successfully imported drivers to Firebase.");
        return { success: true, count: driversToImport.length };
    } catch (error) {
        const errorMessage = (error as Error).message || "En ukjent feil oppsto under importen.";
        console.error("Import failed:", errorMessage);
        return { success: false, count: 0, error: errorMessage };
    }
}
