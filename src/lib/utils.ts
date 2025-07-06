import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateAge(dobString: string): number | null {
  if (!dobString) {
    return null;
  }

  const parts = dobString.split(/[.\/-]/);
  
  if (parts.length !== 3) {
    const fallbackDate = new Date(dobString);
    if(isNaN(fallbackDate.getTime())) {
      console.warn('Invalid date format:', dobString);
      return null;
    }
    
    const today = new Date();
    let age = today.getFullYear() - fallbackDate.getFullYear();
    const m = today.getMonth() - fallbackDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < fallbackDate.getDate())) {
      age--;
    }
    return age < 0 ? null : age;
  }

  let year, month, day;
  
  if (parts[0].length === 4) { // YYYY-MM-DD
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } 
  else if (parts[2].length === 4) { // DD.MM.YYYY
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else {
    console.warn('Unrecognized date format:', dobString);
    return null;
  }

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12) {
    console.warn('Invalid date parts after parsing:', dobString);
    return null;
  }

  const birthDate = new Date(Date.UTC(year, month - 1, day));

  if (isNaN(birthDate.getTime())) {
    console.warn('Constructed invalid date:', dobString);
    return null;
  }

  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const m = today.getUTCMonth() - birthDate.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
    age--;
  }
  return age < 0 ? null : age;
}
