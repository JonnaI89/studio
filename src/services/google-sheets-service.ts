
'use server';

import { google } from 'googleapis';
import type { Driver } from '@/lib/types';

// This file handles communication with Google Sheets for the one-time import.
// It requires credentials in the .env.local file.

const SHEET_ID = process.env.GOOGLE_SHEETS_SHEET_ID;
const RANGE = 'Drivers!A:J'; 

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

const columnMap: { [key: string]: number } = {
    id: 0, name: 1, dob: 2, club: 3, driverLicense: 4, vehicleLicense: 5,
    teamLicense: 6, guardianName: 7, guardianContact: 8, guardianLicenses: 9
};

const rowToDriver = (row: any[]): Driver => {
    const driver: Driver = {
        id: row[columnMap.id] || '',
        name: row[columnMap.name] || '',
        dob: row[columnMap.dob] || '',
        club: row[columnMap.club] || '',
        driverLicense: row[columnMap.driverLicense] || undefined,
        vehicleLicense: row[columnMap.vehicleLicense] || undefined,
        teamLicense: row[columnMap.teamLicense] || undefined,
    };
    
    const guardianName = row[columnMap.guardianName];
    const guardianContact = row[columnMap.guardianContact];

    if (guardianName && guardianContact) {
        driver.guardian = {
            name: guardianName,
            contact: guardianContact,
            licenses: (row[columnMap.guardianLicenses] || '').split(',').map((s: string) => s.trim()).filter(Boolean)
        };
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
        return rows.slice(1).map(row => rowToDriver(row)).filter(d => d.id); // Filter out empty rows
    } catch (error) {
        console.error('Error fetching drivers from Google Sheet:', error);
        throw new Error("Kunne ikke hente førere fra Google Sheet for import. Sjekk at API-nøkler og Sheet-ID er korrekte.");
    }
}
