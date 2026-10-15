import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, ArrowDownRight, ArrowLeft, ArrowUpRight, BadgePercent, Ban, Bell, CalendarCheck, CalendarDays, Check, CheckCircle2, ChevronDown, CircleDollarSign, Clock3, Eye, Filter, LayoutDashboard, Menu, MoreHorizontal, Pencil, Plus, Scissors, Search, Settings2, ShieldCheck, Store, TicketPercent, Trash2, UnlockKeyhole, UserRound, Users, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import BarberLogo from "@/components/BarberLogo";
import { dayNames, formatEGP, formatEgyptDate, localDateISO, useSalon, type Booking, type BookingStatus, type Discount, type Service } from "@/lib/salonStore";
import { adminFetch, signOutAdmin, useAdminUser } from "@/lib/api";
import LoginForm from "@/components/LoginForm";

type Section = "overview" | "services" | "bookings" | "completed" | "cancelled" | "users" | "discounts" | "hours";

const navItems: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "الرئيسية", icon: LayoutDashboard },
  { id: "services", label: "الخدمات والأسعار", icon: Scissors },
  { id: "bookings", label: "الحجوزات", icon: CalendarDays },
  { id: "completed", label: "المكتملة", icon: CheckCircle2 },
  { id: "cancelled", label: "الملغاة", icon: Ban },
  { id: "users", label: "المستخدمون", icon: Users },
  { id: "discounts", label: "أكواد الخصم", icon: TicketPercent },
  { id: "hours", label: "أوقات العمل", icon: Clock3 },
];

const titleBySection: Record<Section, string> = {
  overview: "نظرة عامة", services: "الخدمات والأسعار", bookings: "إدارة الحجوزات", completed: "الحجوزات المكتملة", cancelled: "الحجوزات الملغاة", users: "إدارة المستخدمين", discounts: "أكواد الخصم", hours: "أوقات العمل",
};

const statusTone: Record<BookingStatus, string> = { "مؤكد": "status-confirmed", "مكتمل": "status-completed", "ملغي": "status-cancelled" };

function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`status-badge ${statusTone[status]}`}><i />{status}</span>;
}

export default function Admin() {
  const { data, setData } = useSalon();
  const [active, setActive] = useState<Section>("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [serviceEditor, setServiceEditor] = useState<Service | null | false>(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountKind, setDiscountKind] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [showClosedHint, setShowClosedHint] = useState(false);
  const [accessState, setAccessState] = useState<"loading" | "ready" | "login" | "forbidden" | "error">("loading");

  const { user, ready: authReady } = useAdminUser();

  useEffect(() => {
    if (!authReady) return;
    if (!user) { setAccessState("login"); return; }
    let cancelled = false;
    setAccessState("loading");
    adminFetch("/api/admin/salon")
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 401 ? "login" : response.status === 403 ? "forbidden" : "server");
        return response.json();
      })
      .then((snapshot) => {
        if (cancelled) return;
        setData(snapshot);
        setAccessState("ready");
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setAccessState(error.message === "login" ? "login" : error.message === "forbidden" ? "forbidden" : "error");
      });
    return () => { cancelled = true; };
  }, [setData, user, authReady]);

  useEffect(() => {
    if (accessState !== "ready") return;
    const timer = window.setTimeout(() => {
      adminFetch("/api/admin/salon", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((response) => {
        if (response.status === 401) setAccessState("login");
        else if (response.status === 403) setAccessState("forbidden");
        else if (!response.ok) toast.error("تعذر حفظ تغييرات لوحة الإدارة");
      }).catch(() => toast.error("تعذر الاتصال بالخادم لحفظ التغييرات"));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [data, accessState]);

  const todayBookings = data.bookings.filter((booking) => booking.date === localDateISO());
  const confirmedCount = data.bookings.filter((booking) => booking.status === "مؤكد").length;
  const revenue = data.bookings.filter((booking) => booking.status === "مكتمل").reduce((total, booking) => {
    const subtotal = booking.serviceIds.reduce((sum, id) => sum + (data.services.find((service) => service.id === id)?.price ?? 0), 0);
    return total + Math.max(0, subtotal - booking.discountAmount);
  }, 0);
  const visibleBookings = useMemo(() => {
    let list = data.bookings;
    if (active === "completed") list = list.filter((booking) => booking.status === "مكتمل");
    else if (active === "cancelled") list = list.filter((booking) => booking.status === "ملغي");
    else if (active === "bookings") list = list.filter((booking) => booking.status === "مؤكد");
    const cleanQuery = query.trim().toLowerCase();
    if (cleanQuery) list = list.filter((booking) => booking.name.toLowerCase().includes(cleanQuery) || booking.phone.includes(cleanQuery) || booking.id.includes(cleanQuery));
    return list;
  }, [active, data.bookings, query]);

  const changeSection = (section: Section) => { setActive(section); setMobileMenu(false); setQuery(""); };
  const refreshSnapshot = async () => {
    setAccessState("loading");
    try {
      const response = await adminFetch("/api/admin/salon");
      if (!response.ok) throw new Error(response.status === 401 ? "login" : response.status === 403 ? "forbidden" : "server");
      setData(await response.json());
      setAccessState("ready");
      toast.success("تم تحديث بيانات اللوحة من الخادم");
    } catch (error) {
      setAccessState(error instanceof Error && error.message === "login" ? "login" : error instanceof Error && error.message === "forbidden" ? "forbidden" : "error");
      toast.error("تعذر تحديث البيانات");
    }
  };
  const changeBookingStatus = (id: string, status: BookingStatus) => {
    setData((current) => ({ ...current, bookings: current.bookings.map((booking) => booking.id === id ? { ...booking, status } : booking) }));
    toast.success(`تم تحديث حالة الحجز إلى ${status}`);
  };
  const changeShopStatus = () => {
    setData((current) => ({ ...current, settings: { ...current.settings, shopOpen: !current.settings.shopOpen } }));
    setShowClosedHint(!data.settings.shopOpen);
    toast.success(data.settings.shopOpen ? "تم إغلاق المحل — الحجز ما زال متاحًا" : "المحل مفتوح ويستقبل الحجوزات");
  };

  const saveService = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const price = Number(form.get("price"));
    const duration = Number(form.get("duration"));
    const description = String(form.get("description") ?? "").trim();
    if (!name || !Number.isFinite(price) || price < 0) { toast.error("أدخل اسم الخدمة وسعرًا صحيحًا بالجنيه المصري"); return; }
    if (serviceEditor) {
      setData((current) => ({ ...current, services: current.services.map((item) => item.id === serviceEditor.id ? { ...item, name, price, duration: duration || item.duration, description } : item) }));
      toast.success("تم تعديل الخدمة");
    } else {
      const service: Service = { id: `svc-${Date.now()}`, name, price, duration: duration || 30, description, active: true, icon: "cut" };
      setData((current) => ({ ...current, services: [...current.services, service] }));
      toast.success("تمت إضافة الخدمة");
    }
    setServiceEditor(false);
  };

  const addDiscount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = discountCode.trim().toUpperCase().replace(/\s+/g, "");
    const value = Number(discountValue);
    if (!code || value <= 0 || data.discounts.some((item) => item.code === code)) { toast.error("أدخل كودًا جديدًا وقيمة خصم صحيحة"); return; }
    const discount: Discount = { id: `disc-${Date.now()}`, code, kind: discountKind, value, active: true, uses: 0 };
    setData((current) => ({ ...current, discounts: [discount, ...current.discounts] }));
    setDiscountCode("");
    toast.success("تم إنشاء كود الخصم");
  };

  const renderBookingsTable = (bookings: Booking[]) => (
    <div className="table-scroll">
      <table className="admin-table">
        <thead><tr><th>رقم الحجز</th><th>العميل</th><th>الخدمة</th><th>الموعد</th><th>الإجمالي</th><th>الحالة</th><th>الإجراء</th></tr></thead>
        <tbody>{bookings.map((booking) => {
          const serviceNames = booking.serviceIds.map((id) => data.services.find((service) => service.id === id)?.name).filter(Boolean).join("، ") || "خدمة محذوفة";
          const subtotal = booking.serviceIds.reduce((sum, id) => sum + (data.services.find((service) => service.id === id)?.price ?? 0), 0);
          const total = Math.max(0, subtotal - booking.discountAmount);
          return <tr key={booking.id}>
            <td><b className="booking-id">{booking.id}</b></td>
            <td><span className="customer-cell"><span className="avatar-initial">{booking.name.slice(0, 1)}</span><span><b>{booking.name}</b><small dir="ltr">{booking.phone}</small></span></span></td>
            <td>{serviceNames}</td>
            <td><span className="date-cell"><b>{booking.time}</b><small>{formatEgyptDate(booking.date)}</small></span></td>
            <td className="gold-price">{formatEGP(total)}</td>
            <td><StatusBadge status={booking.status} /></td>
            <td><select aria-label={`تغيير حالة ${booking.id}`} className="status-select" value={booking.status} onChange={(event) => changeBookingStatus(booking.id, event.target.value as BookingStatus)}><option value="مؤكد">مؤكد</option><option value="مكتمل">مكتمل</option><option value="ملغي">ملغي</option></select></td>
          </tr>;
        })}</tbody>
      </table>
      {bookings.length === 0 && <div className="empty-state"><CalendarDays size={25} /><strong>مفيش حجوزات هنا لسه</strong><span>الحجوزات الجديدة هتظهر في القائمة.</span></div>}
    </div>
  );

  const overview = (
    <>
      <div className="welcome-admin"><div><span className="eyebrow">الثلاثاء، ١٤ أكتوبر ٢٠٢٦</span><h2>أهلاً بيك في <span>لوحة التحكم</span></h2><p>تابع حركة الصالون والحجوزات من مكان واحد.</p></div><button className="button-outline" onClick={() => changeSection("bookings")}><Eye size={16} /> عرض الحجوزات</button></div>
      <div className="stats-grid">
        <article className="stat-card"><div className="stat-card-head"><span>إجمالي الحجوزات</span><span className="stat-icon"><CalendarCheck size={18} /></span></div><strong>{new Intl.NumberFormat("ar-EG").format(data.bookings.length)}</strong><small><ArrowUpRight size={14} /> حجوزات مسجلة</small></article>
        <article className="stat-card"><div className="stat-card-head"><span>حجوزات اليوم</span><span className="stat-icon"><CalendarDays size={18} /></span></div><strong>{new Intl.NumberFormat("ar-EG").format(todayBookings.length)}</strong><small><Activity size={14} /> مواعيد النهارده</small></article>
        <article className="stat-card"><div className="stat-card-head"><span>الإيرادات المكتملة</span><span className="stat-icon"><Wallet size={18} /></span></div><strong className="stat-revenue">{formatEGP(revenue)}</strong><small><ArrowUpRight size={14} /> إجمالي تجريبي</small></article>
        <article className="stat-card"><div className="stat-card-head"><span>بانتظار الموعد</span><span className="stat-icon"><Clock3 size={18} /></span></div><strong>{new Intl.NumberFormat("ar-EG").format(confirmedCount)}</strong><small><Users size={14} /> حجوزات مؤكدة</small></article>
      </div>
      <div className="overview-grid">
        <section className="panel chart-panel"><div className="panel-heading"><div><h3>الحجوزات خلال الأسبوع</h3><p>نظرة سريعة على نشاط الصالون</p></div><span className="subtle-pill">آخر ٧ أيام <ChevronDown size={14} /></span></div>
          <div className="week-chart" aria-label="رسم توضيحي للحجوزات"><div className="chart-axis"><span>٨</span><span>٦</span><span>٤</span><span>٢</span><span>٠</span></div><div className="chart-columns">{[3, 6, 4, 7, 5, 8, Math.max(2, todayBookings.length)].map((value, index) => <div className="chart-column" key={index}><span className="chart-value">{new Intl.NumberFormat("ar-EG").format(value)}</span><i style={{ height: `${Math.max(13, value * 10)}%` }} /><small>{dayNames[index]}</small></div>)}</div></div>
          <div className="chart-note"><span className="chart-legend-dot" /> عدد الحجوزات <small>بيانات عرض تجريبية</small></div>
        </section>
        <section className="panel popular-panel"><div className="panel-heading"><div><h3>الخدمات الأكثر طلبًا</h3><p>حسب الحجوزات المسجلة</p></div><button className="icon-button" aria-label="إدارة الخدمات" onClick={() => changeSection("services")}><ArrowLeft size={16} /></button></div>
          <div className="popular-list">{data.services.filter((service) => service.active).slice(0, 4).map((service, index) => {
            const count = data.bookings.filter((booking) => booking.serviceIds.includes(service.id)).length;
            return <div className="popular-row" key={service.id}><span className="popular-rank">٠{index + 1}</span><span className="popular-name"><b>{service.name}</b><small>{formatEGP(service.price)}</small></span><span className="popular-bar"><i style={{ width: `${Math.max(12, count * 18)}%` }} /></span><b className="popular-count">{new Intl.NumberFormat("ar-EG").format(count)}</b></div>;
          })}</div>
        </section>
      </div>
      <section className="panel recent-panel"><div className="panel-heading"><div><h3>أحدث الحجوزات</h3><p>آخر الطلبات اللي وصلت للصالون</p></div><button className="text-button" onClick={() => changeSection("bookings")}>عرض الكل <ArrowLeft size={15} /></button></div>{renderBookingsTable(data.bookings.slice(0, 5))}</section>
    </>
  );

  const servicesPage = (
    <section className="panel content-panel"><div className="panel-heading"><div><h3>قائمة الخدمات</h3><p>عدّل الخدمات والأسعار الظاهرة للعملاء · السعر بالجنيه المصري</p></div><button className="button-gold" onClick={() => setServiceEditor(null)}><Plus size={16} /> إضافة خدمة</button></div>
      <div className="service-admin-grid">{data.services.map((service) => <article className={`service-admin-card${service.active ? "" : " inactive"}`} key={service.id}><div className="service-admin-top"><span className="service-admin-icon"><Scissors size={20} /></span><span className={`active-tag ${service.active ? "" : "off"}`}>{service.active ? "مفعّلة" : "متوقفة"}</span></div><h4>{service.name}</h4><p>{service.description || "خدمة صالون الحلاقة"}</p><div className="service-admin-meta"><b>{formatEGP(service.price)}</b><span><Clock3 size={14} /> {service.duration} دقيقة</span></div><div className="service-admin-actions"><button className="button-outline" onClick={() => setServiceEditor(service)}><Pencil size={15} /> تعديل</button><button className="icon-button" title={service.active ? "إيقاف الخدمة" : "تفعيل الخدمة"} onClick={() => setData((current) => ({ ...current, services: current.services.map((item) => item.id === service.id ? { ...item, active: !item.active } : item) }))}>{service.active ? <Ban size={15} /> : <Check size={15} />}</button></div></article>)}</div>
    </section>
  );

  const bookingsPage = (
    <section className="panel content-panel"><div className="panel-heading"><div><h3>{active === "completed" ? "الحجوزات المكتملة" : active === "cancelled" ? "الحجوزات الملغاة" : "كل الحجوزات"}</h3><p>{active === "bookings" ? "غيّر حالة أي حجز من القائمة" : "سجل الطلبات حسب الحالة"}</p></div><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو رقم الحجز" /></label></div>{renderBookingsTable(visibleBookings)}</section>
  );

  const usersPage = (
    <section className="panel content-panel"><div className="panel-heading"><div><h3>قائمة العملاء</h3><p>إدارة صلاحية العملاء للحجز</p></div><span className="subtle-pill"><Users size={14} /> {new Intl.NumberFormat("ar-EG").format(data.customers.length)} عميل</span></div>
      <div className="table-scroll"><table className="admin-table"><thead><tr><th>العميل</th><th>رقم الهاتف</th><th>الحجوزات</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{data.customers.map((customer) => <tr key={customer.id}><td><span className="customer-cell"><span className="avatar-initial">{customer.name.slice(0, 1)}</span><span><b>{customer.name}</b><small>عميل صالون</small></span></span></td><td dir="ltr">{customer.phone}</td><td>{new Intl.NumberFormat("ar-EG").format(customer.visits)}</td><td><span className={`user-state ${customer.blocked ? "blocked" : "allowed"}`}><i />{customer.blocked ? "محظور" : "نشط"}</span></td><td><button className={`button-outline ${customer.blocked ? "unblock-button" : "block-button"}`} onClick={() => { setData((current) => ({ ...current, customers: current.customers.map((item) => item.id === customer.id ? { ...item, blocked: !item.blocked } : item) })); toast.success(customer.blocked ? "تم إلغاء حظر العميل" : "تم حظر العميل"); }}>{customer.blocked ? <UnlockKeyhole size={15} /> : <Ban size={15} />}{customer.blocked ? "إلغاء الحظر" : "حظر"}</button></td></tr>)}</tbody></table></div>
    </section>
  );

  const discountsPage = (
    <div className="discount-layout"><section className="panel content-panel"><div className="panel-heading"><div><h3>إنشاء كود خصم</h3><p>أضف عرضًا للعملاء عند الحجز</p></div><span className="discount-emblem"><BadgePercent size={21} /></span></div>
      <form className="discount-form" onSubmit={addDiscount}><label>كود الخصم<input value={discountCode} onChange={(event) => setDiscountCode(event.target.value.toUpperCase())} placeholder="مثال: EGYPT15" dir="ltr" required /></label><div className="field-grid"><label>نوع الخصم<select value={discountKind} onChange={(event) => setDiscountKind(event.target.value as "percent" | "fixed")}><option value="percent">نسبة مئوية %</option><option value="fixed">قيمة ثابتة بالجنيه</option></select></label><label>{discountKind === "percent" ? "نسبة الخصم" : "قيمة الخصم (ج.م)"}<input type="number" min="1" max={discountKind === "percent" ? "100" : undefined} value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} required /></label></div><button className="button-gold button-full" type="submit"><Plus size={16} /> إنشاء الكود</button></form>
      <div className="discount-tip"><ShieldCheck size={16} /><span>الكود النشط يظهر للعميل كخيار اختياري أثناء الحجز.</span></div>
    </section><section className="panel content-panel"><div className="panel-heading"><div><h3>الأكواد الحالية</h3><p>فعّل أو أوقف الكود وقت ما تحب</p></div></div><div className="discount-list">{data.discounts.map((item) => <article className="discount-row" key={item.id}><span className="discount-icon"><TicketPercent size={18} /></span><div className="discount-info"><strong dir="ltr">{item.code}</strong><small>{item.kind === "percent" ? `${new Intl.NumberFormat("ar-EG").format(item.value)}٪ خصم` : `${formatEGP(item.value)} خصم`}</small></div><div className="discount-uses"><b>{new Intl.NumberFormat("ar-EG").format(item.uses)}</b><small>استخدام</small></div><button className={`mini-toggle ${item.active ? "on" : ""}`} aria-label={item.active ? "إيقاف الكود" : "تفعيل الكود"} onClick={() => setData((current) => ({ ...current, discounts: current.discounts.map((discount) => discount.id === item.id ? { ...discount, active: !discount.active } : discount) }))}><i /></button></article>)}{data.discounts.length === 0 && <div className="empty-state"><TicketPercent size={24} /><strong>لسه مفيش أكواد خصم</strong></div>}</div></section></div>
  );

  const hoursPage = (
    <section className="panel content-panel hours-panel"><div className="panel-heading"><div><h3>مواعيد العمل الأسبوعية</h3><p>حدد الأيام والساعات اللي المحل بيستقبل فيها العملاء</p></div><span className="subtle-pill"><Clock3 size={14} /> توقيت مصر</span></div>
      <div className="hours-list">{data.settings.hours.map((day, index) => <div className={`hours-row${day.enabled ? "" : " day-off"}`} key={day.day}><button type="button" className={`day-switch ${day.enabled ? "on" : ""}`} aria-label={`تبديل ${day.day}`} onClick={() => setData((current) => ({ ...current, settings: { ...current.settings, hours: current.settings.hours.map((item, i) => i === index ? { ...item, enabled: !item.enabled } : item) } }))}><i /></button><b className="hours-day">{day.day}</b>{day.enabled ? <><label><span>من</span><input type="time" value={day.start} onChange={(event) => setData((current) => ({ ...current, settings: { ...current.settings, hours: current.settings.hours.map((item, i) => i === index ? { ...item, start: event.target.value } : item) } }))} /></label><span className="hours-separator">—</span><label><span>إلى</span><input type="time" value={day.end} onChange={(event) => setData((current) => ({ ...current, settings: { ...current.settings, hours: current.settings.hours.map((item, i) => i === index ? { ...item, end: event.target.value } : item) } }))} /></label></> : <span className="day-off-label">إجازة</span>}</div>)}</div>
      <div className="manual-status-card"><span className={`manual-status-icon ${data.settings.shopOpen ? "open" : "closed"}`}><Store size={22} /></span><div><strong>حالة المحل الآن</strong><small>{data.settings.shopOpen ? "المحل ظاهر للعملاء على أنه مفتوح" : "المحل ظاهر للعملاء على أنه مغلق"} — الحجز متاح في الحالتين</small></div><button className={`status-toggle-button ${data.settings.shopOpen ? "open" : "closed"}`} onClick={changeShopStatus}><i />{data.settings.shopOpen ? "المحل مفتوح" : "المحل مغلق"}<ChevronDown size={15} /></button></div>
      {showClosedHint && !data.settings.shopOpen && <p className="info-banner"><CheckCircle2 size={16} /> يمكن للعملاء حجز موعد حتى أثناء إغلاق المحل.</p>}
    </section>
  );

  return (
    <main className="admin-shell" dir="rtl">
      {accessState !== "ready" && (
        <div className="admin-gate"><div className="admin-gate-card">
          <BarberLogo /><span className="eyebrow">إدارة الصالون · مصر</span>
          <h1>{accessState === "loading" ? "بنجهّز بيانات اللوحة" : accessState === "login" ? "دخول ZIZO" : accessState === "forbidden" ? "الحساب بلا صلاحية مدير" : "تعذر الاتصال بالخادم"}</h1>
          <p>{accessState === "loading" ? "لحظة واحدة، بنحمّل بيانات الصالون من قاعدة البيانات." : accessState === "login" ? "سجّل الدخول، أو أنشئ حسابًا — أول حساب يتم إنشاؤه يصبح المدير بكل الصلاحيات." : accessState === "forbidden" ? "هذا الحساب ليس حساب المدير. أضف الـ UID في ADMIN_UIDS على السيرفر إن أردت منحه صلاحية." : "تأكد من إعدادات Firebase على السيرفر، ثم أعد المحاولة."}</p>
          {accessState === "login" ? <LoginForm /> : accessState === "forbidden" ? <button className="button-gold button-full" onClick={() => void signOutAdmin()}>تسجيل الخروج وتجربة حساب آخر</button> : accessState === "error" ? <button className="button-gold button-full" onClick={() => window.location.reload()}>إعادة المحاولة</button> : <span className="loading-mark"><i /></span>}
        </div></div>
      )}
      {mobileMenu && <button className="sidebar-scrim" aria-label="إغلاق القائمة" onClick={() => setMobileMenu(false)} />}
      <aside className={`admin-sidebar${mobileMenu ? " sidebar-open" : ""}${accessState !== "ready" ? " admin-hidden" : ""}`}>
        <div className="sidebar-brand"><BarberLogo /><button className="sidebar-close icon-button" onClick={() => setMobileMenu(false)} aria-label="إغلاق القائمة"><X size={18} /></button></div>
        <div className="salon-mini-profile"><span className="salon-avatar"><Scissors size={18} /></span><span><b>إدارة الصالون</b><small>مصر · الجنيه المصري</small></span><MoreHorizontal size={18} /></div>
        <span className="nav-caption">القائمة الرئيسية</span>
        <nav className="admin-nav">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item${active === id ? " active" : ""}`} onClick={() => changeSection(id)}><Icon size={18} /><span>{label}</span>{id === "bookings" && confirmedCount > 0 && <i className="nav-count">{new Intl.NumberFormat("ar-EG").format(confirmedCount)}</i>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-status"><span className={`status-dot ${data.settings.shopOpen ? "" : "closed"}`} /><span><b>{data.settings.shopOpen ? "المحل مفتوح" : "المحل مغلق"}</b><small>{data.settings.shopOpen ? "استقبال الحجوزات متاح" : "الحجز ما زال متاحًا"}</small></span></div><button className="back-to-app" onClick={() => void signOutAdmin()}><LayoutDashboard size={16} /> تسجيل الخروج</button></div>
      </aside>

      <section className={`admin-main${accessState !== "ready" ? " admin-hidden" : ""}`}>
        <header className="admin-topbar"><button className="mobile-menu-button icon-button" onClick={() => setMobileMenu(true)} aria-label="فتح القائمة"><Menu size={20} /></button><div className="topbar-title"><span className="topbar-crumb">لوحة الإدارة <span>/</span></span><h1>{titleBySection[active]}</h1></div><div className="admin-top-actions"><span className="today-chip"><CalendarDays size={15} /> {new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(new Date())}</span><button className="icon-button notification-button" aria-label="الإشعارات"><Bell size={18} /><i /></button><button className={`admin-shop-toggle ${data.settings.shopOpen ? "is-open" : "is-closed"}`} onClick={changeShopStatus}><i />{data.settings.shopOpen ? "المحل مفتوح" : "المحل مغلق"}<ChevronDown size={15} /></button></div></header>
        <div className="admin-content">
          {active === "overview" && overview}
          {active === "services" && servicesPage}
          {(active === "bookings" || active === "completed" || active === "cancelled") && bookingsPage}
          {active === "users" && usersPage}
          {active === "discounts" && discountsPage}
          {active === "hours" && hoursPage}
          <footer className="admin-footer"><span>© ٢٠٢٦ صالون الحلاقة · مصر</span><span>الأسعار بالجنيه المصري <i /> قاعدة بيانات مشتركة</span><button onClick={refreshSnapshot}>تحديث البيانات</button></footer>
        </div>
      </section>

      {serviceEditor !== false && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setServiceEditor(false); }}><form className="service-modal" onSubmit={saveService}><div className="modal-heading"><span className="modal-icon"><Scissors size={19} /></span><div><h3>{serviceEditor ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</h3><p>الأسعار بالجنيه المصري</p></div><button type="button" className="icon-button" onClick={() => setServiceEditor(false)} aria-label="إغلاق"><X size={18} /></button></div><label>اسم الخدمة<input name="name" defaultValue={serviceEditor?.name ?? ""} placeholder="مثال: قص شعر" required autoFocus /></label><label>وصف قصير<input name="description" defaultValue={serviceEditor?.description ?? ""} placeholder="وصف بسيط يظهر للعميل" /></label><div className="field-grid"><label>السعر (ج.م)<input name="price" type="number" min="0" defaultValue={serviceEditor?.price ?? ""} required /></label><label>المدة (دقيقة)<input name="duration" type="number" min="5" defaultValue={serviceEditor?.duration ?? 30} required /></label></div><div className="modal-actions"><button type="button" className="button-outline" onClick={() => setServiceEditor(false)}>إلغاء</button><button className="button-gold" type="submit">حفظ الخدمة <Check size={16} /></button></div></form></div>}
    </main>
  );
}
