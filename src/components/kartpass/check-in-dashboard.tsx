"use client";

import { useState, useEffect, useCallback } from "react";
import type { Driver } from "@/lib/types";
import { mockDrivers } from "@/lib/mock-data";
import { KartPassLogo } from "@/components/icons/kart-pass-logo";
import { Scanner } from "./scanner";
import { DriverInfoCard } from "./driver-info-card";

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

  const handleScan = useCallback(() => {
    setDriver(null);
    setIsCheckedIn(false);
    setCheckInTime(null);

    setTimeout(() => {
      const randomDriver =
        mockDrivers[Math.floor(Math.random() * mockDrivers.length)];
      setDriver(randomDriver);
    }, 2000);
  }, []);

  useEffect(() => {
    handleScan();
  }, [handleScan]);

  const handleCheckIn = () => {
    setIsCheckedIn(true);
    setCheckInTime(new Date().toLocaleTimeString('no-NO'));
  };
  
  const handleReset = () => {
    handleScan();
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
