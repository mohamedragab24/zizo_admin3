import { randomBytes, randomUUID } from "node:crypto";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";

export type BookingStatus = "مؤكد" | "مكتمل" | "ملغي";
export type WorkDay = { day: string; enabled: boolean; start: string; end: string };
export type ServiceDoc = { id: string; name: string; description: string; price: number; duration: number; active: boolean; icon: string };
export type CustomerDoc = { id: string; name: string; phone: string; visits: number; blocked: boolean };
export type DiscountDoc = { id: string; code: string; kind: "percent" | "fixed"; value: number; active: boolean; uses: number };
export type BookingServiceSnapshot = { id: string; name: string; price: number; duration: number };
type BookingDoc = {
  id: string; bookingCode: string; customerName: string; phone: string; date: string; time: string;
  serviceItems: BookingServiceSnapshot[]; status: BookingStatus; discountCode: string; discountAmount: number;
  queueAhead: number; createdAt: string;
};

export type AdminSalonSnapshot = {
  services: ServiceDoc[];
  bookings: { id: string; name: string; phone: string; date: string; time: string; serviceIds: string[]; status: BookingStatus; discountCode: string; discountAmount: number; createdAt: string }[];
  customers: CustomerDoc[];
  discounts: DiscountDoc[];
  settings: { shopOpen: boolean; hours: WorkDay[] };
};

export const defaultWorkDays: WorkDay[] = [
  { day: "السبت", enabled: true, start: "10:00", end: "23:00" },
  { day: "الأحد", enabled: true, start: "10:00", end: "23:00" },
  { day: "الاثنين", enabled: true, start: "10:00", end: "23:00" },
  { day: "الثلاثاء", enabled: true, start: "10:00", end: "23:00" },
  { day: "الأربعاء", enabled: true, start: "10:00", end: "23:00" },
  { day: "الخميس", enabled: true, start: "10:00", end: "23:00" },
  { day: "الجمعة", enabled: false, start: "10:00", end: "23:00" },
];

const COL = { services: "services", customers: "customers", discounts: "discounts", bookings: "bookings", settings: "settings" } as const;
const SETTINGS_ID = "main";
const ALREADY_EXISTS = 6;

const sampleServices: ServiceDoc[] = [
  { id: "svc-cut", name: "قص شعر", description: "قصة مرتبة تناسب إطلالتك", price: 150, duration: 30, active: true, icon: "cut" },
  { id: "svc-beard", name: "تهذيب لحية", description: "تحديد وتشذيب باحتراف", price: 100, duration: 20, active: true, icon: "beard" },
  { id: "svc-combo", name: "قص شعر ولحية", description: "إطلالة متكاملة في جلسة واحدة", price: 220, duration: 45, active: true, icon: "combo" },
  { id: "svc-care", name: "عناية بالبشرة", description: "تنظيف وانتعاش بعد الحلاقة", price: 180, duration: 35, active: true, icon: "care" },
];

function bookingTimeMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})\s*([صم])$/u.exec(value.trim());
  if (!match) return null;
  const hour = (Number(match[1]) % 12) + (match[3] === "م" ? 12 : 0);
  return hour * 60 + Number(match[2]);
}

const num = (value: unknown, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const safeId = (id: string) => id.replace(/\//g, "_");

async function ensureInitialized(): Promise<Firestore> {
  const db = adminDb();
  const first = await db.collection(COL.services).limit(1).get();
  if (first.empty) {
    const batch = db.batch();
    for (const item of sampleServices) batch.set(db.collection(COL.services).doc(item.id), item);
    await batch.commit();
  }
  try {
    await db.collection(COL.settings).doc(SETTINGS_ID).create({ country: "EG", currency: "EGP", shopOpen: true, hours: defaultWorkDays });
  } catch (error) {
    if ((error as { code?: number }).code !== ALREADY_EXISTS) throw error;
  }
  return db;
}

export async function getSalonSnapshot(): Promise<AdminSalonSnapshot> {
  const db = await ensureInitialized();
  const [serviceSnap, bookingSnap, customerSnap, discountSnap, settingsSnap] = await Promise.all([
    db.collection(COL.services).get(),
    db.collection(COL.bookings).orderBy("createdAt", "desc").get(),
    db.collection(COL.customers).get(),
    db.collection(COL.discounts).get(),
    db.collection(COL.settings).doc(SETTINGS_ID).get(),
  ]);
  const settings = settingsSnap.data();
  return {
    services: serviceSnap.docs.map((d) => { const x = d.data(); return { id: d.id, name: x.name, description: x.description ?? "", price: num(x.price), duration: num(x.duration, 30), active: Boolean(x.active), icon: x.icon ?? "cut" }; }),
    bookings: bookingSnap.docs.map((d) => { const x = d.data() as BookingDoc; return { id: x.bookingCode, name: x.customerName, phone: x.phone, date: x.date, time: x.time, serviceIds: (x.serviceItems ?? []).map((i) => i.id), status: x.status, discountCode: x.discountCode ?? "", discountAmount: num(x.discountAmount), createdAt: String(x.createdAt ?? "").slice(0, 10) }; }),
    customers: customerSnap.docs.map((d) => { const x = d.data(); return { id: d.id, name: x.name, phone: x.phone, visits: num(x.visits), blocked: Boolean(x.blocked) }; }),
    discounts: discountSnap.docs.map((d) => { const x = d.data(); return { id: d.id, code: x.code, kind: x.kind, value: num(x.value), active: Boolean(x.active), uses: num(x.uses) }; }),
    settings: { shopOpen: Boolean(settings?.shopOpen ?? true), hours: (settings?.hours as WorkDay[] | undefined) ?? defaultWorkDays },
  };
}

type Op = { kind: "set" | "update" | "delete"; ref: FirebaseFirestore.DocumentReference; data?: Record<string, unknown> };

async function commitOps(db: Firestore, ops: Op[]) {
  for (let i = 0; i < ops.length; i += 400) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + 400)) {
      if (op.kind === "set") batch.set(op.ref, op.data!);
      else if (op.kind === "update") batch.update(op.ref, op.data!);
      else batch.delete(op.ref);
    }
    await batch.commit();
  }
}

const changed = (current: Record<string, unknown>, next: Record<string, unknown>) =>
  Object.keys(next).some((key) => JSON.stringify(current[key]) !== JSON.stringify(next[key]));

/** Saves what the admin edited. Only changed documents are written. */
export async function saveSalonSnapshot(snapshot: AdminSalonSnapshot) {
  const db = await ensureInitialized();
  const [serviceSnap, customerSnap, discountSnap, bookingSnap] = await Promise.all([
    db.collection(COL.services).get(),
    db.collection(COL.customers).get(),
    db.collection(COL.discounts).get(),
    db.collection(COL.bookings).get(),
  ]);
  const ops: Op[] = [];

  // Services (admin-owned): upsert + delete the ones removed from the dashboard
  const serviceIds = new Set<string>();
  for (const item of snapshot.services) {
    const id = safeId(item.id);
    serviceIds.add(id);
    const data = { name: item.name.slice(0, 120), description: item.description, price: Math.max(0, Math.round(item.price)), duration: Math.max(5, Math.round(item.duration)), active: item.active, icon: item.icon.slice(0, 24) };
    const existing = serviceSnap.docs.find((d) => d.id === id);
    if (!existing) ops.push({ kind: "set", ref: db.collection(COL.services).doc(id), data });
    else if (changed(existing.data(), data)) ops.push({ kind: "update", ref: existing.ref, data });
  }
  for (const doc of serviceSnap.docs) if (!serviceIds.has(doc.id)) ops.push({ kind: "delete", ref: doc.ref });

  // Discounts (admin-owned): `uses` is controlled by the server only
  const discountIds = new Set<string>();
  for (const item of snapshot.discounts) {
    const id = safeId(item.id);
    discountIds.add(id);
    const data = { code: item.code.toUpperCase().slice(0, 40), kind: item.kind, value: Math.max(1, Math.round(item.value)), active: item.active };
    const existing = discountSnap.docs.find((d) => d.id === id);
    if (!existing) ops.push({ kind: "set", ref: db.collection(COL.discounts).doc(id), data: { ...data, uses: 0 } });
    else if (changed(existing.data(), data)) ops.push({ kind: "update", ref: existing.ref, data });
  }
  for (const doc of discountSnap.docs) if (!discountIds.has(doc.id)) ops.push({ kind: "delete", ref: doc.ref });

  // Customers: the app creates them; the admin may only rename/block (visits stay server-controlled)
  for (const item of snapshot.customers) {
    const id = safeId(item.id);
    const data = { name: item.name.slice(0, 160), blocked: item.blocked };
    const existing = customerSnap.docs.find((d) => d.id === id);
    if (!existing) ops.push({ kind: "set", ref: db.collection(COL.customers).doc(id), data: { ...data, phone: item.phone.slice(0, 32), visits: Math.max(0, Math.round(item.visits)) } });
    else if (changed(existing.data(), data)) ops.push({ kind: "update", ref: existing.ref, data });
  }

  // Bookings: the admin may only change status
  for (const item of snapshot.bookings) {
    const existing = bookingSnap.docs.find((d) => d.data().bookingCode === item.id);
    if (existing && existing.data().status !== item.status) ops.push({ kind: "update", ref: existing.ref, data: { status: item.status } });
  }

  const hours = snapshot.settings.hours.map((d) => ({ day: String(d.day).slice(0, 20), enabled: Boolean(d.enabled), start: String(d.start).slice(0, 5), end: String(d.end).slice(0, 5) }));
  ops.push({ kind: "set", ref: db.collection(COL.settings).doc(SETTINGS_ID), data: { country: "EG", currency: "EGP", shopOpen: Boolean(snapshot.settings.shopOpen), hours } });

  await commitOps(db, ops);
  return { ok: true as const };
}

export async function createSalonBooking(input: { name: string; phone: string; date: string; time: string; serviceIds: string[]; discountCode?: string }) {
  const db = await ensureInitialized();
  const normalizedPhone = input.phone.replace(/[\s()-]/g, "");
  const name = input.name.trim().slice(0, 160);
  const requested = Array.from(new Set(input.serviceIds)).slice(0, 8);
  const code = (input.discountCode ?? "").trim().toUpperCase();

  return db.runTransaction(async (tx) => {
    const customerQuery = db.collection(COL.customers).where("phone", "==", normalizedPhone).limit(1);
    const [customerSnap, serviceSnap, aheadSnap, discountSnap] = await Promise.all([
      tx.get(customerQuery),
      tx.get(db.collection(COL.services)),
      tx.get(db.collection(COL.bookings).where("date", "==", input.date).where("status", "==", "مؤكد")),
      code ? tx.get(db.collection(COL.discounts).where("code", "==", code).limit(1)) : Promise.resolve(null),
    ]);

    const existingCustomer = customerSnap.docs[0];
    if (existingCustomer?.data().blocked) return { ok: false as const, status: 403, message: "لا يمكن إتمام الحجز، تواصل مع الصالون للمساعدة." };

    const selected = serviceSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceDoc)).filter((s) => requested.includes(s.id) && s.active);
    if (selected.length === 0 || selected.length !== requested.length) return { ok: false as const, status: 400, message: "اختار خدمة متاحة واحدة على الأقل." };
    const serviceItems: BookingServiceSnapshot[] = selected.map((s) => ({ id: s.id, name: s.name, price: num(s.price), duration: num(s.duration) }));
    const subtotal = serviceItems.reduce((total, item) => total + item.price, 0);

    let discountCode = "";
    let discountAmount = 0;
    if (code) {
      const discountDoc = discountSnap?.docs[0];
      const discount = discountDoc?.data();
      if (!discountDoc || !discount?.active) return { ok: false as const, status: 400, message: "كود الخصم غير صالح أو غير مفعّل." };
      discountCode = discount.code;
      discountAmount = Math.min(subtotal, discount.kind === "percent" ? Math.round((subtotal * num(discount.value)) / 100) : num(discount.value));
      tx.update(discountDoc.ref, { uses: FieldValue.increment(1) });
    }

    const requestedMinutes = bookingTimeMinutes(input.time);
    const queueAhead = aheadSnap.docs.filter((d) => {
      const existingMinutes = bookingTimeMinutes(String(d.data().time ?? ""));
      return existingMinutes === null || requestedMinutes === null || existingMinutes <= requestedMinutes;
    }).length;

    if (existingCustomer) tx.update(existingCustomer.ref, { name, visits: FieldValue.increment(1) });
    else tx.set(db.collection(COL.customers).doc(`cus-${randomUUID()}`), { name, phone: normalizedPhone, visits: 1, blocked: false });

    const bookingCode = `#${randomBytes(4).toString("hex").toUpperCase()}`;
    const bookingId = `bk-${randomUUID()}`;
    const doc: BookingDoc = { id: bookingId, bookingCode, customerName: name, phone: normalizedPhone, date: input.date, time: input.time, serviceItems, status: "مؤكد", discountCode, discountAmount, queueAhead, createdAt: new Date().toISOString() };
    tx.set(db.collection(COL.bookings).doc(bookingId), doc);

    return { ok: true as const, booking: { id: bookingId, bookingCode, name, phone: normalizedPhone, date: input.date, time: input.time, serviceItems, status: "مؤكد" as const, discountCode, discountAmount, queueAhead, total: Math.max(0, subtotal - discountAmount) } };
  });
}

export async function getPublicSalonInfo() {
  const db = await ensureInitialized();
  const [serviceSnap, settingsSnap] = await Promise.all([
    db.collection(COL.services).where("active", "==", true).get(),
    db.collection(COL.settings).doc(SETTINGS_ID).get(),
  ]);
  return {
    country: "EG",
    currency: "EGP",
    shopOpen: Boolean(settingsSnap.data()?.shopOpen ?? true),
    services: serviceSnap.docs.map((d) => { const x = d.data(); return { id: d.id, name: x.name, description: x.description ?? "", price: num(x.price), duration: num(x.duration, 30), active: true, icon: x.icon ?? "cut" }; }),
  };
}

export async function validateSalonDiscount(input: { serviceIds: string[]; code: string }) {
  const db = await ensureInitialized();
  const code = input.code.trim().toUpperCase();
  const [discountSnap, serviceSnap] = await Promise.all([
    db.collection(COL.discounts).where("code", "==", code).limit(1).get(),
    db.collection(COL.services).get(),
  ]);
  const discount = discountSnap.docs[0]?.data();
  if (!discount?.active) return { ok: false as const, message: "كود الخصم غير صالح أو غير مفعّل." };
  const selected = serviceSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceDoc)).filter((s) => input.serviceIds.includes(s.id) && s.active);
  if (!selected.length || selected.length !== new Set(input.serviceIds).size) return { ok: false as const, message: "اختار خدمات متاحة أولاً." };
  const subtotal = selected.reduce((sum, s) => sum + num(s.price), 0);
  const amount = Math.min(subtotal, discount.kind === "percent" ? Math.round((subtotal * num(discount.value)) / 100) : num(discount.value));
  return { ok: true as const, code: discount.code as string, amount, total: Math.max(0, subtotal - amount) };
}
