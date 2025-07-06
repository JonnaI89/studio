'use server';

import {
    getFirebaseSiteSettings,
    updateFirebaseSiteSettings,
} from './firebase-service';
import type { SiteSettings } from '@/lib/types';


export async function getSiteSettings(): Promise<SiteSettings> {
    return getFirebaseSiteSettings();
}

export async function updateSiteSettings(settings: SiteSettings): Promise<void> {
    return updateFirebaseSiteSettings(settings);
}
