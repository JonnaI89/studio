
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
        // Admin can see all profiles
        return;
      }

      if (!user || user.uid !== pageId) {
        // If not admin, and not owner of the profile, send to login
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

  // Extra check to avoid "flash" of content
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
