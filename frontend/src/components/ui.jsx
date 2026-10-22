const iconPaths = {
  arrowRight: <><path d="M5 12h14m-5-5 5 5-5 5" /></>,
  arrowLeft: <><path d="M19 12H5m5-5-5 5 5 5" /></>,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  download: <><path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5" /></>,
  upload: <><path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4" /></>,
  file: <><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M8 12h8M8 16h5" /></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 10v10M15 10v10M3 15h18" /></>,
  layers: <><path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5" /></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" /><path d="m8 12 3 3 5-6" /></>,
  sparkles: <><path d="m14 3 2.5 6.5L23 12l-6.5 2.5L14 21l-2.5-6.5L5 12l6.5-2.5zM4 2v5M1.5 4.5h5" /></>,
  settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="10" cy="18" r="2" /></>,
  chart: <><path d="M4 3v17h17M8 15v-4M13 15V6M18 15v-7" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  alert: <><path d="m12 3 10 17H2zM12 9v4M12 16h.01" /></>,
  search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  rows: <><rect x="3" y="4" width="18" height="5" rx="1.5" /><rect x="3" y="15" width="18" height="5" rx="1.5" /></>,
};

export function Icon({ name, size = 20, className = "", ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`} {...props}>{iconPaths[name] || iconPaths.info}</svg>;
}

export function Button({ variant = "primary", className = "", children, ...props }) {
  return <button type="button" className={`${variant}-button ${className}`} {...props}>{children}</button>;
}

export function Spinner({ className = "" }) {
  return <span aria-hidden="true" className={`spinner ${className}`} />;
}

export function WarningPanel({ warnings = [], title = "A few things to review", compact = false }) {
  const unique = [...new Set(warnings)];
  if (!unique.length) return null;
  return (
    <details className="warning-panel" open={compact ? undefined : true}>
      <summary className="flex cursor-pointer items-center gap-2.5 font-medium">
        <Icon name="alert" size={17} /><span className="flex-1">{title}</span>
        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs">{unique.length}</span><Icon name="chevronDown" size={16} />
      </summary>
      <ul className="mt-3 list-disc space-y-2 pl-7 text-[13px] leading-relaxed">
        {unique.map((warning) => <li key={warning}>{warning}</li>)}
      </ul>
    </details>
  );
}

export function StatCard({ label, value, detail, icon }) {
  return <div className="inner-panel min-w-0 p-4 sm:p-5">
    <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500"><span>{label}</span>{icon && <Icon name={icon} size={16} className="text-blue-500" />}</div>
    <div className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</div>
    {detail && <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>}
  </div>;
}

export function ErrorPanel({ message, onRetry, retryLabel = "Try again", disabled = false }) {
  if (!message) return null;
  return <div role="alert" className="flex flex-wrap items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-900">
    <Icon name="alert" size={19} className="mt-0.5" />
    <div className="min-w-0 flex-1"><p className="font-semibold">We couldn’t complete that step</p><p className="mt-1 leading-relaxed">{message}</p>
      {onRetry && <button type="button" className="mt-3 inline-flex items-center gap-1.5 font-semibold underline underline-offset-4 disabled:opacity-50" onClick={onRetry} disabled={disabled}><Icon name="refresh" size={14} />{retryLabel}</button>}
    </div>
  </div>;
}

export function StepHeader({ number, title, description }) {
  return <div className="mb-7"><p className="eyebrow">STEP {number} OF 4</p><h2 tabIndex={-1} data-step-heading className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 outline-none sm:text-[28px]">{title}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">{description}</p></div>;
}
