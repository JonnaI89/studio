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
  const pageId = params.id as string;

  useEffect(() => {
    if (!loading) {
      if (isAdmin) {
        // Admin kan se alle profiler
        return;
      }

      if (!user || user.uid !== pageId) {
        // Hvis ikke admin, og ikke eier av profilen, send til login
        router.push("/login");
      }
    }
  }, [user, loading, isAdmin, pageId, router]);

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <LoaderCircle className="h-10 w-10 animate-spin" />
        <p className="text-lg">Verifiserer tilgang...</p>
      </div>
    );
  }

  // Ekstra sjekk for å unngå "flash" av innhold
  if (!isAdmin && (!user || user.uid !== pageId)) {
     return (
        <div className="w-full h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <LoaderCircle className="h-10 w-10 animate-spin" />
            <p className="text-lg">Omdirigerer...</p>
        </div>
    )
  }

  return <>{children}</>;
}
