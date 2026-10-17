import { useEffect, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth } from "./firebase";

export function useAdminUser() {
  const [state, setState] = useState<{ user: User | null; ready: boolean }>({ user: null, ready: false });
  useEffect(() => onAuthStateChanged(auth, (user) => setState({ user, ready: true })), []);
  return state;
}

export const signInWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export const signOutAdmin = () => signOut(auth);

/** fetch مع إرفاق Firebase ID token تلقائيًا. */
export async function adminFetch(path: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(path, { ...init, headers, cache: "no-store" });
}
