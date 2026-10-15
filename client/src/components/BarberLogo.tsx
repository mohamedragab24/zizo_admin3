type BarberLogoProps = { compact?: boolean; small?: boolean };

export default function BarberLogo({ compact = false, small = false }: BarberLogoProps) {
  return (
    <div className={`brand-lockup${compact ? " brand-lockup--compact" : ""}${small ? " brand-lockup--small" : ""}`}>
      <span className="brand-logo-crop"><img src="/brand-mark.png" alt="شعار صالون الحلاقة" /></span>
      {!compact && <span className="brand-wordmark"><strong>صالون الحلاقة</strong><small>مواعيدك على مزاجك</small></span>}
    </div>
  );
}
