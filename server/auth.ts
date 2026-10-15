import type { Request } from "express";
import { adminAuth } from "./firebaseAdmin.js";

export type AdminAccess = "allowed" | "login" | "forbidden";

/** يتحقق من Firebase ID token المرسل كـ `Authorization: Bearer <token>` ومن صلاحية المدير. */
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
  // أول حساب يُنشأ يحصل على claim اسمه admin. ADMIN_UIDS اختياري لإضافة مديرين يدويًا.
  if (decoded.admin === true) return "allowed";
  const extra = (process.env.ADMIN_UIDS ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  return extra.includes(decoded.uid) ? "allowed" : "forbidden";
}
