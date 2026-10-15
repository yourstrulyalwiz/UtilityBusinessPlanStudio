import { useState } from "react";
import type { ModulePlan } from "@workspace/api-client-react";
import { Printer, ScrollText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Btn } from "@/components/kit";
import { label, hiddenKey } from "@/components/field-editor";
import { StrategyReport, isStrategyV1 } from "@/components/strategy-editor";
import { openIssues } from "@/components/module-context";
import { statusLabel, reviewedCount } from "@/lib/modules";
import { fmtDateTime } from "@/lib/app";
import { BaselineReport } from "@/components/baseline-editor";

function ReportValue({value}:{value:unknown}) {
  if(value===null||value===undefined)return <span className="text-[#5B6678]">No data</span>;
  if(Array.isArray(value))return value.length?<ol className="space-y-3 border-l pl-3">{value.map((v,i)=><li key={i}><ReportValue value={v}/></li>)}</ol>:<span>No entries</span>;
  if(typeof value==="object")return <dl className="space-y-2">{Object.entries(value).filter(([k])=>!hiddenKey(k)&&k!=="strategyVersion").map(([k,v])=><div key={k}><dt className="text-xs font-semibold">{label(k)}</dt><dd className="pl-2"><ReportValue value={v}/></dd></div>)}</dl>;
  return <p className="whitespace-pre-wrap break-words text-sm">{typeof value==="boolean"?(value?"Yes":"No"):String(value)}</p>;
}
/** Print-friendly view of the saved module data. It is a readable dump, not a formatted business-plan document. */
export function PlanReport({ plan }: { plan: ModulePlan }) {
  const [open, setOpen] = useState(false);
  const issues = openIssues(plan);
  return (
    <>
      <Btn variant="outline" onClick={() => setOpen(true)} data-testid="button-open-report"><ScrollText className="h-4 w-4" /> Print-friendly plan report</Btn>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="report-dialog max-h-[94dvh] max-w-4xl overflow-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#323D4F]">Plan report</DialogTitle>
            <DialogDescription>Saved data for all eight modules as stored. Unsaved edits are not included.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end"><Btn onClick={() => window.print()} data-testid="button-print-report"><Printer className="h-4 w-4" /> Print or save as PDF</Btn></div>
          <article className="print-report space-y-6 bg-white p-2 text-[#323D4F]">
            <header className="border-b pb-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#127A80]">Urban Water and Sanitation Service Optimization - Business Plan Studio</div>
              <h1 className="mt-1 text-2xl font-semibold">{plan.utilityName}</h1>
              <p className="mt-1 text-xs text-[#5B6678]">Reviewed modules: {reviewedCount(plan.modules)} of 8 · Generated {fmtDateTime(new Date().toISOString())}</p>
                            <p className="mt-2 rounded border border-[#FF6A0D]/30 bg-[#FFF1E8] p-2 text-xs text-[#9A3A05]">Financial values and scenarios are reproduced as supplied and were not recalculated by the Studio.</p>
            </header>
            {plan.modules.map((m) => (
              <section key={m.number} className="break-inside-avoid-page">
                <h2 className="text-lg font-semibold">Module {m.number}: {m.title} <span className="ml-2 text-xs font-normal text-[#5B6678]">{statusLabel(m.status)}</span></h2>
                {m.description && <p className="mb-2 text-xs text-[#5B6678]">{m.description}</p>}
                {m.number === 1 ? <BaselineReport value={m.data} /> : m.number === 2 && isStrategyV1(m.data) ? <StrategyReport value={m.data} /> : <ReportValue value={m.data} />}
              </section>
            ))}
            {issues.length > 0 && <section><h2 className="text-lg font-semibold">Open issues</h2><ul className="list-disc pl-5 text-sm">{issues.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
          </article>
        </DialogContent>
      </Dialog>
    </>
  );
}
