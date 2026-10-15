import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// إعدادات الويب في Firebase ليست أسرارًا، ويمكن تغييرها من متغيرات VITE_* عند الحاجة.
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? "AIzaSyAnFMpP6gppJ_sSuzRb5eZDGu98-J7pPGg",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "understand-me-d31f4.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "understand-me-d31f4",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "understand-me-d31f4.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "2843068379",
  appId: env.VITE_FIREBASE_APP_ID ?? "1:2843068379:web:bb4370ded94d65342349fe",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-7R57EV9KDZ",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

if (typeof window !== "undefined") {
  isSupported().then((ok) => { if (ok) getAnalytics(firebaseApp); }).catch(() => {});
}
