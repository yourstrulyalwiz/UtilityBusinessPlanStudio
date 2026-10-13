import type { ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function Glyph({ className, light }: { className?: string; light?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <path d="M16 3c4.8 6 8.5 10.8 8.5 15.3A8.5 8.5 0 0 1 7.5 18.3C7.5 13.8 11.2 9 16 3Z" fill={light ? "#009FDA" : "#002244"} />
      <rect x="11.5" y="18" width="2.2" height="5" rx=".6" fill="#fff" />
      <rect x="14.9" y="15.5" width="2.2" height="7.5" rx=".6" fill="#fff" />
      <rect x="18.3" y="13" width="2.2" height="10" rx=".6" fill="#fff" />
    </svg>
  );
}

export function Wave({ className }: { className?: string }) {
  return <div className={cn("wave-line w-full", className)} aria-hidden />;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between rise">
      <div>
        {eyebrow && <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#009FDA]">{eyebrow}</div>}
        <h1 className="text-[26px] font-semibold tracking-tight text-[#002244]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-card-border bg-card", className)} {...rest}>{children}</div>;
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center" data-testid="state-empty">
      <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#009FDA]/10 text-[#009FDA]">{icon}</div>
      <div className="text-[15px] font-semibold text-[#002244]">{title}</div>
      <div className="mt-1.5 max-w-sm text-sm text-muted-foreground">{body}</div>
      <Wave className="mt-6 max-w-[160px] opacity-70" />
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center" data-testid="state-error">
      <AlertTriangle className="mb-3 h-6 w-6 text-destructive" />
      <div className="text-sm font-medium text-[#002244]">This could not be loaded</div>
      <div className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</div>
      {onRetry && (
        <button onClick={onRetry} data-testid="button-retry" className="mt-4 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted">
          <RotateCw className="h-3.5 w-3.5" /> Try again
        </button>
      )}
    </div>
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-1/5 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "blue" | "green" | "amber" | "red" | "navy" }) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    blue: "bg-[#009FDA]/10 text-[#00739e]",
    green: "bg-[#5B8C1F]/12 text-[#4a7318]",
    amber: "bg-[#D9622B]/12 text-[#b34d1d]",
    red: "bg-destructive/10 text-destructive",
    navy: "bg-[#002244]/8 text-[#002244]",
  };
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", tones[tone])}>{children}</span>;
}

export function statusTone(s: string): "neutral" | "blue" | "green" | "amber" | "red" {
  const v = s.toLowerCase();
  if (["approved", "completed", "complete", "active", "done"].includes(v)) return "green";
  if (["pending", "in_progress", "in progress", "submitted"].includes(v)) return "blue";
  if (["declined", "rejected"].includes(v)) return "red";
  if (["archived", "inactive"].includes(v)) return "neutral";
  return "amber";
}

export const inputCls = "h-9 w-full rounded-lg border border-input bg-white px-3 text-sm text-[#002244] outline-none transition focus:border-[#009FDA] focus:ring-2 focus:ring-[#009FDA]/20 disabled:opacity-60";

export function Field({ label, hint, error, children, required }: { label: string; hint?: string; error?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#002244]">
        {label}{required && <span className="text-[#009FDA]"> *</span>}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Btn({ variant = "primary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger" | "navy" }) {
  const v = {
    primary: "bg-[#009FDA] text-white hover:bg-[#008dc2]",
    navy: "bg-[#002244] text-white hover:bg-[#0a3360]",
    outline: "border border-input bg-white text-[#002244] hover:bg-muted",
    ghost: "text-[#002244] hover:bg-muted",
    danger: "bg-destructive text-white hover:opacity-90",
  };
  return <button {...p} className={cn("inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50", v[variant], className)} />;
}
