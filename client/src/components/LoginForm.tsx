import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getSignupOpen, signInWithEmail, signUp } from "@/lib/api";

const field = { padding: 12, borderRadius: 12, border: "1px solid rgba(215,176,95,.3)", background: "#0f0f0d", color: "inherit", width: "100%" } as const;

export default function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupOpen, setSignupOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSignupOpen().then((open) => { setSignupOpen(open); if (open) setMode("signup"); });
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "signup" && password !== confirm) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    setBusy(true);
    try {
      if (mode === "signup") await signUp(name.trim(), email.trim(), password);
      else await signInWithEmail(email.trim(), password);
    } catch (error) {
      toast.error(mode === "signup" && error instanceof Error ? error.message : "تعذر تسجيل الدخول، راجع البيانات وحاول مرة أخرى");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 10, width: "100%" }}>
      {mode === "signup" && <input type="text" placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} style={field} />}
      <input dir="ltr" type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} required style={field} />
      <input dir="ltr" type="password" placeholder="كلمة المرور (8 أحرف على الأقل)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "signup" ? 8 : undefined} style={field} />
      {mode === "signup" && <input dir="ltr" type="password" placeholder="تأكيد كلمة المرور" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} style={field} />}
      <button type="submit" className="button-gold button-full" disabled={busy}>{busy ? "لحظة..." : mode === "signup" ? "إنشاء الحساب" : "تسجيل الدخول"}</button>
      {signupOpen && (
        <button type="button" className="button-full" style={{ background: "none", border: 0, color: "#D7B05F", cursor: "pointer" }} onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
          {mode === "signup" ? "لدي حساب بالفعل" : "إنشاء حساب جديد"}
        </button>
      )}
      {mode === "signup" && <small style={{ opacity: .7, textAlign: "center" }}>أول حساب يتم إنشاؤه يحصل على كل صلاحيات الإدارة، وبعده يُغلق التسجيل.</small>}
    </form>
  );
}
