import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDateString(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }
  
  const cleanedDateStr = dateStr.trim();
  
  // Try parsing YYYY-MM-DD (from Firestore)
  let parts = cleanedDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (parts) {
    const year = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1; // JS months are 0-based
    const day = parseInt(parts[3], 10);
    const date = new Date(Date.UTC(year, month, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
      return date;
    }
  }

  // Try parsing DD.MM.YYYY (from user input)
  parts = cleanedDateStr.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1; // JS months are 0-based
    const year = parseInt(parts[3], 10);
    const date = new Date(Date.UTC(year, month, day));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
        return date;
    }
  }

  return null;
}


export function calculateAge(dobString: string): number | null {
  const birthDate = parseDateString(dobString);
  if (!birthDate) return null;
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age < 0 ? null : age;
}

export function normalizeRfid(rfid: string): string {
  // Strips non-alphanumeric characters and converts to lowercase for consistency.
  return rfid.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}
