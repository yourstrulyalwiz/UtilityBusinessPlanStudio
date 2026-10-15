import { useState } from "react";
import type { ModulePlan } from "@workspace/api-client-react";
import { Printer, ScrollText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Btn } from "@/components/kit";
import { label, hiddenKey } from "@/components/field-editor";
import { StrategyReport, isStrategyV1 } from "@/components/strategy-editor";
import { AssessmentReport, isAssessmentV1 } from "@/components/assessment-editor";
import { statusLabel, reviewedCount } from "@/lib/modules";
import { fmtDateTime } from "@/lib/app";
import { BaselineReport } from "@/components/baseline-editor";
import { M4View, M5View, M6View, M7View, M8View, normalizeScenarios, summaryText } from "@/components/module-views";
import { HistoryPanel, HISTORY_SOURCE, SourceProvider, obj, str, isR } from "@/components/plan-data";

/** Structured fallback: short fields as a definition grid, arrays of records as tables. */
function Structured({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span className="text-[#6B7687]">No data</span>;
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-[#6B7687]">No entries</span>;
    if (value.every(isR)) {
      const cols = Array.from(new Set(value.flatMap((r) => Object.keys(r).filter((k) => !hiddenKey(k) && !isR(r[k]) && !Array.isArray(r[k]))))).slice(0, 6);
      return <table className="w-full border-collapse text-[11px]"><thead><tr className="border-b-2 border-[#323D4F]/20 text-left">{cols.map((c) => <th key={c} className="py-1 pr-2 font-semibold">{label(c)}</th>)}</tr></thead><tbody>{value.map((r, i) => <tr key={i} className="border-b border-[#E3E8EE] align-top">{cols.map((c) => <td key={c} className="py-1 pr-2">{str(r[c]) || (typeof r[c] === "boolean" ? (r[c] ? "Yes" : "No") : "–")}</td>)}</tr>)}</tbody></table>;
    }
    return <ul className="list-disc space-y-0.5 pl-4 text-xs">{value.map((v, i) => <li key={i}>{typeof v === "object" ? <Structured value={v} /> : String(v)}</li>)}</ul>;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([k, v]) => !hiddenKey(k) && k !== "strategyVersion" && k !== "gap_note" && v !== null && v !== "");
    if (!entries.length) return <span className="text-[#6B7687]">No data</span>;
    return <dl className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">{entries.map(([k, v]) => <div key={k} className={typeof v === "object" ? "sm:col-span-2" : ""}><dt className="text-[10px] font-semibold uppercase tracking-wide text-[#5B6678]">{label(k)}</dt><dd className="mt-0.5"><Structured value={v} /></dd></div>)}</dl>;
  }
  return <span className="whitespace-pre-wrap break-words text-xs">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</span>;
}

function ModuleBody({ n, data, kind }: { n: number; data: unknown; kind: string }) {
  if (n === 1) return <div className="space-y-3"><BaselineReport value={data} />{kind === "real" && <HistoryPanel history={obj(data).history} source={HISTORY_SOURCE} title="Indicator history" />}</div>;
  if (n === 2 && isStrategyV1(data)) return <StrategyReport value={data} />;
  if (n === 3 && isAssessmentV1(data)) return <AssessmentReport value={data} />;
  if (n === 4) return <M4View data={data} />;
  if (n === 5) return <M5View data={data} />;
  if (n === 6) return <M6View data={data} />;
  if (n === 7) return <M7View data={data} />;
  if (n === 8) return <M8View data={data} />;
  return <Structured value={data} />;
}

/** Formatted plan report: cover, executive summary and eight sections, A4 print-ready. */
export function PlanReport({ plan }: { plan: ModulePlan }) {
  const [open, setOpen] = useState(false);
  const m8 = plan.modules.find((m) => m.number === 8);
  const summary = summaryText(obj(m8?.data).executive_summary);
  const scen = normalizeScenarios(plan.scenarios).fixed;
  const now = fmtDateTime(new Date().toISOString());
  return (
    <>
      <Btn variant="outline" onClick={() => setOpen(true)} data-testid="button-open-report"><ScrollText className="h-4 w-4" /> Business plan report</Btn>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="report-dialog max-h-[94dvh] max-w-5xl overflow-auto rounded-xl">
          <DialogHeader className="no-print">
            <DialogTitle className="text-[#323D4F]">Business plan report</DialogTitle>
            <DialogDescription>Saved data for all eight modules. Unsaved edits are not included. Print uses A4 pages.</DialogDescription>
          </DialogHeader>
          <div className="no-print flex justify-end"><Btn onClick={() => window.print()} data-testid="button-print-report"><Printer className="h-4 w-4" /> Print or save as PDF</Btn></div>
          <SourceProvider kind={plan.kind}><article className="print-report bg-white text-[#323D4F]">
            <section className="report-cover navy-depth relative flex min-h-[520px] flex-col justify-between overflow-hidden rounded-xl p-10 text-[#EEF2F6]">
              <div className="flex items-center gap-3"><img src={`${import.meta.env.BASE_URL}brand-hub.svg`} alt="" className="h-10 w-10" /><span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1ED3D9]">Business Plan Studio</span></div>
              <div>
                <div className="text-sm text-[#AEB8C6]">Water and sanitation service business plan</div>
                <h1 className="mt-2 text-4xl font-semibold leading-tight" data-testid="text-report-utility">{plan.utilityName}</h1>
                <div className="mt-4 h-1 w-24 rounded bg-[linear-gradient(90deg,#1ED3D9,#D9E950,#FF6A0D)]" />
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div><div className="text-[#AEB8C6]">Reviewed modules</div><div className="mt-1 text-lg font-semibold tnum">{reviewedCount(plan.modules)} of 8</div></div>
                <div><div className="text-[#AEB8C6]">Generated</div><div className="mt-1 font-medium">{now}</div></div>
                <div><div className="text-[#AEB8C6]">Figures</div><div className="mt-1 font-medium">As supplied, not recalculated</div></div>
              </div>
            </section>

            <section className="report-page mt-8 space-y-4">
              <h2 className="border-b-2 border-[#1ED3D9] pb-1 text-xl font-semibold">Executive summary</h2>
              {summary.length ? summary.map((p, i) => <p key={i} className="text-sm leading-relaxed">{p}</p>) : <p className="text-sm text-[#6B7687]">No executive summary has been supplied yet.</p>}
              <table className="w-full border-collapse text-xs">
                <thead><tr className="border-b-2 border-[#323D4F]/20 text-left"><th className="py-1.5">Module</th><th className="py-1.5">Section</th><th className="py-1.5">Status</th></tr></thead>
                <tbody>{plan.modules.map((m) => <tr key={m.number} className="border-b border-[#E3E8EE]"><td className="py-1.5 font-mono">M{m.number}</td><td className="py-1.5">{m.title}</td><td className="py-1.5">{statusLabel(m.status)}</td></tr>)}</tbody>
              </table>
              <div>
                <h3 className="mb-1.5 text-sm font-semibold">Scenarios</h3>
                <table className="w-full border-collapse text-xs"><tbody>{scen.map((s) => <tr key={str(s.code)} className="border-b border-[#E3E8EE] align-top"><td className="w-32 py-1.5 font-semibold">{str(s.name)}{s.is_primary ? " (primary)" : ""}</td><td className="py-1.5">{str(s.description) || "Not described"}{str(s.assumptions) ? ` Assumptions: ${str(s.assumptions)}` : ""} <span className="text-[#6B7687]">Projections: {Object.keys(obj(s.projections)).length ? "supplied" : "unknown"}.</span></td></tr>)}</tbody></table>
              </div>
            </section>

            {plan.modules.map((m) => (
              <section key={m.number} className="report-page mt-10">
                <div className="mb-3 flex items-end justify-between gap-3 border-b-2 border-[#1ED3D9] pb-1.5">
                  <h2 className="text-xl font-semibold"><span className="mr-2 font-mono text-sm text-[#127A80]">{String(m.number).padStart(2, "0")}</span>{m.title}</h2>
                  <span className="text-[11px] text-[#5B6678]">{statusLabel(m.status)}</span>
                </div>
                <ModuleBody n={m.number} data={m.data} kind={plan.kind} />
              </section>
            ))}
            <footer className="mt-8 border-t pt-2 text-[10px] text-[#6B7687]">{plan.utilityName} · Business plan report · {now}</footer>
          </article></SourceProvider>
        </DialogContent>
      </Dialog>
    </>
  );
}
