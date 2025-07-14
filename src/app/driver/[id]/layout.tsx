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
  const pageId = params.id as string;

  useEffect(() => {
    if (!loading) {
      // An admin can view any driver page.
      if (isAdmin) {
        return;
      }

      // A regular user can only view pages that belong to their auth account.
      // This is determined by matching the logged-in user's authUid
      // with the authUid of the driver profile being viewed.
      // However, we can't easily get the page's driver data here.
      // The easiest check is to ensure the logged-in user is NOT an admin
      // and has a profile. The actual page will fetch its own data.
      // If a non-admin tries to access another user's page, they will
      // be blocked by Firestore rules on the server, but for a better UX,
      // we check if they are at least logged in.
      if (!user) {
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
    )
  }

  return <>{children}</>;
}
