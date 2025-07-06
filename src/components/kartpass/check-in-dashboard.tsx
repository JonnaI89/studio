"use client";

import { useState } from "react";
import type { Driver } from "@/lib/types";
import { mockDrivers } from "@/lib/mock-data";
import { KartPassLogo } from "@/components/icons/kart-pass-logo";
import { Scanner } from "./scanner";
import { DriverInfoCard } from "./driver-info-card";
import { Button } from "@/components/ui/button";

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
  const [isScanning, setIsScanning] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  const handleScan = () => {
    setIsScanning(true);
    setDriver(null);
    setIsCheckedIn(false);
    setCheckInTime(null);

    setTimeout(() => {
      const randomDriver =
        mockDrivers[Math.floor(Math.random() * mockDrivers.length)];
      setDriver(randomDriver);
      setIsScanning(false);
    }, 2000);
  };

  const handleCheckIn = () => {
    setIsCheckedIn(true);
    setCheckInTime(new Date().toLocaleTimeString());
  };
  
  const handleReset = () => {
    setDriver(null);
    setIsCheckedIn(false);
    setCheckInTime(null);
  }

  const driverAge = driver ? calculateAge(driver.dob) : 0;

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-8">
      <header>
        <KartPassLogo />
      </header>

      <div className="w-full">
        {!driver && !isScanning && (
            <Scanner onScan={handleScan} isScanning={isScanning} />
        )}

        {isScanning && (
             <Scanner onScan={handleScan} isScanning={isScanning} />
        )}
        
        {driver && !isScanning && (
          <DriverInfoCard 
            driver={driver} 
            age={driverAge} 
            onCheckIn={handleCheckIn} 
            onReset={handleReset}
            isCheckedIn={isCheckedIn}
            checkInTime={checkInTime}
          />
        )}
      </div>
    </div>
  );
}
