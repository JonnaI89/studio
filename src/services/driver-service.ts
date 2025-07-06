'use server';

import { google } from 'googleapis';
import type { Driver } from '@/lib/types';

// This file handles all communication with Google Sheets.
//
// --- SETUP INSTRUCTIONS ---
//
// 1. Create a `.env.local` file in the root of your project (next to package.json).
//
// 2. Add the following environment variables to your `.env.local` file.
//    You get these values from your Google Cloud project after creating a service account.
//
//    GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
//    GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
//    GOOGLE_SHEETS_SHEET_ID=your-google-sheet-id
//
// 3. IMPORTANT: The private key must be wrapped in double quotes ("") and newlines must be represented as `\n`.
//
// 4. Share your Google Sheet with the `client_email` address, giving it "Editor" permissions.
//
// 5. Your sheet should be named "Drivers" and have the following columns in this exact order:
//    A: id, B: name, C: dob, D: club, E: driverLicense, F: vehicleLicense, 
//    G: guardian.name, H: guardian.contact, I: guardian.guardianLicense

const SHEET_ID = process.env.GOOGLE_SHEETS_SHEET_ID;
// Assumes your sheet is named 'Drivers'. Change it here if needed.
const RANGE = 'Drivers!A:I'; 

const getAuth = () => {
  const credentials = {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!credentials.client_email || !credentials.private_key || !SHEET_ID) {
    throw new Error("Google Sheets API credentials are not configured. Please check your .env.local file.");
  }
  
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

const getSheetsApi = () => {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

// Defines the column order in your Google Sheet for consistent mapping.
const columnOrder: (keyof Driver | `guardian.${keyof NonNullable<Driver['guardian']>}`)[] = [
    'id', 'name', 'dob', 'club', 'driverLicense', 'vehicleLicense', 
    'guardian.name', 'guardian.contact', 'guardian.guardianLicense'
];

// Converts a Driver object into an array for a sheet row.
const driverToRow = (driver: Driver): (string | undefined)[] => {
    return columnOrder.map(key => {
        if (key.startsWith('guardian.')) {
            const guardianKey = key.split('.')[1] as keyof NonNullable<Driver['guardian']>;
            return driver.guardian?.[guardianKey] || '';
        }
        const value = driver[key as keyof Driver];
        return value === null || value === undefined ? '' : String(value);
    });
};

// Converts a sheet row (array) into a Driver object.
const rowToDriver = (row: any[]): Driver => {
    const driver: Partial<Driver> = {};
    const guardianData: Partial<NonNullable<Driver['guardian']>> = {};

    columnOrder.forEach((key, index) => {
        const value = row[index] || '';
        if (key.startsWith('guardian.')) {
            const guardianKey = key.split('.')[1] as keyof NonNullable<Driver['guardian']>;
            if (value) {
                (guardianData as any)[guardianKey] = value;
            }
        } else {
            (driver as any)[key] = value;
        }
    });

    if (Object.keys(guardianData).length > 0 && guardianData.name && guardianData.contact) {
        driver.guardian = {
            name: guardianData.name,
            contact: guardianData.contact,
            guardianLicense: guardianData.guardianLicense,
        };
    }
    return driver as Driver;
}

export async function getDrivers(): Promise<Driver[]> {
    try {
        const sheets = getSheetsApi();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: RANGE,
        });

        const rows = response.data.values;
        if (!rows || rows.length < 2) { // Need at least a header and one row of data
            return [];
        }

        // Skip header row (index 0) and map the rest
        return rows.slice(1).map(row => rowToDriver(row)).filter(d => d.id); // Filter out empty rows
    } catch (error) {
        console.error('Error fetching drivers from Google Sheet:', error);
        throw new Error("Kunne ikke hente førere fra databasen. Sjekk at API-nøkler og Sheet-ID er korrekte.");
    }
}

export async function addDriver(driver: Driver): Promise<void> {
    try {
        const sheets = getSheetsApi();
        const row = driverToRow(driver);
        
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: RANGE,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [row],
            },
        });
    } catch (error) {
        console.error('Error adding driver to Google Sheet:', error);
        throw new Error("Kunne ikke legge til ny fører i databasen.");
    }
}

export async function updateDriver(driver: Driver): Promise<void> {
     try {
        const sheets = getSheetsApi();

        const getResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: RANGE,
            majorDimension: 'ROWS',
        });
        
        const rows = getResponse.data.values;
        if (!rows) {
            throw new Error(`Finner ingen data i arket.`);
        }

        const rowIndex = rows.findIndex(row => row[0] === driver.id);
        if (rowIndex === -1) {
             throw new Error(`Fører med ID ${driver.id} ble ikke funnet for oppdatering.`);
        }
        
        const rowToUpdate = rowIndex + 1;
        const newRowData = driverToRow(driver);

        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `Drivers!A${rowToUpdate}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [newRowData],
            },
        });
    } catch (error) {
        console.error('Error updating driver in Google Sheet:', error);
        throw new Error("Kunne ikke oppdatere fører i databasen.");
    }
}
