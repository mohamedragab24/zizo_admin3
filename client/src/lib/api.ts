import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { auth } from "./firebase";

export function useAdminUser() {
  const [state, setState] = useState<{ user: User | null; ready: boolean }>({ user: null, ready: false });
  useEffect(() => onAuthStateChanged(auth, (user) => setState({ user, ready: true })), []);
  return state;
}

export const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export const signOutAdmin = () => signOut(auth);

export async function getSignupOpen(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/status", { cache: "no-store" });
    if (!response.ok) return false;
    return Boolean((await response.json()).signupOpen);
  } catch { return false; }
}

/** ينشئ الحساب في Firebase عبر السيرفر (أول حساب = مدير) ثم يسجل الدخول به. */
export async function signUp(name: string, email: string, password: string) {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "تعذر إنشاء الحساب");
  }
  await signInWithEmail(email, password);
}

/** fetch مع إرفاق Firebase ID token تلقائيًا. */
export async function adminFetch(path: string, init: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(path, { ...init, headers, cache: "no-store" });
}
