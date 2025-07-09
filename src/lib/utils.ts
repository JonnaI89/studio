import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateAge(dobString: string): number | null {
  if (!dobString || typeof dobString !== 'string') {
    return null;
  }

  const dateStr = dobString.trim();
  let parts;
  let year, month, day;

  // Try parsing YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  parts = dateStr.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (parts) {
    year = parseInt(parts[1], 10);
    month = parseInt(parts[2], 10);
    day = parseInt(parts[3], 10);
  } else {
    // Try parsing DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
    parts = dateStr.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
    if (parts) {
      day = parseInt(parts[1], 10);
      month = parseInt(parts[2], 10);
      year = parseInt(parts[3], 10);
    } else {
      console.warn('Unrecognized date format:', dateStr);
      return null; // Format not recognized
    }
  }

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
     console.warn('Invalid date parts after parsing:', dateStr);
    return null;
  }

  // month is 1-based, Date constructor needs 0-based
  const birthDate = new Date(year, month - 1, day);

  // Additional validation to see if the constructed date is valid (e.g., for Feb 30)
  if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
      console.warn('Constructed invalid date (e.g. Feb 30):', dateStr);
      return null;
  }
  
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
