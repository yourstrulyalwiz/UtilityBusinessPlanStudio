import type { ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function Glyph({ className }: { className?: string; light?: boolean }) {
  return <img src={`${import.meta.env.BASE_URL}brand-hub.svg`} alt="" aria-hidden className={cn("h-8 w-8", className)} />;
}

export function Wave({ className }: { className?: string }) {
  return <div className={cn("wave-line w-full", className)} aria-hidden />;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-hero navy-depth mb-7 flex flex-col gap-4 rounded-2xl p-6 md:flex-row md:items-end md:justify-between md:p-8 rise">
      <div>
        {eyebrow && <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1ED3D9]">{eyebrow}</div>}
        <h1 className="text-[26px] font-semibold tracking-tight text-[#EEF2F6] md:text-[30px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-[#AEB8C6]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-xl border", className)} {...rest}>{children}</div>;
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center" data-testid="state-empty">
      <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#1ED3D9]/10 text-[#127A80] ring-8 ring-[#1ED3D9]/[.05]">{icon}</div>
      <div className="text-[15px] font-semibold text-[#323D4F]">{title}</div>
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
      <div className="text-sm font-medium text-[#323D4F]">This could not be loaded</div>
      <div className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</div>
      {onRetry && (
        <button onClick={onRetry} data-testid="button-retry" className="mt-4 inline-flex items-center gap-1.5 min-h-10 rounded-lg border bg-white px-4 text-sm font-medium text-[#323D4F] hover:bg-muted">
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
    blue: "bg-[#E4F8F9] text-[#1F5F63]",
    green: "bg-[#D9E950] text-[#29323F]",
    amber: "bg-[#FFF1E8] text-[#9A3A05]",
    red: "bg-[#FFF1E8] text-[#9A3A05]",
    navy: "bg-[#323D4F] text-[#EEF2F6]",
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

export const inputCls = "h-10 w-full rounded-lg border border-input bg-white px-3 text-sm text-[#323D4F] outline-none transition focus:border-[#127A80] focus:ring-2 focus:ring-[#1ED3D9]/40 disabled:opacity-60";

export function Field({ label, hint, error, children, required }: { label: string; hint?: string; error?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#323D4F]">
        {label}{required && <span className="text-[#127A80]"> *</span>}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Btn({ variant = "primary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger" | "navy" }) {
  const v = {
    primary: "btn-glow bg-[#1ED3D9] font-semibold text-[#29323F] hover:bg-[#17BFC5]",
    navy: "bg-[#323D4F] text-[#EEF2F6] hover:bg-[#29323F]",
    outline: "border border-input bg-white text-[#323D4F] hover:bg-muted",
    ghost: "text-[#323D4F] hover:bg-muted",
    danger: "bg-destructive text-white hover:opacity-90",
  };
  return <button {...p} className={cn("inline-flex min-h-11 h-11 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium transition duration-150 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ED3D9] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", v[variant], className)} />;
}
