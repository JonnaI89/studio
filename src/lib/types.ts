export type Driver = {
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD
  licenseStatus: 'Valid' | 'Expired' | 'None';
  club: string;
  guardian?: {
    name: string;
    contact: string;
  };
};
