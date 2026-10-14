import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetWorkflow, getGetWorkflowQueryKey, useUpdateActivity, getGetPlanQueryKey, getListUtilitiesQueryKey, getGetSummaryQueryKey,
  type ActivityActionAction, type Workflow,
} from "@workspace/api-client-react";
import { ArrowLeft, ArrowRight, BookOpen, CircleHelp, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, ClipboardList, Lock, RotateCcw, Save, Send, Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, ErrorState, Pill, statusTone, Btn, inputCls } from "@/components/kit";
import { FieldEditor, mergeShape, meaningful, label, type Json } from "@/components/field-editor";
import { useMe, errMsg, phaseColor, humanize, fmtDateTime } from "@/lib/app";
import { useToast } from "@/hooks/use-toast";
import { GuidanceDialog } from "@/components/guidance";
import { topicsFor } from "@/lib/guidance";
import { cn } from "@/lib/utils";
import { ImportContext } from "@/components/import-context";

export default function ActivityPage() {
  const { planId = "", code = "" } = useParams<{ planId: string; code: string }>();
  const [, navigate] = useLocation();
  const me = useMe();
  const qc = useQueryClient();
  const { toast } = useToast();
  const wf = useGetWorkflow(planId, { query: { enabled: !!planId, queryKey: getGetWorkflowQueryKey(planId) } });
  const acts = wf.data?.activities ?? [];
  const idx = acts.findIndex((a) => a.code === code);
  const act = idx >= 0 ? acts[idx] : undefined;

  const [draft, setDraft] = useState<Json>({});
  const [dirty, setDirty] = useState(false);
  const [stamp, setStamp] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showEx, setShowEx] = useState(false);
  const [confirmFill, setConfirmFill] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [howOpen, setHowOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const initFor = useRef("");

  useEffect(() => {
    if (act && initFor.current !== `${planId}:${act.code}`) {
      initFor.current = `${planId}:${act.code}`;
      setDraft(mergeShape(act.example, act.data));
      setStamp(act.updatedAt); setDirty(false); setSavedAt(null); setShowEx(false); setJustSubmitted(false); setMissing([]); setComment("");
    }
  }, [act, planId]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const role = me.role;
  const canEdit = !!wf.data?.canEdit && (role === "admin" || role === "ttl" || role === "editor");
  const canReview = !!wf.data?.canReview && (role === "admin" || role === "ttl");
  const status = act?.status ?? "";
  const frozen = status === "submitted" || status === "approved";
  const editable = !!act && canEdit && !act.locked && !frozen;

  const req = useMemo(() => (act?.required ?? []).map((k) => ({ k, ok: meaningful((draft as Record<string, Json>)[k]) })), [act, draft]);

  const update = useUpdateActivity({
    mutation: {
      onSuccess: (res: Workflow, vars) => {
        qc.setQueryData(getGetWorkflowQueryKey(planId), res);
        qc.invalidateQueries({ queryKey: getGetWorkflowQueryKey(planId) });
        qc.invalidateQueries({ queryKey: getGetPlanQueryKey(planId) });
        qc.invalidateQueries({ queryKey: getListUtilitiesQueryKey() });
        qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        const fresh = res.activities.find((a) => a.code === vars.code);
        if (fresh) { setStamp(fresh.updatedAt); if (vars.data.action !== "save") setDraft(mergeShape(fresh.example, fresh.data)); }
        setDirty(false); setSavedAt(new Date().toISOString()); setComment("");
        const a = vars.data.action;
        if (a === "submit") setJustSubmitted(true);
        toast({ title: a === "save" ? "Draft saved" : a === "submit" ? "Submitted for review" : a === "approve" ? "Activity approved" : a === "return" ? "Returned for revision" : "Activity reopened" });
      },
      onError: (e) => toast({ title: "Action failed - your edits are kept", description: errMsg(e) + " If someone else changed this step, reload it before saving again.", variant: "destructive" }),
    },
  });

  useEffect(() => {
    if (act && !dirty && !update.isPending && stamp !== act.updatedAt) {
      setDraft(mergeShape(act.example, act.data));
      setStamp(act.updatedAt);
    }
  }, [act, dirty, stamp, update.isPending]);

  useEffect(() => {
    const guard = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.("a[href]");
      if (!anchor || (!dirty && !update.isPending)) return;
      const href = anchor.getAttribute("href");
      if (!href?.startsWith("/")) return;
      e.preventDefault(); e.stopPropagation();
      if (!update.isPending) setPendingNav(href);
    };
    document.addEventListener("click", guard, true);
    return () => document.removeEventListener("click", guard, true);
  }, [dirty, update.isPending]);

  const run = (action: ActivityActionAction) => {
    if (!act) return;
    if (action === "submit") {
      const miss = req.filter((r) => !r.ok).map((r) => r.k);
      setMissing(miss);
      if (miss.length) { toast({ title: "Complete required fields before submitting", description: miss.map(label).join(", "), variant: "destructive" }); return; }
    }
    if (action === "return" && !comment.trim()) { toast({ title: "Add a comment explaining what to revise", variant: "destructive" }); return; }
    update.mutate({ id: planId, code: act.code, data: { action, updatedAt: stamp, ...(action === "save" || action === "submit" ? { data: draft as Record<string, unknown> } : {}), ...(comment.trim() ? { comment: comment.trim() } : {}) } });
  };

  const go = (href: string) => { if(update.isPending)return; if (dirty) setPendingNav(href); else navigate(href); };

  if (wf.isLoading) return <div className="space-y-4"><div className="h-36 animate-pulse rounded-xl border bg-card" /><div className="h-[480px] animate-pulse rounded-xl border bg-card" /></div>;
  if (wf.isError || !wf.data) return <Card><ErrorState message={errMsg(wf.error, "Workflow could not be loaded.")} onRetry={() => wf.refetch()} /></Card>;
  if (!act) return <Card><ErrorState message={`Activity ${code} is not part of this plan.`} /></Card>;

  const color = phaseColor(act.phaseCode);
  const prev = acts[idx - 1], next = acts[idx + 1];
  const base = `/plans/${planId}`;
  const isPhase3 = /3/.test(act.phaseCode);

  return (
    <div>
      <button onClick={() => go(base)} className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#002244]" data-testid="link-back-workspace"><ArrowLeft className="h-4 w-4" /> {wf.data.utilityName}</button>

      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <nav className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100dvh-6rem)] glass overflow-auto rounded-xl border p-2">
            {acts.map((a, i) => (
              <button key={a.code} onClick={() => go(`${base}/activities/${a.code}`)} data-testid={`nav-activity-${a.code}`}
                className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs", a.code === act.code ? "navy-depth text-white shadow-[0_6px_14px_-8px_rgba(0,34,68,.6)]" : "text-[#002244] hover:bg-muted")}>
                {a.status === "approved" ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#5B8C1F]" /> : a.locked ? <Lock className="h-3.5 w-3.5 shrink-0 opacity-50" /> : <Circle className="h-3.5 w-3.5 shrink-0" style={{ color: phaseColor(a.phaseCode, i) }} />}
                <span className="font-mono opacity-70">{a.code}</span><span className="truncate">{a.name}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 space-y-5">
          <Card className="rise overflow-hidden">
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-[0.12em]" style={{ color }} data-testid="text-step">Step {idx + 1} / {acts.length}</span>
                <span>·</span><span>{act.phaseCode}</span><span>·</span><span className="tnum">{act.days} days</span>
                <span className="ml-auto"><Pill tone={statusTone(status)}>{humanize(status)}</Pill></span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#002244]" data-testid="text-activity-name"><span className="mr-2 font-mono text-lg text-muted-foreground">{act.code}</span>{act.name}</h1>
              <button type="button" onClick={() => setHowOpen(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#009FDA]/40 bg-[#E6F5FB] px-3 py-1.5 text-sm font-medium text-[#002244] hover:border-[#009FDA]" data-testid="button-how-to-complete"><CircleHelp className="h-4 w-4 text-[#009FDA]" /> How to complete this step</button>
              <GuidanceDialog open={howOpen} onOpenChange={setHowOpen} topics={topicsFor(act.code)} title={`How to complete ${act.code} ${act.name}`} intro={
                <ol className="list-decimal space-y-1 rounded-lg border p-3 pl-7 text-sm text-[#002244]">
                  <li>Read the instructions{act.needs.length ? " and gather what you will need" : ""}.</li>
                  <li>Fill the form; use the ? buttons next to field names for definitions and examples.</li>
                  <li>Save draft as often as you like. Submit when every required item is checked; the step then becomes read-only until review.</li>
                  <li>Examples are fictional or quoted references. Replace them with your utility's own information.</li>
                </ol>} />
              {act.locked && <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="text-lock-reason"><Lock className="mt-0.5 h-4 w-4 shrink-0" /> <span><strong>Preview only.</strong> {act.lockReason || "Earlier steps must be completed first."}</span></div>}
              {!canEdit && !act.locked && <div className="mt-4 rounded-lg bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">Your role has read-only access to this step.</div>}
              <div className="mt-5 grid gap-4 md:grid-cols-[1.4fr_1fr]">
                <div className="rounded-lg border border-[#009FDA]/15 bg-gradient-to-br from-[#009FDA]/[.09] to-[#009FDA]/[.03] p-4">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#002244]"><BookOpen className="h-3.5 w-3.5" /> Instructions</div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-[#002244]" data-testid="text-instructions">{act.instructions || "No instructions supplied for this step."}</p>
                </div>
                <div className="rounded-lg border bg-white/60 p-4">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#002244]"><ClipboardList className="h-3.5 w-3.5" /> You will need</div>
                  {act.needs.length ? <ul className="space-y-1 text-sm text-[#002244]">{act.needs.map((n) => <li key={n} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#009FDA]" />{n}</li>)}</ul> : <p className="text-xs text-muted-foreground">Nothing specific listed.</p>}
                </div>
              </div>
              {isPhase3 && <p className="mt-4 rounded-lg border-l-4 border-[#5B8C1F] bg-[#5B8C1F]/[.06] px-4 py-2.5 text-xs text-[#002244]">Phase 3 values are editable supplied planning inputs. The Studio stores them as entered; it does not recalculate forecasts or produce financial models.</p>}
              {act.feedback && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Latest review comment:</strong> {act.feedback}</p>}
            </div>
          </Card>

          {wf.data.importContext && <ImportContext context={wf.data.importContext} source={wf.data.source} />}
          <div className="grid gap-5 xl:grid-cols-[1fr_260px]">
            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex rounded-lg bg-[#002244]/[.06] p-0.5 text-sm">
                  <button onClick={() => setShowEx(false)} className={cn("rounded-md px-3 py-1.5", !showEx && "bg-white font-medium text-[#002244] shadow-sm")} data-testid="tab-form">Your form</button>
                  <button onClick={() => setShowEx(true)} className={cn("rounded-md px-3 py-1.5", showEx && "bg-white font-medium text-[#002244] shadow-sm")} data-testid="tab-example">{wf.data.importContext ? "Original source" : "Example"}</button>
                </div>
                {editable && !showEx && !wf.data.importContext && <Btn variant="outline" className="h-8" onClick={() => (meaningful(draft) ? setConfirmFill(true) : (setDraft(mergeShape(act.example, act.example)), setDirty(true)))} data-testid="button-fill-example">Fill with example</Btn>}
              </div>
              {showEx ? (
                <div>
                  <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="text-example-source">{wf.data.importContext ? "Original supplied TCWS data, including gaps and estimates." : "Fictional example from the supplied dataset."} {wf.data.source}</div>
                  <FieldEditor value={act.example as Json} example={act.example} readOnly path={`ex.${act.code}`} />
                </div>
              ) : (
                <div>{wf.data.importContext && <p className="mb-3 break-words text-xs text-muted-foreground">{wf.data.source} · Your saved changes may differ from the original source.</p>}<FieldEditor value={draft} example={act.example} readOnly={!editable || update.isPending} path={act.code} onChange={(v) => { setDraft(v); setDirty(true); setJustSubmitted(false); }} /></div>
              )}
            </Card>

            <div className="space-y-4">
              <Card className="sticky top-20 p-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#002244]">Required</div>
                {req.length === 0 ? <p className="text-xs text-muted-foreground">No required fields.</p> : (
                  <ul className="space-y-1.5">{req.map((r) => (
                    <li key={r.k} className={cn("flex items-center gap-2 text-xs", r.ok ? "text-[#5B8C1F]" : missing.includes(r.k) ? "text-destructive" : "text-muted-foreground")} data-testid={`req-${r.k}`}>
                      {r.ok ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}{label(r.k)}
                    </li>))}</ul>
                )}
                <div className="mt-4 border-t pt-3 text-xs" data-testid="status-save">
                  {update.isPending ? <span className="text-[#009FDA]">Saving...</span> : dirty ? <span className="font-medium text-amber-700">Unsaved changes</span> : savedAt ? <span className="text-[#5B8C1F]">Saved {fmtDateTime(savedAt)}</span> : <span className="text-muted-foreground">Last updated {fmtDateTime(stamp)}</span>}
                </div>
                {editable && (
                  <div className="mt-3 space-y-2">
                    <Btn variant="outline" className="w-full" disabled={update.isPending || !dirty} onClick={() => run("save")} data-testid="button-save"><Save className="h-4 w-4" /> Save draft</Btn>
                    <Btn className="w-full" disabled={update.isPending} onClick={() => run("submit")} data-testid="button-submit"><Send className="h-4 w-4" /> Submit</Btn>
                  </div>
                )}
                {frozen && <p className="mt-3 text-xs text-muted-foreground">{status === "approved" ? "Approved and read-only." : "Submitted and awaiting review."}</p>}
                {canReview && !act.locked && (status === "submitted" || status === "approved") && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <textarea rows={2} className={cn(inputCls, "h-auto py-2 text-xs")} placeholder="Review comment" value={comment} onChange={(e) => setComment(e.target.value)} data-testid="input-review-comment" />
                    {status === "submitted" && <>
                      <Btn variant="navy" className="w-full" disabled={update.isPending} onClick={() => run("approve")} data-testid="button-approve"><CheckCircle2 className="h-4 w-4" /> Approve</Btn>
                      <Btn variant="outline" className="w-full" disabled={update.isPending} onClick={() => run("return")} data-testid="button-return"><Undo2 className="h-4 w-4" /> Return for revision</Btn>
                    </>}
                    {status === "approved" && <Btn variant="outline" className="w-full" disabled={update.isPending} onClick={() => run("reopen")} data-testid="button-reopen"><RotateCcw className="h-4 w-4" /> Reopen</Btn>}
                  </div>
                )}
                {justSubmitted && next && <Btn variant="navy" className="mt-3 w-full" onClick={() => navigate(`${base}/activities/${next.code}`)} data-testid="button-go-next">Go to next step <ArrowRight className="h-4 w-4" /></Btn>}
              </Card>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Btn variant="ghost" disabled={!prev} onClick={() => prev && go(`${base}/activities/${prev.code}`)} data-testid="button-prev"><ChevronLeft className="h-4 w-4" /> {prev ? prev.code : "Previous"}</Btn>
            <Link href={base} onClick={(e) => { if (dirty) { e.preventDefault(); setPendingNav(base); } }} className="text-xs text-muted-foreground hover:text-[#002244]" data-testid="link-workspace">All activities</Link>
            <Btn variant="ghost" disabled={!next} onClick={() => next && go(`${base}/activities/${next.code}`)} data-testid="button-next">{next ? next.code : "Next"}{next?.locked && <Lock className="h-3 w-3" />} <ChevronRight className="h-4 w-4" /></Btn>
          </div>
        </div>
      </div>

      <Dialog open={confirmFill} onOpenChange={setConfirmFill}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader><DialogTitle className="text-[#002244]">Replace your draft?</DialogTitle><DialogDescription>Filling with the fictional example overwrites what you have entered in this step. Nothing is saved until you click Save draft.</DialogDescription></DialogHeader>
          <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setConfirmFill(false)}>Cancel</Btn><Btn onClick={() => { setDraft(mergeShape(act.example, act.example)); setDirty(true); setConfirmFill(false); }} data-testid="button-confirm-fill">Overwrite with example</Btn></div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pendingNav} onOpenChange={(o) => !o && setPendingNav(null)}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader><DialogTitle className="text-[#002244]">Unsaved changes</DialogTitle><DialogDescription>You have edits in this step that are not saved yet.</DialogDescription></DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Btn variant="ghost" onClick={() => setPendingNav(null)} data-testid="button-stay">Stay</Btn>
            <Btn variant="outline" onClick={() => { const h = pendingNav!; setDirty(false); setPendingNav(null); navigate(h); }} data-testid="button-discard">Discard and leave</Btn>
            {editable && <Btn onClick={() => { const h = pendingNav!; setPendingNav(null); update.mutate({ id: planId, code: act.code, data: { action: "save", updatedAt: stamp, data: draft as Record<string, unknown> } }, { onSuccess: () => navigate(h) }); }} data-testid="button-save-leave">Save and leave</Btn>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
