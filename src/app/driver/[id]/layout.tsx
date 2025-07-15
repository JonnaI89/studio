
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
  const { user, loading, isAdmin, profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pageDriverId = params.id as string;

  useEffect(() => {
    if (!loading) {
      if (isAdmin) {
        return;
      }
      if (!user) {
        router.push("/login");
        return;
      }
      
      const userHasAccessToThisDriver = profile?.drivers.some(d => d.id === pageDriverId);

      if (!userHasAccessToThisDriver) {
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

  const userHasAccessToThisDriver = profile?.drivers.some(d => d.id === pageDriverId);

  // Extra check to avoid "flash" of content
  if (!isAdmin && !userHasAccessToThisDriver) {
     return (
        <div className="w-full h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <LoaderCircle className="h-10 w-10 animate-spin" />
            <p className="text-lg">Omdirigerer...</p>
        </div>
    )
  }

  return <>{children}</>;
}
