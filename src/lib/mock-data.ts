import type { Driver } from './types';

export const mockDrivers: Driver[] = [
  {
    id: 'rfid-001',
    name: 'Ola Nordmann',
    dob: '1995-08-15',
    licenseStatus: 'Gyldig',
    club: 'Oslo Karting Klubb',
  },
  {
    id: 'rfid-002',
    name: 'Kari Bremnes',
    dob: '2008-04-22',
    licenseStatus: 'Gyldig',
    club: 'Bergen Gokart',
    guardian: {
      name: 'Lars Bremnes',
      contact: '+47 987 65 432',
    },
  },
  {
    id: 'rfid-003',
    name: 'Aksel Lund Svindal',
    dob: '1982-12-26',
    licenseStatus: 'Gyldig',
    club: 'NMK',
  },
  {
    id: 'rfid-004',
    name: 'Ingrid Larsen',
    dob: '2010-11-02',
    licenseStatus: 'Utløpt',
    club: 'Trondheim Motorsport',
    guardian: {
      name: 'Mona Larsen',
      contact: '+47 123 45 678',
    },
  },
  {
    id: 'rfid-005',
    name: 'Bjørn Hansen',
    dob: '2001-06-30',
    licenseStatus: 'Ingen',
    club: 'Klubbløs',
  },
  {
    id: 'rfid-006',
    name: 'Silje Våge',
    dob: '2009-01-10',
    licenseStatus: 'Gyldig',
    club: 'Stavanger Racing',
     guardian: {
      name: 'Petter Våge',
      contact: '+47 456 78 901',
    },
  },
];
