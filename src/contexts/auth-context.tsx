"use client";

import { createContext, useState, useEffect, ReactNode } from "react";
import { onAuthStateChanged } from "@/services/auth-service";
import { getAnyFirebaseDriverByAuthUid } from "@/services/firebase-service";
import type { User } from "firebase/auth";
import type { Driver } from "@/lib/types";
import { LoaderCircle } from "lucide-react";

interface AuthContextType {
  user: User | null;
  profile: Driver | null;
  loading: boolean;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        // We get *any* driver profile associated with the auth user
        // This is primarily for the isAdmin check
        const driverProfile = await getAnyFirebaseDriverByAuthUid(user.uid);
        setProfile(driverProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === "admin",
  };

  if (loading) {
    return (
        <div className="w-full h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <LoaderCircle className="h-10 w-10 animate-spin" />
            <p className="text-lg">Laster...</p>
        </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
