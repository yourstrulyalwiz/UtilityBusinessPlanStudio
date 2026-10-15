import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetPlanOutputs, useGeneratePlanOutput, getGetPlanOutputsQueryKey, getDownloadPlanOutputUrl, type PlanOutput } from "@workspace/api-client-react";
import { Download, FileText, Presentation, RotateCw, FileDown } from "lucide-react";
import { Btn, ErrorState } from "@/components/kit";
import { errMsg, fmtDateTime } from "@/lib/app";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Scen = { code?: string; name?: string; is_primary?: boolean };
const FMT: Record<string, { label: string; tone: string }> = {
  docx: { label: "DOCX", tone: "bg-[#E4F8F9] text-[#127A80]" },
  pdf: { label: "PDF", tone: "bg-[#FFF1E8] text-[#9A3A05]" },
  pptx: { label: "PPTX", tone: "bg-[#323D4F] text-[#EEF2F6]" },
};

export function PlanOutputsPanel({ planId, scenarios, canGenerate }: { planId: string; scenarios: unknown; canGenerate: boolean }) {
  const list = (Array.isArray(scenarios) ? scenarios : []) as Scen[];
  const primary = list.find((s) => s.is_primary) ?? list[0];
  const [scenario, setScenario] = useState<string>(primary?.code ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [dl, setDl] = useState<string | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useGetPlanOutputs(planId);
  const gen = useGeneratePlanOutput();
  const pdfOk = !!q.data?.pdfAvailable;

  const run = (format: "docx" | "pdf" | "pptx") => {
    setBusy(format);
    gen.mutate({ id: planId, data: { format, ...(scenario ? { scenarioCode: scenario } : {}) } }, {
      onSuccess: (o) => { qc.invalidateQueries({ queryKey: getGetPlanOutputsQueryKey(planId) }); toast({ title: "Output generated", description: o.filename }); download(o); },
      onError: (e) => toast({ title: "Generation failed", description: errMsg(e), variant: "destructive" }),
      onSettled: () => setBusy(null),
    });
  };
  const download = async (o: PlanOutput) => {
    setDl(o.id);
    try {
      const r = await fetch(getDownloadPlanOutputUrl(planId, o.id), { credentials: "include" });
      if (!r.ok) throw new Error(`Download failed (${r.status})`);
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a"); a.href = url; a.download = o.filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { toast({ title: "Download failed", description: errMsg(e), variant: "destructive" }); }
    finally { setDl(null); }
  };

  return (
    <div className="mt-5 border-t pt-5" data-testid="panel-plan-outputs">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-[#5B6678]">Scenario
          <select value={scenario} onChange={(e) => setScenario(e.target.value)} disabled={!canGenerate || !list.length} className="mt-1 block h-9 min-w-[200px] rounded-lg border border-input bg-white px-2.5 text-sm text-[#323D4F]" data-testid="select-output-scenario">
            {!list.length && <option value="">Primary scenario</option>}
            {list.map((s) => <option key={s.code} value={s.code}>{s.name ?? s.code}{s.is_primary ? " (primary)" : ""}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Btn disabled={!canGenerate || !!busy} onClick={() => run("docx")} data-testid="button-generate-docx"><FileText className="h-4 w-4" /> {busy === "docx" ? "Generating…" : "Generate Business Plan (DOCX)"}</Btn>
          <Btn variant="outline" disabled={!canGenerate || !!busy || !pdfOk} title={!pdfOk ? "PDF export is not available on this server" : undefined} onClick={() => run("pdf")} data-testid="button-generate-pdf"><FileDown className="h-4 w-4" /> {busy === "pdf" ? "Generating…" : "PDF"}</Btn>
          <Btn variant="navy" disabled={!canGenerate || !!busy} onClick={() => run("pptx")} data-testid="button-generate-deck"><Presentation className="h-4 w-4" /> {busy === "pptx" ? "Generating…" : "Generate Executive Deck"}</Btn>
        </div>
      </div>
      {!canGenerate && <p className="mt-2 text-xs text-[#6B7687]">Your role can download outputs but not generate them.</p>}
      {canGenerate && q.data && !pdfOk && <p className="mt-2 text-xs text-[#6B7687]">PDF is unavailable on this server; generate DOCX and save as PDF from Word.</p>}
      <p className="mt-2 text-xs text-[#6B7687]">Missing data is marked “Data needed” in the documents, never filled in.</p>

      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5B6678]">Generated files</h3>
        <button onClick={() => q.refetch()} className="inline-flex items-center gap-1 text-xs text-[#127A80] hover:underline" data-testid="button-reload-outputs"><RotateCw className={cn("h-3.5 w-3.5", q.isFetching && "animate-spin")} /> Reload</button>
      </div>
      {q.isLoading ? (
        <div className="mt-2 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-[#F7F9FB]" />)}</div>
      ) : q.isError ? (
        <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} />
      ) : !q.data?.outputs.length ? (
        <div className="mt-2 rounded-lg border border-dashed px-4 py-6 text-center text-sm text-[#5B6678]" data-testid="state-outputs-empty">No outputs yet. Generated files appear here with their version and scenario.</div>
      ) : (
        <ul className="mt-2 divide-y rounded-lg border bg-white">
          {q.data.outputs.map((o) => (
            <li key={o.id} className="flex items-center gap-3 px-3 py-2.5" data-testid={`row-output-${o.id}`}>
              <span className={cn("w-12 rounded px-1.5 py-0.5 text-center text-[11px] font-semibold", FMT[o.format]?.tone)}>{FMT[o.format]?.label ?? o.format}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[#323D4F]">{o.filename}</div>
                <div className="text-xs text-[#6B7687]">v{o.version} · {o.scenarioName} · {o.author} · {fmtDateTime(o.createdAt)}</div>
              </div>
              <Btn variant="ghost" className="h-8" disabled={dl === o.id} onClick={() => download(o)} data-testid={`button-download-${o.id}`}><Download className="h-4 w-4" /> {dl === o.id ? "…" : "Download"}</Btn>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
