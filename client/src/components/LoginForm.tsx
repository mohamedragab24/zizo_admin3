import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { signInWithEmail, signInWithGoogle } from "@/lib/api";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try { await action(); } catch { toast.error("تعذر تسجيل الدخول، راجع البيانات وحاول مرة أخرى"); }
    finally { setBusy(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void run(() => signInWithEmail(email.trim(), password)); };

  return (
    <div style={{ display: "grid", gap: 10, width: "100%" }}>
      <button type="button" className="button-gold button-full" disabled={busy} onClick={() => run(signInWithGoogle)}>الدخول بحساب Google</button>
      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <input dir="ltr" type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(215,176,95,.3)", background: "#0f0f0d", color: "inherit" }} />
        <input dir="ltr" type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(215,176,95,.3)", background: "#0f0f0d", color: "inherit" }} />
        <button type="submit" className="button-gold button-full" disabled={busy}>دخول بالبريد</button>
      </form>
    </div>
  );
}
