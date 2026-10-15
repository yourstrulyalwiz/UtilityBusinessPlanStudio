import { Link } from "wouter";
import type { ModulePlan } from "@workspace/api-client-react";
import { ArrowRight, Archive, CheckCircle2, Download, MessageSquareWarning } from "lucide-react";
import { Card, Pill } from "@/components/kit";
import { KindBadge } from "@/components/module-context";
import { moduleColor, moduleTone, statusLabel, reviewedCount, apiHref } from "@/lib/modules";
import { fmtDateTime } from "@/lib/app";

export function ModuleOverview({ plan }: { plan: ModulePlan }) {
  const reviewed = reviewedCount(plan.modules);
  const next = plan.modules.find((m) => m.number === plan.nextModule) ?? plan.modules[0];
  const base = `/plans/${plan.planId}`;
  return (
    <div className="space-y-6">
      <Card className="rise overflow-hidden" data-testid="card-module-summary">
        <div className="navy-depth p-5 text-white">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1ED3D9]">Business plan · eight modules</span>
            <KindBadge kind={plan.kind} />
          </div>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wider text-[#AEB8C6]">Reviewed modules</div>
              <div className="mt-1 flex items-baseline gap-2"><span className="text-[34px] font-semibold leading-none tnum" data-testid="text-reviewed-count">{reviewed}</span><span className="text-sm text-[#AEB8C6]">of 8 approved · {Math.round(plan.progress)}%</span></div>
              <div className="mt-3 grid grid-cols-8 gap-1" aria-hidden>
                {plan.modules.map((m) => <span key={m.number} className="h-1.5 rounded-full" style={{ background: m.status === "approved" ? "#D9E950" : m.status === "ready_for_review" ? "#1ED3D9" : "rgba(255,255,255,.14)" }} />)}
              </div>
              <p className="mt-2 text-[11px] text-[#AEB8C6]">Counts approved modules only, not how much data is filled in.</p>
            </div>
            {next && <Link href={`${base}/modules/${next.number}`} className="btn-glow inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#1ED3D9] px-4 text-sm font-medium text-[#29323F] hover:bg-[#17BFC5]" data-testid="button-continue">Open Module {next.number} <ArrowRight className="h-4 w-4" /></Link>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t bg-white/70 px-5 py-3 text-xs">
          <a href={apiHref(`/api/plans/${plan.planId}/module-export`)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-white px-3 font-medium text-[#323D4F] hover:bg-muted" data-testid="link-module-export"><Download className="h-3.5 w-3.5" /> Export module data (JSON)</a>
          {plan.hasLegacyCopy && <a href={apiHref(`/api/plans/${plan.planId}/legacy-copy`)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-white px-3 font-medium text-[#323D4F] hover:bg-muted" data-testid="link-legacy-copy"><Archive className="h-3.5 w-3.5" /> Download archived legacy copy</a>}
          {plan.hasLegacyCopy && <span className="text-muted-foreground">The legacy copy is an immutable snapshot of the earlier workflow, kept for reference only.</span>}
        </div>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#323D4F]">Modules</h2>
          <span className="text-xs text-muted-foreground">No sequence locks. Open any module.</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {plan.modules.map((m, i) => (
            <Link key={m.number} href={`${base}/modules/${m.number}`} className="lift rise group relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card p-4 transition hover:border-[#1ED3D9]/60" style={{ animationDelay: `${i * 40}ms` }} data-testid={`card-module-${m.number}`}>
              <span className="absolute inset-y-0 left-0 w-1" style={{ background: moduleColor(m.number) }} />
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-medium text-[#5B6678]">Module {m.number}</span>
                <Pill tone={moduleTone(m.status)}>{m.status === "approved" && <CheckCircle2 className="mr-1 h-3 w-3" />}{statusLabel(m.status)}</Pill>
              </div>
              <div className="mt-1.5 text-[15px] font-semibold text-[#323D4F] group-hover:text-[#127A80]">{m.title}</div>
              {m.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#5B6678]">{m.description}</p>}
              {m.feedback && <p className="mt-2 flex gap-1.5 text-xs text-[#9A3A05]"><MessageSquareWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="line-clamp-2">Review comment: {m.feedback}</span></p>}
              <div className="mt-auto pt-3 text-[11px] text-muted-foreground">Updated {fmtDateTime(m.updatedAt)}</div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
