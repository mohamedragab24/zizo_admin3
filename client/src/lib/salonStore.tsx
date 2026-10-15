import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

export type BookingStatus = "مؤكد" | "مكتمل" | "ملغي";
export type Service = { id: string; name: string; description: string; price: number; duration: number; active: boolean; icon: string };
export type Booking = { id: string; name: string; phone: string; date: string; time: string; serviceIds: string[]; status: BookingStatus; discountCode: string; discountAmount: number; createdAt: string };
export type Customer = { id: string; name: string; phone: string; visits: number; blocked: boolean };
export type Discount = { id: string; code: string; kind: "percent" | "fixed"; value: number; active: boolean; uses: number };
export type WorkDay = { day: string; enabled: boolean; start: string; end: string };
export type SalonData = { services: Service[]; bookings: Booking[]; customers: Customer[]; discounts: Discount[]; settings: { shopOpen: boolean; hours: WorkDay[] } };

const STORAGE_KEY = "razorbook-eg-demo-v1";
export const dayNames = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

export function localDateISO(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function formatEGP(value: number) {
  return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(value)} ج.م`;
}

export function formatEgyptDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-EG", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export function createDefaultData(): SalonData {
  const today = localDateISO();
  const tomorrow = localDateISO(1);
  return {
    services: [
      { id: "svc-cut", name: "قص شعر", description: "قصة مرتبة تناسب إطلالتك", price: 150, duration: 30, active: true, icon: "cut" },
      { id: "svc-beard", name: "تهذيب لحية", description: "تحديد وتشذيب باحتراف", price: 100, duration: 20, active: true, icon: "beard" },
      { id: "svc-combo", name: "قص شعر ولحية", description: "إطلالة متكاملة في جلسة واحدة", price: 220, duration: 45, active: true, icon: "combo" },
      { id: "svc-care", name: "عناية بالبشرة", description: "تنظيف وانتعاش بعد الحلاقة", price: 180, duration: 35, active: true, icon: "care" },
    ],
    bookings: [
      { id: "#0251", name: "أحمد محمود", phone: "01012345678", date: today, time: "04:30 م", serviceIds: ["svc-cut"], status: "مؤكد", discountCode: "", discountAmount: 0, createdAt: today },
      { id: "#0250", name: "عمر خالد", phone: "01123456789", date: today, time: "05:00 م", serviceIds: ["svc-combo"], status: "مؤكد", discountCode: "WELCOME10", discountAmount: 22, createdAt: today },
      { id: "#0249", name: "يوسف علي", phone: "01234567890", date: today, time: "02:00 م", serviceIds: ["svc-beard"], status: "مكتمل", discountCode: "", discountAmount: 0, createdAt: today },
      { id: "#0248", name: "مروان حسن", phone: "01098765432", date: tomorrow, time: "06:30 م", serviceIds: ["svc-cut", "svc-beard"], status: "ملغي", discountCode: "", discountAmount: 0, createdAt: today },
    ],
    customers: [
      { id: "cus-1", name: "أحمد محمود", phone: "01012345678", visits: 12, blocked: false },
      { id: "cus-2", name: "عمر خالد", phone: "01123456789", visits: 8, blocked: false },
      { id: "cus-3", name: "يوسف علي", phone: "01234567890", visits: 5, blocked: true },
      { id: "cus-4", name: "مروان حسن", phone: "01098765432", visits: 3, blocked: false },
    ],
    discounts: [
      { id: "disc-1", code: "WELCOME10", kind: "percent", value: 10, active: true, uses: 24 },
      { id: "disc-2", code: "BARBER50", kind: "fixed", value: 50, active: true, uses: 11 },
    ],
    settings: {
      shopOpen: true,
      hours: dayNames.map((day, index) => ({ day, enabled: index !== 6, start: "10:00", end: "23:00" })),
    },
  };
}

function readInitialData(): SalonData {
  const defaults = createDefaultData();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<SalonData>;
    if (!Array.isArray(saved.services) || !Array.isArray(saved.bookings) || !Array.isArray(saved.customers) || !Array.isArray(saved.discounts) || !saved.settings) return defaults;
    return { ...defaults, ...saved, settings: { ...defaults.settings, ...saved.settings, hours: saved.settings.hours ?? defaults.settings.hours } } as SalonData;
  } catch {
    return defaults;
  }
}

type SalonContextValue = { data: SalonData; setData: Dispatch<SetStateAction<SalonData>>; resetDemo: () => void };
const SalonContext = createContext<SalonContextValue | null>(null);

export function SalonProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SalonData>(readInitialData);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* storage may be unavailable */ }
  }, [data]);
  const value = useMemo(() => ({ data, setData, resetDemo: () => setData(createDefaultData()) }), [data]);
  return <SalonContext.Provider value={value}>{children}</SalonContext.Provider>;
}

export function useSalon() {
  const value = useContext(SalonContext);
  if (!value) throw new Error("useSalon must be used inside SalonProvider");
  return value;
}
