import type { Driver } from './types';

export const mockDrivers: Driver[] = [
  {
    id: 'rfid-001',
    name: 'Ola Nordmann',
    dob: '1995-08-15',
    club: 'Oslo Karting Klubb',
    driverLicense: 'DL-12345',
    vehicleLicense: 'VL-67890',
  },
  {
    id: 'rfid-002',
    name: 'Kari Bremnes',
    dob: '2008-04-22',
    club: 'Bergen Gokart',
    driverLicense: 'DL-54321',
    vehicleLicense: 'VL-09876',
    guardian: {
      name: 'Lars Bremnes',
      contact: '+47 987 65 432',
      guardianLicense: 'GL-ABCDE',
    },
  },
  {
    id: 'rfid-003',
    name: 'Aksel Lund Svindal',
    dob: '1982-12-26',
    club: 'NMK',
    driverLicense: 'DL-67890',
  },
  {
    id: 'rfid-004',
    name: 'Ingrid Larsen',
    dob: '2010-11-02',
    club: 'Trondheim Motorsport',
    vehicleLicense: 'VL-54321',
    guardian: {
      name: 'Mona Larsen',
      contact: '+47 123 45 678',
    },
  },
  {
    id: 'rfid-005',
    name: 'Bjørn Hansen',
    dob: '2001-06-30',
    club: 'Klubbløs',
  },
  {
    id: 'rfid-006',
    name: 'Silje Våge',
    dob: '2009-01-10',
    club: 'Stavanger Racing',
    driverLicense: 'DL-11223',
    vehicleLicense: 'VL-33445',
     guardian: {
      name: 'Petter Våge',
      contact: '+47 456 78 901',
      guardianLicense: 'GL-FGHIJ',
    },
  },
];
