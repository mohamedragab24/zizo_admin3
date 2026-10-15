import { AlertCircle, LayoutDashboard } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <main dir="rtl" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, color: "#f4f1e9", background: "#090908" }}>
      <section style={{ width: "min(100%, 460px)", textAlign: "center", padding: 32, border: "1px solid rgba(215,176,95,.22)", borderRadius: 22, background: "#151512" }}>
        <AlertCircle size={42} color="#D7B05F" style={{ margin: "0 auto 16px" }} />
        <p style={{ color: "#D7B05F", letterSpacing: 2, margin: "0 0 8px" }}>404</p>
        <h1 style={{ margin: "0 0 10px", fontSize: 24 }}>الصفحة غير موجودة</h1>
        <p style={{ color: "#aaa69c", lineHeight: 1.8, marginBottom: 24 }}>هذا الموقع مخصص لإدارة الصالون فقط. ارجع إلى لوحة التحكم للمتابعة.</p>
        <button className="button-gold" onClick={() => setLocation("/")}><LayoutDashboard size={16} /> العودة إلى لوحة الإدارة</button>
      </section>
    </main>
  );
}
