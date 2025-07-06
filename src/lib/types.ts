export type Driver = {
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD
  club: string;
  driverLicense?: string;
  vehicleLicense?: string;
  guardian?: {
    name: string;
    contact: string;
    guardianLicense?: string;
  };
};
