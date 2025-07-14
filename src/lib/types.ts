export type Guardian = {
  id: string;
  name: string;
  contact: string;
  licenses?: string[];
}

export type Driver = {
  id: string; // The corresponding Firebase Auth user UID, which is also the doc ID.
  rfid: string;
  email: string;
  name: string;
  dob: string; // YYYY-MM-DD, can be empty
  club: string;
  role: 'admin' | 'driver';
  hasSeasonPass?: boolean;
  klasse?: string;
  startNr?: string;
  transponderNr?: string;
  chassiNr?: string;
  motorNr1?: string;
  motorNr2?: string;
  driverLicense?: string;
  vehicleLicense?: string;
  teamLicense?: string;
  guardians?: Guardian[];
};

export type CheckedInEntry = {
  historyId: string;
  driver: Driver;
  checkInTime: string;
  paymentStatus: 'paid' | 'unpaid' | 'season_pass' | 'one_time_license';
};

export type CheckinHistoryEntry = {
  id: string; // Firestore doc ID
  driverId: string;
  driverName: string;
  driverKlasse: string | undefined;
  checkinDate: string; // YYYY-MM-DD
  checkinTime: string; // HH:MM:SS
  paymentStatus: 'paid' | 'unpaid' | 'season_pass' | 'one_time_license';
  eventType: 'training' | 'race';
  eventId?: string; // e.g., raceId
  eventName?: string; // e.g., raceName
};

export type TrainingSignup = {
  id: string; // auto-generated doc id
  driverId: string;
  driverName: string;
  driverKlasse: string | undefined;
  trainingDate: string; // YYYY-MM-DD
  signedUpAt: string; // ISO string
};

export type TrainingRule = {
  id: string;
  month: number; // 0-11
  daysOfWeek: number[]; // 0-6 (Sun-Sat)
  description?: string;
};

export type TrainingSettings = {
  id: 'main'; // Singleton document ID
  year: number;
  rules: TrainingRule[];
};

export type SiteSettings = {
  logoUrl?: string;
  weekdayPrice?: number;
  weekendPrice?: number;
  zettleLinkId?: string;
};

export type ClassFee = {
    klasse: string;
    fee: number;
};

export type Race = {
  id: string; // Firestore document ID
  name: string;
  date: string; // YYYY-MM-DD (Start Date)
  endDate?: string; // YYYY-MM-DD (Optional End Date)
  description: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  createdAt: string; // ISO string
  availableClasses?: string[];
  entryFee?: number;
  classFees?: ClassFee[];
};

export type RaceSignup = {
  id:string; // Firestore document ID
  raceId: string;
  driverId: string;
  driverName: string;
  driverKlasse: string | undefined;
  signedUpAt: string; // ISO string
};
