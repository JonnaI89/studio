
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import type { Driver, DriverProfile } from "@/lib/types";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin, profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pageDriverId = params.id as string;

  useEffect(() => {
    if (!loading) {
      if (isAdmin) {
        // Admins can view any driver profile
        return;
      }
      
      const driverProfile = profile as DriverProfile;

      if (!user || !driverProfile) {
        router.push("/login");
        return;
      }
      
      // Check if the viewed driver ID belongs to the logged-in user's profile
      const isAuthorized = driverProfile.drivers.some(d => d.id === pageDriverId);

      if (!isAuthorized) {
        router.push("/login");
      }
    }
  }, [user, loading, isAdmin, pageDriverId, router, profile]);

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <LoaderCircle className="h-10 w-10 animate-spin" />
        <p className="text-lg">Verifiserer tilgang...</p>
      </div>
    );
  }

  // Extra check to avoid "flash" of content
  if (!isAdmin && profile) {
     const driverProfile = profile as DriverProfile;
     const isAuthorized = driverProfile.drivers.some(d => d.id === pageDriverId);
     if (!isAuthorized) {
        return (
            <div className="w-full h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <LoaderCircle className="h-10 w-10 animate-spin" />
                <p className="text-lg">Omdirigerer...</p>
            </div>
        )
     }
  }

  return <>{children}</>;
}
