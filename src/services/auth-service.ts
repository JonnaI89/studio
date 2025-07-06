"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updatePassword,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase-config";

export function signUp(email: string, password: string): Promise<User> {
  return createUserWithEmailAndPassword(auth, email, password).then(
    (userCredential) => userCredential.user
  );
}

export function signIn(email: string, password: string): Promise<User> {
  return signInWithEmailAndPassword(auth, email, password).then(
    (userCredential) => userCredential.user
  );
}

export function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

export function onAuthStateChanged(callback: (user: User | null) => void) {
  return firebaseOnAuthStateChanged(auth, callback);
}

export async function updateUserPassword(newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Bruker ikke autentisert. Logg inn på nytt for å endre passord.");
  }
  try {
    await updatePassword(user, newPassword);
  } catch (error: any) {
    console.error("Error updating password:", error);
    if (error.code === 'auth/weak-password') {
        throw new Error("Passordet er for svakt. Det må være minst 6 tegn.");
    }
    if (error.code === 'auth/requires-recent-login') {
        throw new Error("Denne handlingen krever nylig innlogging. Logg ut og inn igjen før du prøver på nytt.");
    }
    throw new Error("En ukjent feil oppsto under oppdatering av passord.");
  }
}
