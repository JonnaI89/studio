"use client";

import { useState, useEffect } from "react";
import type { Driver } from "@/lib/types";
import { mockDrivers } from "@/lib/mock-data";
import { KartPassLogo } from "@/components/icons/kart-pass-logo";
import { Scanner } from "./scanner";
import { DriverInfoCard } from "./driver-info-card";
import { useToast } from "@/hooks/use-toast";

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

export function CheckInDashboard() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [rfidBuffer, setRfidBuffer] = useState('');
  const { toast } = useToast();

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
    setIsCheckedIn(true);
    setCheckInTime(new Date().toLocaleTimeString('no-NO'));
  };
  
  const handleReset = () => {
    setDriver(null);
    setIsCheckedIn(false);
    setCheckInTime(null);
    setRfidBuffer('');
  }

  const driverAge = driver ? calculateAge(driver.dob) : 0;

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-8">
      <header>
        <KartPassLogo />
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
