'use server';

import { addFirebaseCheckinHistory, getFirebaseCheckinHistoryForDate } from './firebase-service';
import type { CheckinHistoryEntry } from '@/lib/types';

export async function recordCheckin(entryData: Omit<CheckinHistoryEntry, 'id'>): Promise<CheckinHistoryEntry> {
    return addFirebaseCheckinHistory(entryData);
}

export async function getCheckinsForDate(date: string): Promise<CheckinHistoryEntry[]> {
    return getFirebaseCheckinHistoryForDate(date);
}
