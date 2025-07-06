'use server';

import {
    getFirebaseSiteSettings,
    updateFirebaseSiteSettings,
} from './firebase-service';
import type { SiteSettings } from '@/lib/types';
import { storageAdmin } from '@/lib/firebase-admin-config';
import { randomUUID } from 'crypto';


export async function getSiteSettings(): Promise<SiteSettings> {
    return getFirebaseSiteSettings();
}

export async function updateSiteSettings(settings: SiteSettings): Promise<void> {
    return updateFirebaseSiteSettings(settings);
}

export async function uploadAndSaveLogo(formData: FormData): Promise<{ logoUrl: string }> {
    const file = formData.get('logoFile') as File;
    if (!file) {
        throw new Error('Ingen fil ble lastet opp.');
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const filePath = 'site_assets/logo'; // Fixed path for the logo
    const fileInBucket = storageAdmin.file(filePath);
    const uuid = randomUUID(); // For generating a public, permanent URL

    await fileInBucket.save(fileBuffer, {
        metadata: {
            contentType: file.type,
            metadata: {
                firebaseStorageDownloadTokens: uuid, // Required for public URL
            },
        },
    });
    
    // Construct the public, permanent URL
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${storageAdmin.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${uuid}`;
    
    await updateFirebaseSiteSettings({ logoUrl: downloadUrl });

    return { logoUrl: downloadUrl };
}
