'use server';

import { 
    addFirebaseTrainingSignup, 
    getFirebaseTrainingSignupsByDate,
    getFirebaseTrainingSettings,
    updateFirebaseTrainingSettings
} from './firebase-service';
import type { TrainingSignup, TrainingSettings } from '@/lib/types';

export async function addTrainingSignup(signupData: Omit<TrainingSignup, 'id'>): Promise<string> {
    return addFirebaseTrainingSignup(signupData);
}

export async function getSignupsByDate(date: string): Promise<TrainingSignup[]> {
    return getFirebaseTrainingSignupsByDate(date);
}

export async function getTrainingSettings(): Promise<TrainingSettings> {
    return getFirebaseTrainingSettings();
}

export async function updateTrainingSettings(settings: TrainingSettings): Promise<void> {
    return updateFirebaseTrainingSettings(settings);
}
