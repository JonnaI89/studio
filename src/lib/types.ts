export type Driver = {
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD
  club: string;
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
