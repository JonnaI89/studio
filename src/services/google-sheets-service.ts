
'use server';

import { google } from 'googleapis';
import type { Driver, Guardian } from '@/lib/types';

// This file handles communication with Google Sheets for the one-time import.
// It requires credentials in the .env.local file.

const SHEET_ID = process.env.GOOGLE_SHEETS_SHEET_ID;
// Define the range based on the new column structure (A to U)
const RANGE = 'Drivers!A:U'; 

const getAuth = () => {
  const credentials = {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!credentials.client_email || !credentials.private_key || !SHEET_ID) {
    throw new Error("Google Sheets/Firebase API-legitimasjon er ikke konfigurert for import. Sjekk .env.local-filen (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, GOOGLE_SHEETS_SHEET_ID).");
  }
  
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
};

const getSheetsApi = () => {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

// Updated column map to match the new structure
const columnMap: { [key: string]: number } = {
    id: 0,
    name: 1,
    dob: 2,
    club: 3,
    email: 4,
    rfid: 5,
    klasse: 6,
    startNr: 7,
    transponderNr: 8,
    chassiNr: 9,
    motorNr1: 10,
    motorNr2: 11,
    driverLicense: 12,
    vehicleLicense: 13,
    teamLicense: 14,
    guardian1_name: 15,
    guardian1_contact: 16,
    guardian1_licenses: 17,
    guardian2_name: 18,
    guardian2_contact: 19,
    guardian2_licenses: 20,
};

const rowToDriver = (row: any[]): Driver => {
    const driver: Driver = {
        id: row[columnMap.id] || `generated_${crypto.randomUUID()}`,
        name: row[columnMap.name] || '',
        dob: row[columnMap.dob] || '',
        club: row[columnMap.club] || '',
        email: row[columnMap.email] || '',
        rfid: row[columnMap.rfid] || '',
        klasse: row[columnMap.klasse] || undefined,
        startNr: row[columnMap.startNr] || undefined,
        transponderNr: row[columnMap.transponderNr] || undefined,
        chassiNr: row[columnMap.chassiNr] || undefined,
        motorNr1: row[columnMap.motorNr1] || undefined,
        motorNr2: row[columnMap.motorNr2] || undefined,
        driverLicense: row[columnMap.driverLicense] || undefined,
        vehicleLicense: row[columnMap.vehicleLicense] || undefined,
        teamLicense: row[columnMap.teamLicense] || undefined,
        role: 'driver',
        guardians: []
    };
    
    // Process first guardian
    const g1_name = row[columnMap.guardian1_name];
    const g1_contact = row[columnMap.guardian1_contact];
    if (g1_name && g1_contact) {
        const guardian1: Guardian = {
            id: crypto.randomUUID(),
            name: g1_name,
            contact: g1_contact,
            licenses: (row[columnMap.guardian1_licenses] || '').split(',').map((s: string) => s.trim()).filter(Boolean)
        };
        driver.guardians?.push(guardian1);
    }
    
    // Process second guardian
    const g2_name = row[columnMap.guardian2_name];
    const g2_contact = row[columnMap.guardian2_contact];
    if (g2_name && g2_contact) {
        const guardian2: Guardian = {
            id: crypto.randomUUID(),
            name: g2_name,
            contact: g2_contact,
            licenses: (row[columnMap.guardian2_licenses] || '').split(',').map((s: string) => s.trim()).filter(Boolean)
        };
        driver.guardians?.push(guardian2);
    }

    return driver;
}

export async function getDriversFromSheet(): Promise<Driver[]> {
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
        return rows.slice(1).map(row => rowToDriver(row)).filter(d => d.id && d.name && d.email); // Filter out rows without essential info
    } catch (error) {
        console.error('Error fetching drivers from Google Sheet:', error);
        throw new Error("Kunne ikke hente førere fra Google Sheet for import. Sjekk at API-nøkler og Sheet-ID er korrekte.");
    }
}
