export type Driver = {
  id: string; // This will be the Firebase Auth UID
  rfid: string;
  email: string;
  name: string;
  dob: string; // YYYY-MM-DD
  club: string;
  role: 'admin' | 'driver';
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
  paymentStatus: 'paid' | 'unpaid';
};

export type TrainingSignup = {
  id: string; // auto-generated doc id
  driverId: string;
  driverName: string;
  driverKlasse: string | undefined;
  trainingDate: string; // YYYY-MM-DD
  signedUpAt: string; // ISO string
};
