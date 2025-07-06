'use server';

import { google } from 'googleapis';
import type { Driver } from '@/lib/types';

// This file handles communication with Google Sheets for the one-time import.
// It requires credentials in the .env.local file.

const SHEET_ID = process.env.GOOGLE_SHEETS_SHEET_ID;
const RANGE = 'Drivers!A:I'; 

const getAuth = () => {
  const credentials = {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!credentials.client_email || !credentials.private_key || !SHEET_ID) {
    throw new Error("Google Sheets API-legitimasjon er ikke konfigurert for import. Sjekk .env.local-filen.");
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

const columnOrder: (keyof Driver | `guardian.${keyof NonNullable<Driver['guardian']>}`)[] = [
    'id', 'name', 'dob', 'club', 'driverLicense', 'vehicleLicense', 
    'guardian.name', 'guardian.contact', 'guardian.guardianLicense'
];

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
