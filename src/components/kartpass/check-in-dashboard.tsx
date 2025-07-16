
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Driver, CheckedInEntry, SiteSettings, Race, CheckinHistoryEntry, TrainingSignup } from "@/lib/types";
import { getSiteSettings } from "@/services/settings-service";
import { recordCheckin, deleteCheckin } from "@/services/checkin-service";
import { getRacesForDate, getRaceSignupsWithDriverData, type RaceSignupWithDriver } from "@/services/race-service";
import { FoererportalenLogo } from "@/components/icons/kart-pass-logo";
import { DriverInfoCard } from "./driver-info-card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { List, UserPlus, Users, LoaderCircle, CalendarDays, Image as ImageIcon, Flag, AlertTriangle, ScanLine, FilePlus2, Bike, Trash2, BarChart2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
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
import { calculateAge, normalizeRfid } from "@/lib/utils";
import { TrainingSignupsDialog } from "./training-signups-dialog";
import Link from "next/link";
import { OneTimeLicenseCheckinDialog } from "./one-time-license-checkin-dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { RaceCheckinDialog } from "./race-checkin-dialog";
import { db } from "@/lib/firebase-config";
import { collection, query, where, onSnapshot, orderBy, getDoc, doc } from "firebase/firestore";


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
  const [todaysRaces, setTodaysRaces] = useState<Race[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Race | 'training' | null>(null);
  const [isCheckinsOpen, setIsCheckinsOpen] = useState(false);
  const [checkinToDelete, setCheckinToDelete] = useState<CheckedInEntry | null>(null);
  const [isDeletingCheckin, setIsDeletingCheckin] = useState(false);
  const [raceSignups, setRaceSignups] = useState<RaceSignupWithDriver[]>([]);
  const [trainingSignups, setTrainingSignups] = useState<TrainingSignup[]>([]);
  const [signupForCheckin, setSignupForCheckin] = useState<RaceSignupWithDriver | null>(null);

  const rfidInputBuffer = useRef<string>('');
  const rfidTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTodaysEvents = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const fetchedRaces = await getRacesForDate(today);
      setTodaysRaces(fetchedRaces);

      if (fetchedRaces.length === 1) {
        setSelectedEvent(fetchedRaces[0]);
      } else if (fetchedRaces.length === 0) {
        setSelectedEvent('training');
      } else {
        setSelectedEvent(null); // Show selection screen
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Feil ved henting av løp', description: (error as Error).message });
    }
  }, [toast]);
  
  // Real-time listener for Signups (both training and races)
  useEffect(() => {
    if (!selectedEvent) {
        setRaceSignups([]);
        setTrainingSignups([]);
        return;
    }

    if (typeof selectedEvent === 'object') { // It's a race
        const q = query(collection(db, "raceSignups"), where("raceId", "==", selectedEvent.id));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const fetchedSignups = snapshot.docs.map(doc => doc.data() as RaceSignupWithDriver);
            const signupsWithDriverData = await Promise.all(
                fetchedSignups.map(async (signup) => {
                    if (signup.driverId) {
                        const driverDoc = await getDoc(doc(db, 'drivers', signup.driverId));
                        return { ...signup, driver: driverDoc.exists() ? driverDoc.data() as Driver : null };
                    }
                    return signup;
                })
            );
            setRaceSignups(signupsWithDriverData);
            setTrainingSignups([]); // Clear other type
        }, (error) => {
            console.error("Error listening to race signups:", error);
            toast({ variant: 'destructive', title: 'Feil ved henting av løpspåmeldte', description: "Kunne ikke lytte til sanntidsoppdateringer." });
        });
        return () => unsubscribe();
    } 
    
    if (selectedEvent === 'training') {
        const today = format(new Date(), 'yyyy-MM-dd');
        const q = query(collection(db, "trainingSignups"), where("trainingDate", "==", today));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedSignups = snapshot.docs.map(doc => doc.data() as TrainingSignup);
            setTrainingSignups(fetchedSignups);
            setRaceSignups([]); // Clear other type
        }, (error) => {
            console.error("Error listening to training signups:", error);
            toast({ variant: 'destructive', title: 'Feil ved henting av treningspåmeldte', description: "Kunne ikke lytte til sanntidsoppdateringer." });
        });
        return () => unsubscribe();
    }

  }, [selectedEvent, toast]);


  const mapHistoryToCheckinEntry = (historyEntry: CheckinHistoryEntry, driverProfiles: Driver[]): CheckedInEntry | null => {
    if (historyEntry.paymentStatus === 'one_time_license') {
        return {
            historyId: historyEntry.id,
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
            amountPaid: historyEntry.amountPaid,
            eventType: historyEntry.eventType,
            eventId: historyEntry.eventId,
        };
    }
    
    const driverProfile = driverProfiles.find(d => d.id === historyEntry.driverId);
    
    if (driverProfile) {
        return {
            historyId: historyEntry.id,
            driver: driverProfile,
            checkInTime: historyEntry.checkinTime,
            paymentStatus: historyEntry.paymentStatus,
            amountPaid: historyEntry.amountPaid,
            eventType: historyEntry.eventType,
            eventId: historyEntry.eventId,
        };
    }

    return {
        historyId: historyEntry.id,
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
        amountPaid: historyEntry.amountPaid,
        eventType: historyEntry.eventType,
        eventId: historyEntry.eventId,
    };
  }

  // Initial data fetch for non-realtime data
  const initialFetch = useCallback(async () => {
    setIsLoading(true);
    try {
        const fetchedSettings = await getSiteSettings();
        setSiteSettings(fetchedSettings);
        await fetchTodaysEvents();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Feil ved henting av data',
            description: (error as Error).message || 'Kunne ikke laste innstillinger.',
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast, fetchTodaysEvents]);

  useEffect(() => {
    initialFetch();
  }, [initialFetch]);


  // Realtime listener for Drivers
  useEffect(() => {
    if (!db) return;
    const driversQuery = query(collection(db, "drivers"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(driversQuery, (querySnapshot) => {
        const fetchedDrivers = querySnapshot.docs.map(doc => doc.data() as Driver);
        setDrivers(fetchedDrivers);
    }, (error) => {
        console.error("Error listening to drivers:", error);
        toast({
            variant: "destructive",
            title: "Sanntidsoppdatering feilet",
            description: "Kunne ikke lytte til endringer i førere."
        });
    });
    return () => unsubscribe();
  }, [toast]);


  // Realtime listener for Check-ins
  useEffect(() => {
    if (!db) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const q = query(
        collection(db, "checkinHistory"),
        where("checkinDate", "==", today)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const checkinHistory = querySnapshot.docs.map(doc => doc.data() as CheckinHistoryEntry);
        const reconstructedCheckins = checkinHistory
          .map(entry => mapHistoryToCheckinEntry(entry, drivers))
          .filter((entry): entry is CheckedInEntry => entry !== null);
        
        reconstructedCheckins.sort((a, b) => b.checkInTime.localeCompare(a.checkInTime));
        setCheckedInDrivers(reconstructedCheckins);
    }, (error) => {
        console.error("Error listening to check-in history:", error);
        toast({
            variant: "destructive",
            title: "Sanntidsoppdatering feilet",
            description: "Kunne ikke lytte til endringer i innsjekkinger."
        });
    });
    
    return () => unsubscribe();
  }, [drivers, toast]);

  const processRfidScan = useCallback(async (rfid: string) => {
    const normalizedRfid = normalizeRfid(rfid);
    const foundDriver = drivers.find(d => d.rfid === normalizedRfid);

    if (foundDriver) {
        setDriver(foundDriver);
    } else {
        setNewRfidId(rfid);
        setIsRfidAlertOpen(true);
    }
  }, [drivers]);

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
    if (selectedEvent && typeof selectedEvent === 'object') { 
        return {
            eventType: 'race' as const,
            eventId: selectedEvent.id,
            eventName: selectedEvent.name,
        };
    }
    return { eventType: 'training' as const };
  };

  const handleSeasonPassCheckIn = async () => {
    if (!driver) return;
    const now = new Date();
    const time = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = now.toISOString().split('T')[0];
    
    try {
        const historyData: Omit<CheckinHistoryEntry, 'id'> = {
            driverId: driver.id,
            driverName: driver.name,
            driverKlasse: driver.klasse,
            checkinDate: date,
            checkinTime: time,
            paymentStatus: 'season_pass',
            ...getEventDetails(),
            amountPaid: 0,
        };
        await recordCheckin(historyData);
        // State update is now handled by the onSnapshot listener

        toast({
            title: 'Innsjekk Vellykket (Årskort)',
            description: `${driver.name} er nå sjekket inn.`,
        });
        
        resetViewAfterDelay(driver.id);
    } catch (err) {
        console.error("Failed to record check-in", err);
        toast({
            variant: 'destructive',
            title: 'Lagringsfeil',
            description: 'Innsjekkingen ble ikke lagret i historikken.'
        })
    }
  };
  
  const handleProceedToPayment = () => {
    if (!driver) return;
    if (isRaceDay) {
      const signup = raceSignups.find(s => s.driverId === driver.id);
      if (signup) {
         setSignupForCheckin(signup);
      } else {
         toast({
           variant: "destructive",
           title: "Ikke påmeldt løp",
           description: `${driver.name} er ikke påmeldt dette løpet.`
         });
      }
    } else {
      if (driver.hasSeasonPass) {
        handleSeasonPassCheckIn();
      } else {
        setDriverForPayment(driver);
        setIsPaymentOpen(true);
      }
    }
  };
  
  const handlePaymentSuccess = async (amountPaid: number) => {
    if (!driverForPayment) return;
    const now = new Date();
    const time = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = now.toISOString().split('T')[0];
    
    try {
        const historyData: Omit<CheckinHistoryEntry, 'id'> = {
            driverId: driverForPayment.id,
            driverName: driverForPayment.name,
            driverKlasse: driverForPayment.klasse,
            checkinDate: date,
            checkinTime: time,
            paymentStatus: 'paid',
            ...getEventDetails(),
            amountPaid: amountPaid
        };

        await recordCheckin(historyData);
        // State update is now handled by the onSnapshot listener

        toast({
            title: 'Betaling Vellykket',
            description: `${driverForPayment.name} er nå sjekket inn.`,
        });

        resetViewAfterDelay(driverForPayment.id);
        setIsPaymentOpen(false);
        setDriverForPayment(null);

    } catch (err) {
        console.error("Failed to record check-in", err);
        toast({
            variant: 'destructive',
            title: 'Lagringsfeil',
            description: 'Innsjekkingen ble ikke lagret i historikken.'
        })
    }
  };
  
  const handleOneTimeLicenseCheckIn = async (name: string, licenseNumber: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = now.toISOString().split('T')[0];
    
    try {
        const historyData: Omit<CheckinHistoryEntry, 'id'> = {
          driverId: `onetime_${Date.now()}`,
          driverName: name,
          driverKlasse: 'Engangslisens',
          checkinDate: date,
          checkinTime: time,
          paymentStatus: 'one_time_license',
          ...getEventDetails(),
        };
        await recordCheckin(historyData);
        // State update is now handled by the onSnapshot listener

        toast({
            title: 'Innsjekk Vellykket (Engangslisens)',
            description: `${name} er nå sjekket inn.`,
        });
    } catch(err) {
        console.error("Failed to record one-time license check-in", err);
        toast({
            variant: 'destructive',
            title: 'Lagringsfeil',
            description: 'Innsjekkingen ble ikke lagret i historikken.'
        })
    }
  };

  const handleReset = () => {
    setDriver(null);
  }

  const handleManualSelect = (selectedDriver: Driver) => {
    setDriver(selectedDriver);
  };

  const handleOpenDeleteDialog = (entry: CheckedInEntry) => {
    setCheckinToDelete(entry);
  };

  const handleConfirmDeleteCheckin = async () => {
    if (!checkinToDelete) return;
    setIsDeletingCheckin(true);
    try {
      await deleteCheckin(checkinToDelete.historyId);
      // State update is now handled by the onSnapshot listener
      toast({ title: "Innsjekking slettet" });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sletting feilet',
        description: (error as Error).message
      });
    } finally {
      setIsDeletingCheckin(false);
      setCheckinToDelete(null);
    }
  };

  const handleProfileUpdate = (updatedDriver: Driver) => {
    setDriver(updatedDriver); // Update the state for the info card
    // No need to refetch, snapshot listener will handle it.
  };

  const handleRaceCheckinSuccess = () => {
    setSignupForCheckin(null);
    // No need to call fetchData(), onSnapshot listener handles updates
    if (driver) {
      resetViewAfterDelay(driver.id);
    }
  };

  const getSummaryStats = () => {
    if (!selectedEvent) {
      return null;
    }

    if (typeof selectedEvent === 'object') { // Race
      const totalSignups = raceSignups.length;
      const checkedInCount = checkedInDrivers.filter(c => c.eventType === 'race' && c.eventId === selectedEvent.id).length;
      return `Løp: ${totalSignups} påmeldte, ${checkedInCount} sjekket inn.`;
    } else { // Training
      const totalSignups = trainingSignups.length;
      const checkedInCount = checkedInDrivers.filter(c => c.eventType === 'training').length;
      return `Trening: ${totalSignups} påmeldte, ${checkedInCount} sjekket inn.`;
    }
  };


  if (!isLoading && todaysRaces.length > 1 && !selectedEvent) {
    return (
      <div className="w-full flex-1 flex flex-col justify-center items-center p-4 sm:p-8">
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
  const isRaceDay = selectedEvent && typeof selectedEvent === 'object';
  const isSignedUpForRace = driver && isRaceDay && raceSignups.some(s => s.driverId === driver.id);
  const summaryStats = getSummaryStats();

  return (
    <div className="w-full flex-1 flex flex-col">
        <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur-sm">
            <div className="container mx-auto px-4 sm:px-6 md:px-8 py-4 space-y-4">
                <div>
                    <FoererportalenLogo />
                </div>
                <div className="flex items-center justify-start gap-1 flex-wrap">
                    <Button variant="ghost" onClick={() => setIsCheckinsOpen(true)} disabled={isLoading}>
                        <List className="mr-2 h-4 w-4" />
                        Innsjekkede
                    </Button>
                    <Button variant="ghost" onClick={() => setIsManualCheckInOpen(true)} disabled={isLoading}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Manuell Reg.
                    </Button>
                    <Button variant="ghost" onClick={() => setIsOneTimeLicenseOpen(true)} disabled={isLoading}>
                        <FilePlus2 className="mr-2 h-4 w-4" />
                        Engangslisens
                    </Button>
                    <Separator orientation="vertical" className="h-6 mx-2" />
                    <Button variant="ghost" onClick={() => setIsDriverMgmtOpen(true)} disabled={isLoading}>
                        <Users className="mr-2 h-4 w-4" />
                        Føreradmin
                    </Button>
                    <Button variant="ghost" onClick={() => setIsSignupsOpen(true)} disabled={isLoading}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Påmeldte
                    </Button>
                     <Button variant="ghost" asChild disabled={isLoading}>
                        <Link href="/admin/reports">
                            <BarChart2 className="mr-2 h-4 w-4" />
                            Rapporter
                        </Link>
                    </Button>
                    <Separator orientation="vertical" className="h-6 mx-2" />
                    <Button variant="ghost" asChild disabled={isLoading}>
                        <Link href="/admin/races">
                            <Flag className="mr-2 h-4 w-4" />
                            Løp
                        </Link>
                    </Button>
                    <Button variant="ghost" asChild disabled={isLoading}>
                        <Link href="/admin/training-settings">
                            <Bike className="mr-2 h-4 w-4" />
                            Trening
                        </Link>
                    </Button>
                    <Button variant="ghost" asChild disabled={isLoading}>
                        <Link href="/admin/site-settings">
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Nettsted
                        </Link>
                    </Button>
                </div>
            </div>
        </header>
        
        {summaryStats && (
            <div className="container mx-auto px-4 sm:px-6 md:px-8 py-3 text-center text-sm font-medium text-muted-foreground bg-muted/50 border-b">
                {summaryStats}
            </div>
        )}

        <main className="flex-1 flex w-full justify-center">
            <div className="w-full max-w-5xl flex items-center justify-center my-8 px-4">
                {isLoading || !selectedEvent ? (
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <LoaderCircle className="h-10 w-10 animate-spin" />
                        <p className="text-lg">Laster data fra Firebase...</p>
                    </div>
                ) : driver ? (
                <DriverInfoCard 
                    driver={driver} 
                    age={driverAge} 
                    onReset={handleReset}
                    isCheckedIn={!!currentDriverCheckIn}
                    checkInTime={currentDriverCheckIn?.checkInTime ?? null}
                    paymentStatus={currentDriverCheckIn?.paymentStatus ?? null}
                    onProfileUpdate={handleProfileUpdate}
                    isRaceDay={isRaceDay}
                    isSignedUpForRace={isSignedUpForRace}
                    onProceedToPayment={handleProceedToPayment}
                />
                ) : (
                <Card className="w-full max-w-lg animate-in fade-in-50 shadow-lg">
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
            </div>
        </main>

        <Dialog open={isCheckinsOpen} onOpenChange={setIsCheckinsOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Innsjekkede Førere</DialogTitle>
                <DialogDescription>
                  Liste over alle førere som har sjekket inn i denne økten.
                </DialogDescription>
              </DialogHeader>
              <CheckedInTable entries={checkedInDrivers} onDelete={handleOpenDeleteDialog} />
            </DialogContent>
        </Dialog>

        <Dialog open={isManualCheckInOpen} onOpenChange={setIsManualCheckInOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Manuell registrering</DialogTitle>
                <DialogDescription>
                  Søk etter en fører for å registrere dem manuelt for dagens økt.
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
            <DialogContent>
                <OneTimeLicenseCheckinDialog 
                    onCheckIn={handleOneTimeLicenseCheckIn} 
                    closeDialog={() => setIsOneTimeLicenseOpen(false)} 
                />
            </DialogContent>
        </Dialog>

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
        <PaymentDialog 
            isOpen={isPaymentOpen}
            onOpenChange={setIsPaymentOpen}
            onPaymentSuccess={handlePaymentSuccess}
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
                        For å registrere denne føreren, gå til "Føreradministrasjon" og velg "Registrer ny fører". Du må fylle inn denne RFID-IDen i skjemaet.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setIsRfidAlertOpen(false)}>Lukk</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!checkinToDelete} onOpenChange={(isOpen) => !isOpen && setCheckinToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Dette vil slette innsjekkingen for <span className="font-bold">{checkinToDelete?.driver.name}</span>. Handlingen kan ikke angres.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletingCheckin}>Avbryt</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleConfirmDeleteCheckin}
                        disabled={isDeletingCheckin}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeletingCheckin ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Ja, slett innsjekking
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <RaceCheckinDialog
            isOpen={!!signupForCheckin}
            onOpenChange={(isOpen) => !isOpen && setSignupForCheckin(null)}
            signup={signupForCheckin ?? undefined}
            race={typeof selectedEvent === 'object' ? selectedEvent : null}
            settings={siteSettings}
            onCheckinSuccess={handleRaceCheckinSuccess}
        />
    </div>
  );
}
