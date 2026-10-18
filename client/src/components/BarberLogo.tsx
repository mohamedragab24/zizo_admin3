type BarberLogoProps = { compact?: boolean; small?: boolean };

export default function BarberLogo({ compact = false, small = false }: BarberLogoProps) {
  return (
    <div className={`brand-lockup${compact ? " brand-lockup--compact" : ""}${small ? " brand-lockup--small" : ""}`}>
      <span className="brand-logo-crop"><img src="/brand-mark.png" alt="شعار ZIZO" /></span>
      {!compact && <span className="brand-wordmark"><strong>ZIZO</strong><small>إدارة الصالون</small></span>}
    </div>
  );
}
