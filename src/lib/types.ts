export type Driver = {
  id: string; // This will be the Firebase Auth UID
  rfid: string;
  email: string;
  name: string;
  dob: string; // YYYY-MM-DD
  club: string;
  role: 'admin' | 'driver';
  hasSeasonPass?: boolean;
  klasse?: string;
  startNr?: string;
  driverLicense?: string;
  vehicleLicense?: string;
  teamLicense?: string;
  guardian?: {
    name: string;
    contact: string;
    licenses?: string[];
  };
};

export type CheckedInEntry = {
  driver: Driver;
  checkInTime: string;
  paymentStatus: 'paid' | 'unpaid' | 'season_pass';
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
