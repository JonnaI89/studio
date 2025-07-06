export type Driver = {
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD
  licenseStatus: 'Gyldig' | 'Utløpt' | 'Ingen';
  club: string;
  guardian?: {
    name: string;
    contact: string;
  };
};
