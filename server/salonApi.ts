import { Router, type Response } from "express";
import { z } from "zod";
import { adminAccess } from "./auth.js";
import { createSalonBooking, getPublicSalonInfo, getSalonSnapshot, saveSalonSnapshot, validateSalonDiscount, type AdminSalonSnapshot } from "./salonRepository.js";

const router = Router();
const id = (max: number) => z.string().min(1).max(max).regex(/^[^/]+$/);

const adminSnapshotSchema = z.object({
  services: z.array(z.object({ id: id(64), name: z.string().max(120), description: z.string().max(2000), price: z.number().finite().nonnegative(), duration: z.number().finite().positive(), active: z.boolean(), icon: z.string().max(24) })).max(200),
  bookings: z.array(z.object({ id: z.string().max(24), name: z.string().max(160), phone: z.string().max(32), date: z.string().length(10), time: z.string().max(20), serviceIds: z.array(z.string().max(64)).max(8), status: z.enum(["مؤكد", "مكتمل", "ملغي"]), discountCode: z.string().max(40), discountAmount: z.number().finite().nonnegative(), createdAt: z.string().max(10) })).max(5000),
  customers: z.array(z.object({ id: id(64), name: z.string().max(160), phone: z.string().max(32), visits: z.number().int().nonnegative(), blocked: z.boolean() })).max(10000),
  discounts: z.array(z.object({ id: id(64), code: z.string().max(40), kind: z.enum(["percent", "fixed"]), value: z.number().finite().positive(), active: z.boolean(), uses: z.number().int().nonnegative() })).max(500),
  settings: z.object({ shopOpen: z.boolean(), hours: z.array(z.object({ day: z.string().max(20), enabled: z.boolean(), start: z.string().max(5), end: z.string().max(5) })).max(7) }),
});
const bookingSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(9).max(32).regex(/^[+\d\s().-]+$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^(?:0?[1-9]|1[0-2]):[0-5]\d\s*[صم]$/u),
  serviceIds: z.array(z.string().max(64)).min(1).max(8),
  discountCode: z.string().max(40).optional().default(""),
});
const discountSchema = z.object({ code: z.string().trim().min(1).max(40), serviceIds: z.array(z.string().max(64)).min(1).max(8) });

function respondError(res: Response, error: unknown) {
  console.error("[Salon API]", error);
  return res.status(500).json({ error: "حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل." });
}

// ---------- Public endpoints used by the Flutter app ----------
router.get("/mobile/bootstrap", async (_req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    return res.json(await getPublicSalonInfo());
  } catch (error) { return respondError(res, error); }
});

router.post("/mobile/discounts/validate", async (req, res) => {
  const parsed = discountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "أدخل كود خصم واختر خدمة واحدة على الأقل." });
  try {
    const result = await validateSalonDiscount(parsed.data);
    if (!result.ok) return res.status(400).json({ error: result.message });
    return res.json(result);
  } catch (error) { return respondError(res, error); }
});

router.post("/mobile/bookings", async (req, res) => {
  const parsed = bookingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "راجع الاسم ورقم الهاتف والتاريخ والخدمات المختارة." });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (parsed.data.date < today) return res.status(400).json({ error: "اختار تاريخًا من اليوم أو بعده." });
  try {
    const result = await createSalonBooking(parsed.data);
    if (!result.ok) return res.status(result.status).json({ error: result.message });
    return res.status(201).json(result.booking);
  } catch (error) { return respondError(res, error); }
});

// ---------- Admin endpoints (Firebase ID token required) ----------
router.get("/admin/salon", async (req, res) => {
  const access = await adminAccess(req);
  if (access !== "allowed") return res.status(access === "login" ? 401 : 403).json({ error: access === "login" ? "يلزم تسجيل الدخول للوصول إلى لوحة التحكم." : "الحساب مسجل، لكنه لا يملك صلاحية مدير الصالون." });
  try {
    res.setHeader("Cache-Control", "no-store");
    return res.json(await getSalonSnapshot());
  } catch (error) { return respondError(res, error); }
});

router.put("/admin/salon", async (req, res) => {
  const access = await adminAccess(req);
  if (access !== "allowed") return res.status(access === "login" ? 401 : 403).json({ error: access === "login" ? "يلزم تسجيل الدخول لحفظ تغييرات لوحة الإدارة." : "غير مصرح بتعديل بيانات الصالون." });
  const parsed = adminSnapshotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "تعذر حفظ البيانات، راجع القيم المدخلة." });
  try {
    return res.json(await saveSalonSnapshot(parsed.data as AdminSalonSnapshot));
  } catch (error) { return respondError(res, error); }
});

export const salonApiRouter = router;
