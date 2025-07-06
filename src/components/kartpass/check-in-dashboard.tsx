"use client";

import { useState, useEffect, useCallback } from "react";
import type { Driver, CheckedInEntry } from "@/lib/types";
import { getDrivers, getDriverByRfid } from "@/services/driver-service";
import { KartPassLogo } from "@/components/icons/kart-pass-logo";
import { Scanner } from "./scanner";
import { DriverInfoCard } from "./driver-info-card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { List, UserPlus, Users, LoaderCircle, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckedInTable } from "./checked-in-table";
import { ManualCheckInForm } from "./manual-check-in-form";
import { RegisterDriverForm } from "./register-driver-form";
import { DriverManagementDialog } from "./driver-management-dialog";
import { PaymentDialog } from "./payment-dialog";
import { calculateAge } from "@/lib/utils";
import { TrainingSignupsDialog } from "./training-signups-dialog";

export function CheckInDashboard() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [rfidBuffer, setRfidBuffer] = useState('');
  const { toast } = useToast();
  const [checkedInDrivers, setCheckedInDrivers] = useState<CheckedInEntry[]>([]);
  const [isManualCheckInOpen, setIsManualCheckInOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isDriverMgmtOpen, setIsDriverMgmtOpen] = useState(false);
  const [isSignupsOpen, setIsSignupsOpen] = useState(false);
  const [newRfidId, setNewRfidId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [driverForPayment, setDriverForPayment] = useState<Driver | null>(null);

  const fetchDrivers = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedDrivers = await getDrivers();
      setDrivers(fetchedDrivers);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil ved henting av data',
        description:
          (error as Error).message || 'Kunne ikke laste førerlisten fra Firebase.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);


  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (rfidBuffer.trim()) {
          const scannedId = rfidBuffer.trim();
          setRfidBuffer('');
          
          try {
            const foundDriver = await getDriverByRfid(scannedId);
            if (foundDriver) {
              setDriver(foundDriver);
            } else {
              setNewRfidId(scannedId);
              setIsRegisterOpen(true);
            }
          } catch(error) {
             toast({
              variant: 'destructive',
              title: 'Feil ved søk',
              description: (error as Error).message,
            });
          }
        }
      } else if (e.key === 'Backspace') {
        setRfidBuffer(prev => prev.slice(0, -1));
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setRfidBuffer(prev => prev + e.key);
      }
    };

    if (!driver && !isRegisterOpen && !isManualCheckInOpen && !isDriverMgmtOpen && !isPaymentOpen && !isSignupsOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rfidBuffer, toast, driver, isRegisterOpen, isManualCheckInOpen, isDriverMgmtOpen, isPaymentOpen, isSignupsOpen]);


  const handleOpenPayment = () => {
    if (!driver) return;
    setDriverForPayment(driver);
    setIsPaymentOpen(true);
  };
  
  const handlePaymentSuccess = () => {
    if (!driverForPayment) return;
    const time = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    setCheckedInDrivers(prev => {
        const existingEntryIndex = prev.findIndex(entry => entry.driver.id === driverForPayment.id);
        const newEntry: CheckedInEntry = { driver: driverForPayment, checkInTime: time, paymentStatus: 'paid' };
        if (existingEntryIndex > -1) {
            const updatedList = [...prev];
            updatedList[existingEntryIndex] = newEntry;
            return updatedList;
        }
        return [...prev, newEntry];
    });

    toast({
        title: 'Betaling Vellykket',
        description: `${driverForPayment.name} er nå sjekket inn.`,
    });

    setIsPaymentOpen(false);
    setDriverForPayment(null);
  };

  const handleReset = () => {
    setDriver(null);
    setRfidBuffer('');
  }

  const handleManualSelect = (selectedDriver: Driver) => {
    setDriver(selectedDriver);
  };

  const handleRegisterSuccess = (newDriver: Driver) => {
    fetchDrivers(); // Refresh the main driver list
    setDriver(newDriver); // Set the newly registered driver as active
    toast({
      title: 'Fører Registrert',
      description: `${newDriver.name} er lagt til og logget inn.`,
    });
  };

  const driverAge = driver ? calculateAge(driver.dob) : null;
  const currentDriverCheckIn = checkedInDrivers.find(entry => entry.driver.id === driver?.id);

  return (
    <div className="w-full max-w-lg flex flex-col items-center gap-8">
      <header className="w-full flex justify-between items-center">
        <KartPassLogo />
        <div className="flex items-center gap-2">
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
                    <TrainingSignupsDialog />
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
                        onDatabaseUpdate={fetchDrivers}
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
            onCheckIn={handleOpenPayment} 
            onReset={handleReset}
            isCheckedIn={!!currentDriverCheckIn}
            checkInTime={currentDriverCheckIn?.checkInTime ?? null}
            paymentStatus={currentDriverCheckIn?.paymentStatus ?? null}
          />
        ) : (
          <Scanner />
        )}

        <PaymentDialog 
            isOpen={isPaymentOpen}
            onOpenChange={setIsPaymentOpen}
            onConfirm={handlePaymentSuccess}
            driver={driverForPayment}
        />

        <Dialog open={isRegisterOpen} onOpenChange={(isOpen) => { if (!isOpen) setNewRfidId(null); setIsRegisterOpen(isOpen); }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Registrer Ny Fører</DialogTitle>
              <DialogDescription>
                Denne RFID-brikken er ikke gjenkjent. Vennligst fyll ut detaljene under for å registrere en ny fører.
              </DialogDescription>
            </DialogHeader>
            {newRfidId && (
              <RegisterDriverForm 
                rfid={newRfidId}
                onRegisterSuccess={handleRegisterSuccess}
                closeDialog={() => setIsRegisterOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
