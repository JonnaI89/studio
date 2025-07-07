'use server';

import { 
    addFirebaseTrainingSignup, 
    getFirebaseTrainingSignupsByDate,
    getFirebaseTrainingSettings,
    updateFirebaseTrainingSettings,
    deleteFirebaseTrainingSignup
} from './firebase-service';
import type { TrainingSignup, TrainingSettings } from '@/lib/types';

export async function addTrainingSignup(signupData: Omit<TrainingSignup, 'id'>): Promise<TrainingSignup> {
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

export async function deleteTrainingSignup(signupId: string): Promise<void> {
    return deleteFirebaseTrainingSignup(signupId);
}
