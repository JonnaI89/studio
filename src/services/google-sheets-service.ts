
'use server';

// This file is part of the disabled Google Sheets import functionality.
// It is kept for reference but is not actively used.

import type { Driver } from '@/lib/types';

export async function getDriversFromSheet(): Promise<Driver[]> {
    console.warn("Import from Google Sheets is currently disabled.");
    return [];
}
