'use server';

// This functionality is disabled for now due to complexity and security concerns
// with handling API keys in this environment. A more robust solution for bulk
// import could be implemented later if required.

export async function importFromSheetsToFirebase(): Promise<{ success: boolean; count: number; error?: string }> {
    console.warn("Import from Google Sheets is currently disabled.");
    return { 
        success: false, 
        count: 0, 
        error: "Import fra Google Sheets er deaktivert. Kontakt systemutvikler for alternativer." 
    };
}
