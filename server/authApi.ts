import { Router } from "express";
import { z } from "zod";
import { adminAuth, adminDb } from "./firebaseAdmin.js";

const router = Router();
const FIRST_ADMIN_PATH = "meta/firstAdmin";
const ALREADY_EXISTS = 6;

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(200),
  password: z.string().min(8).max(128),
});

// هل التسجيل ما زال مفتوحًا؟ (مفتوح فقط قبل إنشاء أول حساب)
router.get("/auth/status", async (_req, res) => {
  try {
    const snap = await adminDb().doc(FIRST_ADMIN_PATH).get();
    res.setHeader("Cache-Control", "no-store");
    return res.json({ signupOpen: !snap.exists });
  } catch (error) {
    console.error("[Auth status]", error);
    return res.status(500).json({ error: "تعذر الاتصال بقاعدة البيانات." });
  }
});

// إنشاء الحساب: أول حساب فقط يصبح مديرًا بكل الصلاحيات، وبعده يُغلق التسجيل.
router.post("/auth/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "راجع الاسم والبريد الإلكتروني، وكلمة المرور 8 أحرف على الأقل." });
  const { name, email, password } = parsed.data;
  const db = adminDb();
  const auth = adminAuth();
  const closed = { error: "إنشاء الحسابات مغلق، تم إنشاء حساب المدير بالفعل." };

  try {
    if ((await db.doc(FIRST_ADMIN_PATH).get()).exists) return res.status(403).json(closed);

    let uid: string;
    try {
      uid = (await auth.createUser({ email, password, displayName: name })).uid;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/email-already-exists") return res.status(409).json({ error: "هذا البريد مسجل بالفعل." });
      if (code === "auth/invalid-password" || code === "auth/invalid-email") return res.status(400).json({ error: "البريد أو كلمة المرور غير صالحين." });
      throw error;
    }

    // حجز "أول مدير" بشكل ذري: لو سبقنا أحد في نفس اللحظة يفشل create ونحذف الحساب
    try {
      await db.doc(FIRST_ADMIN_PATH).create({ uid, email, createdAt: new Date().toISOString() });
    } catch (error) {
      await auth.deleteUser(uid).catch(() => {});
      if ((error as { code?: number }).code === ALREADY_EXISTS) return res.status(403).json(closed);
      throw error;
    }

    try {
      await auth.setCustomUserClaims(uid, { admin: true });
      await db.doc(`admins/${uid}`).set({ uid, email, name, role: "owner", createdAt: new Date().toISOString() });
    } catch (error) {
      await db.doc(FIRST_ADMIN_PATH).delete().catch(() => {});
      await auth.deleteUser(uid).catch(() => {});
      throw error;
    }
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error("[Auth signup]", error);
    return res.status(500).json({ error: "حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل." });
  }
});

export const authApiRouter = router;
