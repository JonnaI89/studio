'use server';

import { 
    addFirebaseTrainingSignup, 
    getFirebaseTrainingSignupsByDate,
    getFirebaseTrainingSettings,
    updateFirebaseTrainingSettings,
    deleteFirebaseTrainingSignup,
    getFirebaseTrainingSignupsByDriver
} from './firebase-service';
import type { TrainingSignup, TrainingSettings } from '@/lib/types';

export async function addTrainingSignup(signupData: Omit<TrainingSignup, 'id'>): Promise<TrainingSignup> {
    return addFirebaseTrainingSignup(signupData);
}

export async function getSignupsByDate(date: string): Promise<TrainingSignup[]> {
    return getFirebaseTrainingSignupsByDate(date);
}

export async function getTrainingSignupsByDriver(driverId: string): Promise<TrainingSignup[]> {
    return getFirebaseTrainingSignupsByDriver(driverId);
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
