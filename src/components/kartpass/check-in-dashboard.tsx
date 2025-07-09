
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Driver, CheckedInEntry, SiteSettings, Race } from "@/lib/types";
import { getDrivers, getDriverByRfid } from "@/services/driver-service";
import { getSiteSettings } from "@/services/settings-service";
import { recordCheckin, getCheckinsForDate } from "@/services/checkin-service";
import { FoererportalenLogo } from "@/components/icons/kart-pass-logo";
import { DriverInfoCard } from "./driver-info-card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { List, UserPlus, Users, LoaderCircle, CalendarDays, Settings, Image as ImageIcon, Flag, AlertTriangle, ScanLine, FilePlus2, Bike } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckedInTable } from "./checked-in-table";
import { ManualCheckInForm } from "./manual-check-in-form";
import { DriverManagementDialog } from "./driver-management-dialog";
import { PaymentDialog } from "./payment-dialog";
import { calculateAge } from "@/lib/utils";
import { TrainingSignupsDialog } from "./training-signups-dialog";
import Link from "next/link";
import { OneTimeLicenseCheckinDialog } from "./one-time-license-checkin-dialog";

interface CheckInDashboardProps {
    todaysRaces?: Race[];
}

export function CheckInDashboard({ todaysRaces = [] }: CheckInDashboardProps) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const { toast } = useToast();
  const [checkedInDrivers, setCheckedInDrivers] = useState<CheckedInEntry[]>([]);
  const [isManualCheckInOpen, setIsManualCheckInOpen] = useState(false);
  const [isDriverMgmtOpen, setIsDriverMgmtOpen] = useState(false);
  const [isSignupsOpen, setIsSignupsOpen] = useState(false);
  const [newRfidId, setNewRfidId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [driverForPayment, setDriverForPayment] = useState<Driver | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [isRfidAlertOpen, setIsRfidAlertOpen] = useState(false);
  const [isOneTimeLicenseOpen, setIsOneTimeLicenseOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Race | 'training' | null>(null);

  const rfidInputBuffer = useRef<string>('');
  const rfidTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (todaysRaces && todaysRaces.length === 1) {
      setSelectedEvent(todaysRaces[0]);
    } else if (!todaysRaces || todaysRaces.length === 0) {
      setSelectedEvent('training');
    }
  }, [todaysRaces]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [fetchedDrivers, fetchedSettings, fetchedCheckins] = await Promise.all([
        getDrivers(),
        getSiteSettings(),
        getCheckinsForDate(today),
      ]);
      
      setDrivers(fetchedDrivers);
      setSiteSettings(fetchedSettings);
      
      const reconstructedCheckins: CheckedInEntry[] = fetchedCheckins.map(historyEntry => {
          const driverProfile = fetchedDrivers.find(d => d.id === historyEntry.driverId);
          
          if (driverProfile) {
              return {
                  driver: driverProfile,
                  checkInTime: historyEntry.checkinTime,
                  paymentStatus: historyEntry.paymentStatus,
              };
          }

          if (historyEntry.paymentStatus === 'one_time_license') {
              return {
                  driver: {
                      id: historyEntry.driverId,
                      name: historyEntry.driverName,
                      rfid: `onetime_${historyEntry.driverId}`,
                      club: 'Engangslisens',
                      dob: '2000-01-01',
                      email: '',
                      role: 'driver',
                      hasSeasonPass: false,
                      klasse: historyEntry.driverKlasse,
                  },
                  checkInTime: historyEntry.checkinTime,
                  paymentStatus: historyEntry.paymentStatus,
              };
          }
          
          return {
              driver: {
                  id: historyEntry.driverId,
                  name: `${historyEntry.driverName} (Slettet)`,
                  rfid: 'unknown',
                  club: 'Ukjent',
                  dob: '2000-01-01',
                  email: '',
                  role: 'driver',
              },
              checkInTime: historyEntry.checkinTime,
              paymentStatus: historyEntry.paymentStatus,
          };
      });

      setCheckedInDrivers(reconstructedCheckins);

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil ved henting av data',
        description:
          (error as Error).message || 'Kunne ikke laste data fra Firebase.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const processRfidScan = useCallback(async (rfid: string) => {
    try {
        const foundDriver = await getDriverByRfid(rfid);
        if (foundDriver) {
            setDriver(foundDriver);
        } else {
            setNewRfidId(rfid);
            setIsRfidAlertOpen(true);
        }
    } catch(error) {
       toast({
        variant: 'destructive',
        title: 'Feil ved søk',
        description: (error as Error).message,
      });
    }
  }, [toast]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.hasAttribute('role'))) {
          return;
      }
      
      if (rfidTimeoutRef.current) {
        clearTimeout(rfidTimeoutRef.current);
      }

      if (event.key === 'Enter') {
        if (rfidInputBuffer.current.length > 3) {
          processRfidScan(rfidInputBuffer.current);
        }
        rfidInputBuffer.current = '';
        return;
      }
      
      if (event.key.length === 1) {
         rfidInputBuffer.current += event.key;
      }

      rfidTimeoutRef.current = setTimeout(() => {
        if (rfidInputBuffer.current.length > 3) {
          processRfidScan(rfidInputBuffer.current);
        }
        rfidInputBuffer.current = '';
      }, 200);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (rfidTimeoutRef.current) {
        clearTimeout(rfidTimeoutRef.current);
      }
    };
  }, [processRfidScan]);

  const resetViewAfterDelay = (driverId: string) => {
      setTimeout(() => {
          setDriver((currentDriver) => {
              if (currentDriver?.id === driverId) {
                  return null;
              }
              return currentDriver;
          });
      }, 3500);
  };
  
  const getEventDetails = () => {
    if (selectedEvent === 'training') {
        return { eventType: 'training' as const };
    }
    if (selectedEvent) { 
        return {
            eventType: 'race' as const,
            eventId: selectedEvent.id,
            eventName: selectedEvent.name,
        };
    }
    return { eventType: 'training' as const };
  };

  const handleSeasonPassCheckIn = () => {
    if (!driver) return;
    const now = new Date();
    const time = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = now.toISOString().split('T')[0];
    
    setCheckedInDrivers(prev => {
        const existingEntryIndex = prev.findIndex(entry => entry.driver.id === driver.id);
        const newEntry: CheckedInEntry = { driver, checkInTime: time, paymentStatus: 'season_pass' };
        if (existingEntryIndex > -1) {
            const updatedList = [...prev];
            updatedList[existingEntryIndex] = newEntry;
            return updatedList;
        }
        return [newEntry, ...prev];
    });

    recordCheckin({
        driverId: driver.id,
        driverName: driver.name,
        driverKlasse: driver.klasse,
        checkinDate: date,
        checkinTime: time,
        paymentStatus: 'season_pass',
        ...getEventDetails()
    }).catch(err => {
        console.error("Failed to record check-in", err);
        toast({
            variant: 'destructive',
            title: 'Lagringsfeil',
            description: 'Innsjekkingen ble ikke lagret i historikken.'
        })
    });

    toast({
        title: 'Innsjekk Vellykket (Årskort)',
        description: `${driver.name} er nå sjekket inn.`,
    });
    
    resetViewAfterDelay(driver.id);
  };
  
  const handleCheckIn = () => {
    if (!driver) return;
    
    if (driver.hasSeasonPass) {
      handleSeasonPassCheckIn();
    } else {
      setDriverForPayment(driver);
      setIsPaymentOpen(true);
    }
  };
  
  const handlePaymentSuccess = () => {
    if (!driverForPayment) return;
    const now = new Date();
    const time = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = now.toISOString().split('T')[0];
    
    setCheckedInDrivers(prev => {
        const existingEntryIndex = prev.findIndex(entry => entry.driver.id === driverForPayment.id);
        const newEntry: CheckedInEntry = { driver: driverForPayment, checkInTime: time, paymentStatus: 'paid' };
        if (existingEntryIndex > -1) {
            const updatedList = [...prev];
            updatedList[existingEntryIndex] = newEntry;
            return updatedList;
        }
        return [newEntry, ...prev];
    });

    recordCheckin({
        driverId: driverForPayment.id,
        driverName: driverForPayment.name,
        driverKlasse: driverForPayment.klasse,
        checkinDate: date,
        checkinTime: time,
        paymentStatus: 'paid',
        ...getEventDetails()
    }).catch(err => {
        console.error("Failed to record check-in", err);
        toast({
            variant: 'destructive',
            title: 'Lagringsfeil',
            description: 'Innsjekkingen ble ikke lagret i historikken.'
        })
    });

    toast({
        title: 'Betaling Vellykket',
        description: `${driverForPayment.name} er nå sjekket inn.`,
    });

    resetViewAfterDelay(driverForPayment.id);
    setIsPaymentOpen(false);
    setDriverForPayment(null);
  };
  
  const handleOneTimeLicenseCheckIn = (name: string, licenseNumber: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = now.toISOString().split('T')[0];
    
    const oneTimeDriver: Driver = {
        id: `onetime_${Date.now()}`,
        name: name,
        rfid: `onetime_${licenseNumber}`,
        club: 'Engangslisens',
        dob: '2000-01-01',
        email: '',
        role: 'driver',
        hasSeasonPass: false,
        driverLicense: licenseNumber,
        klasse: 'Engangslisens',
    };

    recordCheckin({
        driverId: oneTimeDriver.id,
        driverName: oneTimeDriver.name,
        driverKlasse: oneTimeDriver.klasse,
        checkinDate: date,
        checkinTime: time,
        paymentStatus: 'one_time_license',
        ...getEventDetails()
    }).catch(err => {
        console.error("Failed to record one-time license check-in", err);
        toast({
            variant: 'destructive',
            title: 'Lagringsfeil',
            description: 'Innsjekkingen ble ikke lagret i historikken.'
        })
    });

    const newEntry: CheckedInEntry = {
        driver: oneTimeDriver,
        checkInTime: time,
        paymentStatus: 'one_time_license' 
    };

    setCheckedInDrivers(prev => [newEntry, ...prev]);

    toast({
        title: 'Innsjekk Vellykket (Engangslisens)',
        description: `${name} er nå sjekket inn.`,
    });
  };

  const handleReset = () => {
    setDriver(null);
  }

  const handleManualSelect = (selectedDriver: Driver) => {
    setDriver(selectedDriver);
  };

  if (todaysRaces && todaysRaces.length > 1 && !selectedEvent) {
    return (
      <div className="w-full flex-1 flex flex-col justify-center items-center">
        <div className="w-full max-w-lg flex flex-col items-center gap-8 text-center">
          <FoererportalenLogo />
          <Card className="w-full shadow-lg">
            <CardHeader>
              <CardTitle>Velg Arrangement</CardTitle>
              <CardDescription>
                Det er flere arrangementer i dag. Velg hvilket du vil sjekke inn til.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {todaysRaces.map(race => (
                <Button key={race.id} onClick={() => setSelectedEvent(race)} size="lg">
                  <Flag className="mr-2 h-5 w-5" />
                  {race.name}
                </Button>
              ))}
              <Button onClick={() => setSelectedEvent('training')} variant="outline" size="lg">
                <Bike className="mr-2 h-5 w-5" />
                Vanlig Trening
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const driverAge = driver ? calculateAge(driver.dob) : null;
  const currentDriverCheckIn = checkedInDrivers.find(entry => entry.driver.id === driver?.id);
  const eventName = selectedEvent === 'training' ? 'dagens trening' : selectedEvent?.name;

  return (
    <div className="w-full flex flex-col items-center gap-8">
      <header className="w-full flex justify-between items-start">
        <div>
            <FoererportalenLogo />
            {eventName && <p className="text-sm text-muted-foreground -mt-2">Innsjekk for: <span className="font-semibold">{eventName}</span></p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
            <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={isLoading}>
                    <List className="mr-2 h-4 w-4" />
                    Vis Innsjekkede
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Innsjekkede Førere</DialogTitle>
                    <DialogDescription>
                      Liste over alle førere som har sjekket inn i denne økten.
                    </DialogDescription>
                  </DialogHeader>
                  <CheckedInTable entries={checkedInDrivers} />
                </DialogContent>
            </Dialog>

            <Dialog open={isManualCheckInOpen} onOpenChange={setIsManualCheckInOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={isLoading}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Manuelt Søk
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Manuell Innsjekk</DialogTitle>
                    <DialogDescription>
                      Søk etter en fører for å sjekke dem inn manuelt.
                    </DialogDescription>
                  </DialogHeader>
                  <ManualCheckInForm 
                    drivers={drivers} 
                    onDriverSelect={handleManualSelect}
                    closeDialog={() => setIsManualCheckInOpen(false)}
                  />
                </DialogContent>
            </Dialog>

            <Dialog open={isOneTimeLicenseOpen} onOpenChange={setIsOneTimeLicenseOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" disabled={isLoading}>
                        <FilePlus2 className="mr-2 h-4 w-4" />
                        Engangslisens
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <OneTimeLicenseCheckinDialog 
                        onCheckIn={handleOneTimeLicenseCheckIn} 
                        closeDialog={() => setIsOneTimeLicenseOpen(false)} 
                    />
                </DialogContent>
            </Dialog>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" disabled={isLoading}>
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">Innstillinger og administrasjon</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Administrasjon</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setIsDriverMgmtOpen(true)}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Føreradministrasjon</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsSignupsOpen(true)}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        <span>Påmeldte (Trening)</span>
                    </DropdownMenuItem>
                     <DropdownMenuSeparator />
                    <DropdownMenuLabel>Innstillinger</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/admin/races">
                            <Flag className="mr-2 h-4 w-4" />
                            Løpsinnstillinger
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                         <Link href="/admin/training-settings">
                            <Bike className="mr-2 h-4 w-4" />
                            Treningsinnstillinger
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/admin/site-settings">
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Generelle Innstillinger
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialogs controlled from menu */}
            <Dialog open={isDriverMgmtOpen} onOpenChange={setIsDriverMgmtOpen}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                     <DialogHeader>
                        <DialogTitle>Føreradministrasjon</DialogTitle>
                        <DialogDescription>
                          Administrer, rediger og legg til nye førere i systemet.
                        </DialogDescription>
                    </DialogHeader>
                    <DriverManagementDialog 
                        drivers={drivers}
                        onDatabaseUpdate={fetchData}
                    />
                </DialogContent>
            </Dialog>
            <Dialog open={isSignupsOpen} onOpenChange={setIsSignupsOpen}>
                <DialogContent className="max-w-4xl">
                     <DialogHeader>
                        <DialogTitle>Påmeldte til Trening</DialogTitle>
                        <DialogDescription>
                          Velg en dato i kalenderen for å se hvem som er påmeldt, sortert etter klasse.
                        </DialogDescription>
                    </DialogHeader>
                    <TrainingSignupsDialog checkedInEntries={checkedInDrivers}/>
                </DialogContent>
            </Dialog>
        </div>
      </header>

      <div className="w-full max-w-lg min-h-[550px] flex items-center justify-center">
        {isLoading || !selectedEvent ? (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <LoaderCircle className="h-10 w-10 animate-spin" />
                <p className="text-lg">Laster data fra Firebase...</p>
            </div>
        ) : driver ? (
          <DriverInfoCard 
            driver={driver} 
            age={driverAge} 
            onCheckIn={handleCheckIn} 
            onReset={handleReset}
            isCheckedIn={!!currentDriverCheckIn}
            checkInTime={currentDriverCheckIn?.checkInTime ?? null}
            paymentStatus={currentDriverCheckIn?.paymentStatus ?? null}
          />
        ) : (
          <Card className="w-full animate-in fade-in-50 shadow-lg">
            <CardHeader className="text-center">
              <ScanLine className="mx-auto h-24 w-24 text-primary animate-pulse" />
              <CardTitle className="text-2xl pt-4">Venter på skanning...</CardTitle>
              <CardDescription>
                Hold RFID-brikken over leseren for å sjekke inn til {eventName}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-center text-muted-foreground">
                Hvis skanningen ikke fungerer, sørg for at leseren er i "Keyboard/HID"-modus.
              </p>
            </CardContent>
          </Card>
        )}

        <PaymentDialog 
            isOpen={isPaymentOpen}
            onOpenChange={setIsPaymentOpen}
            onConfirm={handlePaymentSuccess}
            driver={driverForPayment}
            settings={siteSettings}
        />
         <AlertDialog open={isRfidAlertOpen} onOpenChange={setIsRfidAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-amber-500" />Ukjent RFID-brikke</AlertDialogTitle>
                    <AlertDialogDescription>
                        RFID-brikken med ID <span className="font-mono bg-muted p-1 rounded-sm">{newRfidId}</span> er ikke registrert i systemet.
                        <br /><br />
                        For å registrere denne føreren, gå til "Føreradministrasjon" (tannhjul-ikonet øverst) og velg "Registrer ny fører". Du må fylle inn denne RFID-IDen i skjemaet.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setIsRfidAlertOpen(false)}>Lukk</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
