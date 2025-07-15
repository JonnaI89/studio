
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const driverId = params.id;

  useEffect(() => {
    if (!loading) {
      if (isAdmin) {
        // Admins can view any driver profile
        return;
      }
      if (!user) {
        router.push("/login");
        return;
      }
      if (user.uid !== driverId) {
        // Non-admin users can only view their own profile
        router.push(`/driver/${user.uid}`);
      }
    }
  }, [user, loading, isAdmin, driverId, router]);

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <LoaderCircle className="h-10 w-10 animate-spin" />
        <p className="text-lg">Verifiserer tilgang...</p>
      </div>
    );
  }

  // Extra check to avoid "flash" of content
  if (!isAdmin && user?.uid !== driverId) {
     return (
         <div className="w-full h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
             <LoaderCircle className="h-10 w-10 animate-spin" />
             <p className="text-lg">Omdirigerer...</p>
         </div>
     )
  }

  return <>{children}</>;
}
