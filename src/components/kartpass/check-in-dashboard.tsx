
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Driver, CheckedInEntry, SiteSettings } from "@/lib/types";
import { getDrivers, getDriverByRfid } from "@/services/driver-service";
import { getSiteSettings } from "@/services/settings-service";
import { recordCheckin, getCheckinsForDate } from "@/services/checkin-service";
import { FoererportalenLogo } from "@/components/icons/kart-pass-logo";
import { DriverInfoCard } from "./driver-info-card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { List, UserPlus, Users, LoaderCircle, CalendarDays, Settings, Image as ImageIcon, Flag, AlertTriangle, ScanLine, FilePlus2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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

export function CheckInDashboard() {
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

  const rfidInputBuffer = useRef<string>('');
  const rfidTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
          
          // Fallback for a regular driver who has been deleted
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
        paymentStatus: 'season_pass'
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
        paymentStatus: 'paid'
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
        paymentStatus: 'one_time_license'
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

  const driverAge = driver ? calculateAge(driver.dob) : null;
  const currentDriverCheckIn = checkedInDrivers.find(entry => entry.driver.id === driver?.id);

  return (
    <div className="w-full max-w-lg flex flex-col items-center gap-8">
      <header className="w-full flex justify-between items-center">
        <FoererportalenLogo />
        <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="icon" title="Løpsadministrasjon" disabled={isLoading}>
                <Link href="/admin/races">
                    <Flag className="h-5 w-5" />
                </Link>
            </Button>
            <Button asChild variant="outline" size="icon" title="Nettstedinnstillinger" disabled={isLoading}>
                <Link href="/admin/site-settings">
                    <ImageIcon className="h-5 w-5" />
                </Link>
            </Button>
            <Button asChild variant="outline" size="icon" title="Treningsinnstillinger" disabled={isLoading}>
                <Link href="/admin/training-settings">
                    <Settings className="h-5 w-5" />
                </Link>
            </Button>

            <Dialog open={isSignupsOpen} onOpenChange={setIsSignupsOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="icon" title="Påmeldte til trening" disabled={isLoading}>
                        <CalendarDays className="h-5 w-5" />
                        <span className="sr-only">Påmeldte til trening</span>
                    </Button>
                </DialogTrigger>
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

            <Dialog open={isDriverMgmtOpen} onOpenChange={setIsDriverMgmtOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="icon" title="Føreradministrasjon" disabled={isLoading}>
                        <Users className="h-5 w-5" />
                        <span className="sr-only">Føreradministrasjon</span>
                    </Button>
                </DialogTrigger>
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
           
           <Dialog open={isOneTimeLicenseOpen} onOpenChange={setIsOneTimeLicenseOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="icon" title="Sjekk inn med engangslisens">
                        <FilePlus2 className="h-5 w-5" />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <OneTimeLicenseCheckinDialog 
                        onCheckIn={handleOneTimeLicenseCheckIn} 
                        closeDialog={() => setIsOneTimeLicenseOpen(false)} 
                    />
                </DialogContent>
            </Dialog>

           <Dialog open={isManualCheckInOpen} onOpenChange={setIsManualCheckInOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Manuell innsjekk" disabled={isLoading}>
                <UserPlus className="h-5 w-5" />
                <span className="sr-only">Manuell innsjekk</span>
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

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Vis innsjekkede" disabled={isLoading}>
                <List className="h-5 w-5" />
                <span className="sr-only">Vis innsjekkede førere</span>
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
        </div>
      </header>

      <div className="w-full min-h-[550px] flex items-center justify-center">
        {isLoading ? (
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
                Hold RFID-brikken over leseren for å sjekke inn.
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
                        For å registrere denne føreren, gå til "Føreradministrasjon" (person-ikonet øverst) og velg "Registrer ny fører". Du må fylle inn denne RFID-IDen i skjemaet.
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
