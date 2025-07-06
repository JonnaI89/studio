'use server';

import { addFirebaseTrainingSignup, getFirebaseTrainingSignupsByDate } from './firebase-service';
import type { TrainingSignup } from '@/lib/types';

export async function addTrainingSignup(signupData: Omit<TrainingSignup, 'id'>): Promise<string> {
    return addFirebaseTrainingSignup(signupData);
}

export async function getSignupsByDate(date: string): Promise<TrainingSignup[]> {
    return getFirebaseTrainingSignupsByDate(date);
}
