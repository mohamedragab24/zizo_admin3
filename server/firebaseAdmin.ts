import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App | null = null;

function loadCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (raw) {
    const json = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
    return cert({
      projectId: json.project_id,
      clientEmail: json.client_email,
      privateKey: String(json.private_key).replace(/\\n/g, "\n"),
    });
  }
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  }
  throw new Error("Firebase credentials are missing: set FIREBASE_SERVICE_ACCOUNT on the server.");
}

function getAdminApp() {
  if (app) return app;
  app = getApps()[0] ?? initializeApp({ credential: loadCredential() });
  return app;
}

export const adminDb = () => getFirestore(getAdminApp());
export const adminAuth = () => getAuth(getAdminApp());
