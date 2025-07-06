"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
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
