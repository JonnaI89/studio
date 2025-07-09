'use server';

import { addFirebaseCheckinHistory } from './firebase-service';
import type { CheckinHistoryEntry } from '@/lib/types';

export async function recordCheckin(entryData: Omit<CheckinHistoryEntry, 'id'>): Promise<CheckinHistoryEntry> {
    return addFirebaseCheckinHistory(entryData);
}
