import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetModulePlan, getGetModulePlanQueryKey, useUpdateModule, getGetPlanQueryKey, getGetWorkflowQueryKey,
  getListUtilitiesQueryKey, getGetSummaryQueryKey, type ModuleActionAction, type ModulePlan,
} from "@workspace/api-client-react";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Download, RotateCcw, Save, Send, Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, ErrorState, Pill, Btn, inputCls } from "@/components/kit";
import { FieldEditor, meaningful, type Json } from "@/components/field-editor";
import { ModuleHelpButton, HelpRail } from "@/components/module-help";
import { KindBadge } from "@/components/module-context";
import { BaselineEditor } from "@/components/baseline-editor";
import { PlanReport } from "@/components/module-report";
import { PlanOutputsPanel } from "@/components/plan-outputs";
import { StrategyEditor, isStrategyV1 } from "@/components/strategy-editor";
import { AssessmentEditor, AssessmentGuide, isAssessmentV1 } from "@/components/assessment-editor";
import { useMe, errMsg, fmtDateTime } from "@/lib/app";
import { moduleColor, moduleTone, statusLabel, reviewedCount, toTopic, isConflict, apiHref, stageProgress, PROGRESS_HELP } from "@/lib/modules";
import { useToast } from "@/hooks/use-toast";
import { M4View, M5View, M6View, M7View, M8View, ScenarioPanel, normalizeScenarios } from "@/components/module-views";
import { WhatIfSimulator } from "@/components/simulator";
import { HistoryPanel, Collapse, HISTORY_SOURCE, SourceProvider } from "@/components/plan-data";
import { cn } from "@/lib/utils";

const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const DONE: Record<string, string> = { save: "Draft saved", submit: "Submitted for review", approve: "Module approved", return: "Returned for revision", reopen: "Module reopened" };

export default function ModulePage() {
  const { planId = "", number = "1" } = useParams<{ planId: string; number: string }>();
  const num = Number(number);
  const [, navigate] = useLocation();
  const me = useMe();
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useGetModulePlan(planId, { query: { enabled: !!planId, queryKey: getGetModulePlanQueryKey(planId) } });
  const plan = q.data;
  const mod = plan?.modules.find((m) => m.number === num);

  const [draft, setDraft] = useState<Json>({});
  const [scen, setScen] = useState<Json>([]);
  const [dirty, setDirty] = useState(false);
  const [stamp, setStamp] = useState("");
  const [tab, setTab] = useState<"form" | "example" | "scenarios">("form");
  const [confirmFill, setConfirmFill] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [conflict, setConflict] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const initFor = useRef("");

  useEffect(() => {
    if (plan && mod && initFor.current !== `${planId}:${num}`) {
      initFor.current = `${planId}:${num}`;
      setDraft(clone(mod.data as Json)); setScen(clone(plan.scenarios as Json));
      setStamp(mod.updatedAt); setDirty(false); setTab("form"); setComment(""); setConflict(false); setSavedAt(null);
    }
  }, [plan, mod, planId, num]);

  const update = useUpdateModule({
    mutation: {
      onSuccess: (res: ModulePlan, vars) => {
        qc.setQueryData(getGetModulePlanQueryKey(planId), res);
        qc.invalidateQueries({ queryKey: getGetWorkflowQueryKey(planId) });
        qc.invalidateQueries({ queryKey: getGetPlanQueryKey(planId) });
        qc.invalidateQueries({ queryKey: getListUtilitiesQueryKey() });
        qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        const fresh = res.modules.find((m) => m.number === vars.number);
        if (fresh) { setStamp(fresh.updatedAt); setDraft(clone(fresh.data as Json)); }
        setScen(clone(res.scenarios as Json));
        setDirty(false); setConflict(false); setComment(""); setSavedAt(new Date().toISOString());
        toast({ title: DONE[vars.data.action] });
      },
      onError: (e) => {
        if (isConflict(e)) setConflict(true);
        toast({ title: "Action failed - your edits are kept", description: errMsg(e), variant: "destructive" });
      },
    },
  });
  const pending = update.isPending;

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  useEffect(() => {
    const guard = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href]");
      if (!a || (!dirty && !pending)) return;
      const href = a.getAttribute("href");
      if (!href?.startsWith("/") || href.startsWith("/api/")) return;
      e.preventDefault(); e.stopPropagation();
      if (!pending) setPendingNav(href);
    };
    document.addEventListener("click", guard, true);
    return () => document.removeEventListener("click", guard, true);
  }, [dirty, pending]);

  const topics = useMemo(() => (plan?.guidance ?? []).filter((g) => g.module === num).map(toTopic), [plan, num]);

  const role = me.role;
  const canEdit = !!plan?.canEdit && role !== "viewer";
  const canReview = !!plan?.canReview && (role === "admin" || role === "ttl");
  const status = mod?.status ?? "";
  const frozen = status === "ready_for_review" || status === "approved";
  const editable = !!mod && canEdit && !frozen;
  const strat = num === 2 && isStrategyV1(draft);
  const assess = num === 3 && isAssessmentV1(draft);
  const canFill = editable && num !== 1 && (plan?.kind === "fictional" || plan?.kind === "user") && (!strat || isStrategyV1(mod?.example)) && (num !== 3 || isAssessmentV1(draft) === isAssessmentV1(mod?.example));

  const run = (action: ModuleActionAction) => {
    if (!mod) return;
    if (action === "return" && !comment.trim()) { toast({ title: "Add a comment explaining what to revise", variant: "destructive" }); return; }
    const withData = action === "save" || action === "submit";
    update.mutate({ id: planId, number: mod.number, data: {
      action, updatedAt: stamp,
      ...(withData ? { data: draft as Record<string, unknown> } : {}),
      ...(withData && mod.number === 1 ? { scenarios: normalizeScenarios(scen).fixed as unknown[] } : {}),
      ...(comment.trim() ? { comment: comment.trim() } : {}),
    } });
  };
  const go = (href: string) => { if (pending) return; if (dirty) setPendingNav(href); else navigate(href); };

  if (q.isLoading) return <div className="space-y-4"><div className="h-40 animate-pulse rounded-xl border bg-card" /><div className="h-[480px] animate-pulse rounded-xl border bg-card" /></div>;
  if (q.isError || !plan) return <Card><ErrorState message={errMsg(q.error, "This plan could not be loaded.")} onRetry={() => q.refetch()} /></Card>;
  if (!mod) return <Card><ErrorState message={`Module ${number} is not part of this plan. Modules are numbered 1 to 8.`} /></Card>;

  const base = `/plans/${planId}`;
  const prev = plan.modules.find((m) => m.number === num - 1);
  const next = plan.modules.find((m) => m.number === num + 1);
  const color = moduleColor(num);
  const reviewed = reviewedCount(plan.modules);
  const exLabel = "Reference example";
  const View = num === 4 ? M4View : num === 5 ? M5View : num === 6 ? M6View : num === 7 ? M7View : num === 8 ? M8View : null;

  return (
    <SourceProvider kind={plan.kind}>
    <div>
      <button onClick={() => go(base)} className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#323D4F]" data-testid="link-back-overview"><ArrowLeft className="h-4 w-4" /> {plan.utilityName} overview</button>

      {/* Module rail */}
      <Card className="navy-depth rise mb-5 overflow-hidden p-0 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-[#1ED3D9]">Eight modules · open any in any order</span>
          <span className="text-[#AEB8C6]" data-testid="text-reviewed" title={PROGRESS_HELP}>Workflow progress: <strong className="text-[#EEF2F6] tnum">{Math.round(plan.progress)}%</strong> · Approved: {reviewed}/8</span>
        </div>
        <nav className="grid grid-cols-4 gap-1.5 p-3 sm:grid-cols-8" aria-label="Modules">
          {plan.modules.map((m) => (
            <button key={m.number} onClick={() => m.number !== num && go(`${base}/modules/${m.number}`)} aria-current={m.number === num ? "page" : undefined}
              className={cn("group min-w-0 rounded-lg border px-2.5 py-2 text-left transition", m.number === num ? "border-[#1ED3D9] bg-white/[.14]" : "border-white/10 bg-white/[.04] hover:border-white/30")} data-testid={`nav-module-${m.number}`}>
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[11px] text-[#AEB8C6]">M{m.number}</span>
                {m.status === "approved" ? <CheckCircle2 className="h-3.5 w-3.5 text-[#D9E950]" aria-label="Approved" /> : <span className="h-2 w-2 rounded-full" style={{ background: moduleColor(m.number), opacity: m.status === "not_started" ? 0.35 : 1 }} />}
              </div>
              <div className="mt-0.5 truncate text-[12px] font-medium text-[#EEF2F6]">{m.title}</div>
              <div className="truncate text-[10px] text-[#AEB8C6]" title={PROGRESS_HELP}>{statusLabel(m.status)} · {stageProgress(m.status)}%</div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`Module ${m.number} workflow progress`} aria-valuenow={stageProgress(m.status)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full" style={{width:`${stageProgress(m.status)}%`,background:moduleColor(m.number)}} /></div>
            </button>
          ))}
        </nav>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <Card className="rise overflow-hidden">
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}33)` }} />
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-[0.12em] text-[#127A80]" data-testid="text-module-number">Module {num} of 8</span>
                <KindBadge kind={plan.kind} />
                <span className="ml-auto" title={PROGRESS_HELP}><Pill tone={moduleTone(status)}>{statusLabel(status)} · {stageProgress(status)}%</Pill></span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#323D4F] md:text-[28px]" data-testid="text-module-title">{mod.title}</h1>
              {mod.description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#5B6678]" data-testid="text-module-description">{mod.description}</p>}
              {num !== 1 && !assess && <div className="mt-4 flex flex-wrap gap-2"><ModuleHelpButton topics={topics} moduleNumber={num} moduleTitle={mod.title} /></div>}
              {!canEdit && <div className="mt-4 rounded-lg bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">Your role has read-only access to this plan.</div>}
              
              {mod.feedback && <p className="mt-4 rounded-lg border border-[#FF6A0D]/30 bg-[#FFF1E8] p-4 text-sm text-[#9A3A05]" data-testid="text-feedback"><strong>Latest review comment:</strong> {mod.feedback}</p>}
              {conflict && <div className="mt-4 flex flex-col gap-2 rounded-lg border border-[#FF6A0D]/50 bg-[#FFF1E8] p-4 text-sm text-[#9A3A05] sm:flex-row sm:items-center" data-testid="text-conflict">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="flex-1">Someone else changed this module since you opened it. Your draft is still here and has not been discarded. Copy anything you need, then reload the latest version.</span>
                <Btn variant="outline" className="h-8" onClick={() => { q.refetch().then((r) => { const m = r.data?.modules.find((x) => x.number === num); if (r.data && m) { setDraft(clone(m.data as Json)); setScen(clone(r.data.scenarios as Json)); setStamp(m.updatedAt); setDirty(false); setConflict(false); } }); }} data-testid="button-reload-latest">Discard my draft and reload</Btn>
              </div>}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              {num !== 1 && <div className="flex rounded-lg bg-[#323D4F]/[.06] p-0.5 text-sm" role="tablist">
                <button role="tab" aria-selected={tab === "form"} onClick={() => setTab("form")} className={cn("rounded-md px-3 py-1.5", tab === "form" && "bg-white font-medium text-[#323D4F] shadow-sm")} data-testid="tab-form">Your module</button>
                <button role="tab" aria-selected={tab === "example"} onClick={() => setTab("example")} className={cn("rounded-md px-3 py-1.5", tab === "example" && "bg-white font-medium text-[#323D4F] shadow-sm")} data-testid="tab-example">{exLabel}</button>
              </div>}
              {num === 1 && <div className="flex rounded-lg bg-[#323D4F]/[.06] p-0.5 text-sm" role="tablist">
                <button role="tab" aria-selected={tab !== "scenarios"} onClick={() => setTab("form")} className={cn("rounded-md px-3 py-1.5", tab !== "scenarios" && "bg-white font-medium text-[#323D4F] shadow-sm")} data-testid="tab-indicators">Indicators</button>
                <button role="tab" aria-selected={tab === "scenarios"} onClick={() => setTab("scenarios")} className={cn("rounded-md px-3 py-1.5", tab === "scenarios" && "bg-white font-medium text-[#323D4F] shadow-sm")} data-testid="tab-scenarios">Scenarios (3 fixed)</button>
              </div>}
              {canFill && tab === "form" && <Btn variant="outline" className="h-8" disabled={pending} onClick={() => setConfirmFill(true)} data-testid="button-fill-example">Fill with fictional example</Btn>}
            </div>
            {num === 1 && tab === "scenarios" ? (
              <ScenarioPanel value={scen} readOnly={!editable || pending} onChange={(v) => { setScen(v as unknown as Json); setDirty(true); }} />
            ) : num === 1 ? (
              <div className="space-y-5">
                {frozen && <p className="mb-3 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{status === "approved" ? "Approved. Fields are frozen until a reviewer reopens the module." : "Ready for review. Fields are frozen until a reviewer approves or returns it."}</p>}
                <BaselineEditor value={draft} readOnly={!editable || pending} onChange={(v) => { setDraft(v as unknown as Json); setDirty(true); }} />
              </div>
            ) : tab === "example" ? (
              <div>
                <div className="mb-4 rounded-md bg-[#FFF1E8] px-3 py-2 text-xs text-[#9A3A05]" data-testid="text-example-note">{plan.kind === "real" ? "Original supplied source data for this module, including gaps and estimates. Read-only." : "Fictional illustrative example. Read-only; replace with your utility's information."}</div>
                {meaningful(mod.example) ? (num === 2 && isStrategyV1(mod.example) ? <StrategyEditor value={mod.example as Json} readOnly /> : num === 3 && isAssessmentV1(mod.example) ? <AssessmentEditor value={mod.example as Json} readOnly /> : View ? <View data={mod.example} /> : <FieldEditor value={mod.example as Json} example={mod.example} readOnly path={`ex.${num}`} />) : <p className="text-sm text-muted-foreground">No example supplied for this module.</p>}
              </div>
            ) : (
              <div>
                {frozen && <p className="mb-3 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{status === "approved" ? "Approved. Fields are frozen until a reviewer reopens the module." : "Ready for review. Fields are frozen until a reviewer approves or returns it."}</p>}
                {View && <div className="mb-5 space-y-4"><View data={draft} />{num === 5 && <WhatIfSimulator />}</div>}
                {View ? <Collapse title={editable ? "Edit supplied figures" : "All supplied fields"} sub="Full data tables; values are stored as entered" testid="collapse-edit-tables"><FieldEditor value={draft} example={plan.kind === "real" ? mod.data : mod.example} readOnly={!editable || pending} path={`m${num}`} onChange={(v) => { setDraft(v); setDirty(true); }} /></Collapse> : strat ? <StrategyEditor value={draft} readOnly={!editable || pending} onChange={(v) => { setDraft(v); setDirty(true); }} /> : assess ? <AssessmentEditor value={draft} readOnly={!editable || pending} onChange={(v) => { setDraft(v); setDirty(true); }} /> : <FieldEditor value={draft} example={plan.kind === "real" ? mod.data : mod.example} readOnly={!editable || pending} path={`m${num}`} onChange={(v) => { setDraft(v); setDirty(true); }} />}
              </div>
            )}
          </Card>

          {num === 8 && <Card className="p-5" data-testid="card-outputs">
            <h2 className="text-sm font-semibold text-[#323D4F]">Outputs</h2>
            <p className="mt-1 text-xs text-[#5B6678]">Generate the formatted Business Plan and Executive Deck from saved module data, or export the raw data and a print-friendly report.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <PlanReport plan={plan} />
              <a href={apiHref(`/api/plans/${planId}/module-export`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-white px-3.5 text-sm font-medium text-[#323D4F] hover:bg-muted" data-testid="link-module-export"><Download className="h-4 w-4" /> Export module data (JSON)</a>
            </div>
            <PlanOutputsPanel planId={planId} scenarios={plan?.scenarios} canGenerate={canEdit} />
          </Card>}

          <div className="flex items-center justify-between gap-2">
            <Btn variant="outline" disabled={!prev} onClick={() => prev && go(`${base}/modules/${prev.number}`)} data-testid="button-prev-module"><ChevronLeft className="h-4 w-4" /> {prev ? <span className="hidden sm:inline">Module {prev.number}: {prev.title}</span> : "Previous"}{prev && <span className="sm:hidden">M{prev.number}</span>}</Btn>
            <Link href={base} className="text-xs text-muted-foreground hover:text-[#323D4F]" data-testid="link-overview">All modules</Link>
            <Btn variant="outline" disabled={!next} onClick={() => next && go(`${base}/modules/${next.number}`)} data-testid="button-next-module">{next ? <><span className="hidden sm:inline">Module {next.number}: {next.title}</span><span className="sm:hidden">M{next.number}</span></> : "Next"} <ChevronRight className="h-4 w-4" /></Btn>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-4 xl:sticky xl:top-20">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#323D4F]">Save and review</div>
            <div className="mt-2 text-xs" data-testid="status-save">
              {pending ? <span className="text-[#127A80]">Saving...</span> : dirty ? <span className="font-medium text-[#9A3A05]">Unsaved changes</span> : savedAt ? <span className="text-[#3F6E22]">Saved {fmtDateTime(savedAt)}</span> : <span className="text-muted-foreground">Last updated {fmtDateTime(stamp)}</span>}
            </div>
            {editable && <div className="mt-3 space-y-2">
              <Btn variant="outline" className="w-full" disabled={pending || !dirty} onClick={() => run("save")} data-testid="button-save"><Save className="h-4 w-4" /> Save draft</Btn>
              <Btn className="w-full" disabled={pending} onClick={() => run("submit")} data-testid="button-submit"><Send className="h-4 w-4" /> Save and submit for review</Btn>
              <p className="text-[11px] text-muted-foreground">Saving is manual. Submitting does not approve; a reviewer must approve or return it.</p>
            </div>}
            {canReview && frozen && <div className="mt-3 space-y-2 border-t pt-3">
              <label className="text-[11px] font-medium text-[#323D4F]" htmlFor="review-comment">Review comment{status === "ready_for_review" ? " (required to return)" : ""}</label>
              <textarea id="review-comment" rows={3} className={cn(inputCls, "h-auto py-2 text-xs")} value={comment} onChange={(e) => setComment(e.target.value)} data-testid="input-review-comment" />
              {status === "ready_for_review" && <>
                <Btn variant="navy" className="w-full" disabled={pending} onClick={() => run("approve")} data-testid="button-approve"><CheckCircle2 className="h-4 w-4" /> Approve</Btn>
                <Btn variant="outline" className="w-full" disabled={pending || !comment.trim()} onClick={() => run("return")} data-testid="button-return"><Undo2 className="h-4 w-4" /> Return for revision</Btn>
              </>}
              {status === "approved" && <Btn variant="outline" className="w-full" disabled={pending} onClick={() => run("reopen")} data-testid="button-reopen"><RotateCcw className="h-4 w-4" /> Reopen</Btn>}
            </div>}
          </Card>
          {num === 1 ? <Card className="p-4 text-sm"><h3 className="font-semibold">Working with your baseline</h3><ol className="mt-3 list-decimal space-y-3 pl-4 text-muted-foreground"><li>Review indicators and expand their formulas to understand each level.</li><li>Open the variable groups at the end to enter or correct data. Use one consistent reporting period.</li><li>Add analytical notes explaining gaps, estimates and actions.</li><li>Save your draft. Resolve consistency errors before submitting for review.</li></ol><p className="mt-4 text-xs text-muted-foreground">Missing data is not zero. An indicator without reference bands is informational, not rated.</p></Card> : assess ? <Card className="p-4"><AssessmentGuide /></Card> : <Card className="p-4"><HelpRail key={num} topics={topics} moduleNumber={num} /></Card>}
        </div>
      </div>

      <Dialog open={confirmFill} onOpenChange={setConfirmFill}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader><DialogTitle className="text-[#323D4F]">Replace this module with the fictional example?</DialogTitle><DialogDescription>Your current entries in this module will be overwritten by fictional illustrative values. Nothing is saved until you click Save draft.</DialogDescription></DialogHeader>
          <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setConfirmFill(false)}>Cancel</Btn><Btn onClick={() => { setDraft(clone(mod.example as Json)); setDirty(true); setConfirmFill(false); }} data-testid="button-confirm-fill">Overwrite with example</Btn></div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pendingNav} onOpenChange={(o) => !o && setPendingNav(null)}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader><DialogTitle className="text-[#323D4F]">Unsaved changes</DialogTitle><DialogDescription>You have edits in this module that are not saved yet.</DialogDescription></DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Btn variant="ghost" onClick={() => setPendingNav(null)} data-testid="button-stay">Stay</Btn>
            <Btn variant="outline" onClick={() => { const h = pendingNav!; setDirty(false); setPendingNav(null); initFor.current = ""; navigate(h); }} data-testid="button-discard">Discard and leave</Btn>
            {editable && <Btn onClick={() => { const h = pendingNav!; setPendingNav(null); update.mutate({ id: planId, number: mod.number, data: { action: "save", updatedAt: stamp, data: draft as Record<string, unknown>, ...(mod.number === 1 ? { scenarios: normalizeScenarios(scen).fixed as unknown[] } : {}) } }, { onSuccess: () => navigate(h) }); }} data-testid="button-save-leave">Save and leave</Btn>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </SourceProvider>
  );
}
