"use client";

import { useState, useEffect } from "react";
import type { Driver } from "@/lib/types";
import { mockDrivers } from "@/lib/mock-data";
import { KartPassLogo } from "@/components/icons/kart-pass-logo";
import { Scanner } from "./scanner";
import { DriverInfoCard } from "./driver-info-card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { List, UserPlus } from "lucide-react";
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

function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export type CheckedInEntry = {
  driver: Driver;
  checkInTime: string;
};

export function CheckInDashboard() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [rfidBuffer, setRfidBuffer] = useState('');
  const { toast } = useToast();
  const [checkedInDrivers, setCheckedInDrivers] = useState<CheckedInEntry[]>([]);
  const [isManualCheckInOpen, setIsManualCheckInOpen] = useState(false);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (rfidBuffer.trim()) {
          const foundDriver = mockDrivers.find(d => d.id === rfidBuffer.trim());

          if (foundDriver) {
            setDriver(foundDriver);
            setIsCheckedIn(false);
            setCheckInTime(null);
          } else {
            toast({
              title: "Ukjent RFID",
              description: `Finner ingen fører med ID: ${rfidBuffer}`,
              variant: "destructive",
            });
          }
          setRfidBuffer('');
        }
      } else if (e.key === 'Backspace') {
        setRfidBuffer(prev => prev.slice(0, -1));
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setRfidBuffer(prev => prev + e.key);
      }
    };

    if (!driver) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rfidBuffer, toast, driver]);


  const handleCheckIn = () => {
    if (!driver) return;
    const time = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setIsCheckedIn(true);
    setCheckInTime(time);
    setCheckedInDrivers(prev => [...prev, { driver, checkInTime: time }]);
  };
  
  const handleReset = () => {
    setDriver(null);
    setIsCheckedIn(false);
    setCheckInTime(null);
    setRfidBuffer('');
  }

  const handleManualSelect = (selectedDriver: Driver) => {
    setDriver(selectedDriver);
    setIsCheckedIn(false);
    setCheckInTime(null);
  };

  const driverAge = driver ? calculateAge(driver.dob) : 0;

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-8">
      <header className="w-full flex justify-between items-center">
        <KartPassLogo />
        <div className="flex items-center gap-2">
           <Dialog open={isManualCheckInOpen} onOpenChange={setIsManualCheckInOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
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
                drivers={mockDrivers} 
                onDriverSelect={handleManualSelect}
                closeDialog={() => setIsManualCheckInOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
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
        {driver ? (
          <DriverInfoCard 
            driver={driver} 
            age={driverAge} 
            onCheckIn={handleCheckIn} 
            onReset={handleReset}
            isCheckedIn={isCheckedIn}
            checkInTime={checkInTime}
          />
        ) : (
          <Scanner />
        )}
      </div>
    </div>
  );
}
