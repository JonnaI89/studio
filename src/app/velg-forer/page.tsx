
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FoererportalenLogo } from "@/components/icons/kart-pass-logo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoaderCircle, User, ArrowRight } from "lucide-react";
import { getCookie, setCookie } from 'cookies-next';
import type { DriverProfile } from "@/lib/types";

export default function VelgForerPage() {
  const { profile, loading, user } = useAuth();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const driverProfile = profile as DriverProfile;

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (driverProfile && driverProfile.drivers.length === 1) {
        // Automatically redirect if there's only one driver
        handleSelectDriver(driverProfile.drivers[0].id);
      }
    }
  }, [loading, user, driverProfile, router]);
  
  const handleSelectDriver = (driverId: string) => {
      setIsNavigating(true);
      setCookie('selectedDriverId', driverId, { path: '/' });
      router.push(`/driver/${driverId}`);
  };

  if (loading || !driverProfile || driverProfile.drivers.length <= 1 || isNavigating) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <LoaderCircle className="h-10 w-10 animate-spin" />
        <p className="text-lg">Laster førerprofiler...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-muted/40">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <FoererportalenLogo />
        </div>
        <Card>
          <CardHeader className="text-center">
            <User className="mx-auto h-12 w-12 text-primary mb-4" />
            <CardTitle>Velg Fører</CardTitle>
            <CardDescription>
              Velg hvilken førerprofil du vil se.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {driverProfile.drivers.map((driver) => (
              <Button
                key={driver.id}
                onClick={() => handleSelectDriver(driver.id)}
                className="w-full justify-between"
                size="lg"
              >
                <span>{driver.name}</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
