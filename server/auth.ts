import type { Request } from "express";
import { adminAuth } from "./firebaseAdmin.js";

export type AdminAccess = "allowed" | "login" | "forbidden";

const list = (value: string | undefined) =>
  (value ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);

/** Verifies the Firebase ID token sent as `Authorization: Bearer <token>` and checks admin rights. */
export async function adminAccess(req: Request): Promise<AdminAccess> {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return "login";

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token);
  } catch {
    return "login";
  }

  if (decoded.admin === true) return "allowed"; // custom claim
  if (list(process.env.ADMIN_UIDS).includes(decoded.uid.toLowerCase())) return "allowed";
  const email = decoded.email?.toLowerCase();
  if (email && decoded.email_verified === true && list(process.env.ADMIN_EMAILS).includes(email)) return "allowed";
  return "forbidden";
}
