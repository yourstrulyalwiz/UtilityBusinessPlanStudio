import type { ModulePlan } from "@workspace/api-client-react";
import { AlertTriangle, Database, FileJson, History } from "lucide-react";
import { Card } from "@/components/kit";
import { FieldEditor, type Json } from "@/components/field-editor";
import { findKey } from "@/lib/modules";

const KIND_LABEL: Record<string, string> = {
  real: "Real utility data supplied by the user",
  fictional: "Fictional illustrative plan",
  user: "Plan populated by the task team",
};

export function KindBadge({ kind }: { kind: string }) {
  const cls = kind === "real" ? "bg-[#323D4F] text-[#EEF2F6]" : kind === "fictional" ? "bg-[#D9E950] text-[#29323F]" : "bg-[#E4F8F9] text-[#1F5F63]";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`} data-testid="badge-plan-kind">{kind === "real" ? "Real source data" : kind === "fictional" ? "Fictional example" : "Team plan"}</span>;
}

export function openIssues(plan: ModulePlan): string[] {
  const v = findKey(plan.context, "open_issues");
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x : x && typeof x === "object" ? Object.values(x as Record<string, unknown>).filter((y) => typeof y === "string").join(" — ") : String(x)));
}

export function ProvenancePanel({ plan, defaultOpen }: { plan: ModulePlan; defaultOpen?: boolean }) {
  const issues = openIssues(plan);
  const ctx = plan.context as Record<string, unknown>;
  const note = typeof ctx.migrationNote === "string" ? ctx.migrationNote : "";
  const catalog = plan.catalog as Record<string, unknown>;
  const hasCatalog = catalog && Object.keys(catalog).length > 0;
  return (
    <Card className="min-w-0 p-5 text-sm" data-testid="panel-provenance">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#323D4F] text-[#1ED3D9]"><Database className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[#323D4F]">Source and provenance</h2>
          <p className="mt-0.5 text-xs text-[#5B6678]">{KIND_LABEL[plan.kind] ?? plan.kind}. Null values mean information is missing; they are never replaced with zero.</p>
        </div>
      </div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div className="min-w-0 rounded-md bg-[#F7F9FB] p-2.5"><dt className="text-[10px] font-semibold uppercase tracking-wider text-[#5B6678]">Plan data source</dt><dd className="mt-0.5 break-words text-[#323D4F]" data-testid="text-plan-source">{plan.source || "Not recorded"}</dd></div>
        <div className="min-w-0 rounded-md bg-[#F7F9FB] p-2.5"><dt className="text-[10px] font-semibold uppercase tracking-wider text-[#5B6678]">{plan.kind === "real" ? "Original source reference" : "Example source"}</dt><dd className="mt-0.5 break-words text-[#323D4F]" data-testid="text-example-source">{plan.exampleSource || "Not recorded"}</dd></div>
      </dl>
      {note && <p className="mt-3 flex gap-2 rounded-md border border-[#1ED3D9]/30 bg-[#E4F8F9]/70 p-2.5 text-xs text-[#323D4F]"><History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#127A80]" />{note}</p>}
      <p className="mt-3 flex gap-2 rounded-md border border-[#FF6A0D]/30 bg-[#FFF1E8] p-2.5 text-xs text-[#9A3A05]"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Financial figures, scenarios and indicative tariffs are shown exactly as supplied. They have not been independently verified, and the Studio does not recalculate them.</p>
      {issues.length > 0 && <details open={defaultOpen} className="mt-3 rounded-md border border-[#FF6A0D]/30 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-[#9A3A05]" data-testid="toggle-open-issues">Open issues in the source ({issues.length})</summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs text-[#323D4F]">{issues.map((x, i) => <li key={i}>{x}</li>)}</ul>
      </details>}
      {hasCatalog && <details className="mt-3 rounded-md border p-3">
        <summary className="cursor-pointer text-xs font-semibold text-[#323D4F]" data-testid="toggle-catalog">Indicator catalog: 19 indicators, 12 KPIs (read-only)</summary>
        <p className="my-2 break-words text-[11px] text-[#5B6678]">Source: {plan.catalogSource || "not recorded"}. Optional indicators stay disabled; formulas are definitions, not an automatic calculation engine.</p>
        <FieldEditor value={catalog as Json} example={catalog} path="catalog" readOnly />
      </details>}
      <details className="mt-3 rounded-md border p-3">
        <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#323D4F]"><FileJson className="h-3.5 w-3.5" /> Plan, utility and source metadata</summary>
        <div className="mt-3"><FieldEditor value={{ meta: ctx.meta, plan: ctx.plan, utility: ctx.utility } as Json} example={{ meta: ctx.meta, plan: ctx.plan, utility: ctx.utility }} path="ctx" readOnly /></div>
      </details>
    </Card>
  );
}
