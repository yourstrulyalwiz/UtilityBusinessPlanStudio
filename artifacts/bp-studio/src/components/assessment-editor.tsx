import { useState } from "react";
import { AlertTriangle, ChevronDown, Info, Megaphone, Plus, ShieldAlert, ShieldCheck, Sparkles, Trash2, TrendingDown, Gauge } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Btn, inputCls } from "@/components/kit";
import { isObj, type Json } from "@/components/field-editor";
import { cn } from "@/lib/utils";

type Obj = Record<string, Json>;
export const isAssessmentV1 = (v: unknown): boolean => isObj(v) && (v.assessmentVersion === 1 || v.assessmentVersion === "1");

const str = (v: unknown) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));
const arr = (v: unknown): Json[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Obj => (isObj(v) ? (v as Obj) : {});
const newId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const STATUSES = ["Critical", "Weak", "Moderate", "Strong", "Not assessed"] as const;
const STATUS_STYLE: Record<string, { chip: string; bar: string; card: string }> = {
  Critical: { chip: "bg-[#FF6A0D] text-[#29323F]", bar: "bg-[#FF6A0D]", card: "border-[#FF6A0D]/45" },
  Weak: { chip: "bg-[#FFF1E8] text-[#9A3A05] ring-1 ring-[#FF6A0D]/40", bar: "bg-[#FF6A0D]/50", card: "border-[#FF6A0D]/25" },
  Moderate: { chip: "bg-[#1ED3D9] text-[#29323F]", bar: "bg-[#1ED3D9]", card: "border-[#1ED3D9]/40" },
  Strong: { chip: "bg-[#D9E950] text-[#29323F]", bar: "bg-[#D9E950]", card: "border-[#B8C93A]/50" },
  "Not assessed": { chip: "bg-[#5A6780] text-[#EEF2F6]", bar: "bg-[#D9D9D9]", card: "border-dashed border-[#323D4F]/20" },
};
const st = (s: string) => STATUS_STYLE[s] ?? STATUS_STYLE["Not assessed"];
const isOverall = (t: string) => /overall/i.test(t);

const SWOT = [
  { k: "strengths", label: "Strengths", sub: "Internal, helps", icon: ShieldCheck, head: "bg-[#D9E950] text-[#29323F]", ring: "border-[#B8C93A]/50" },
  { k: "weaknesses", label: "Weaknesses", sub: "Internal, hinders", icon: TrendingDown, head: "bg-[#FF6A0D] text-[#29323F]", ring: "border-[#FF6A0D]/40" },
  { k: "opportunities", label: "Opportunities", sub: "External, helps", icon: Sparkles, head: "bg-[#1ED3D9] text-[#29323F]", ring: "border-[#1ED3D9]/40" },
  { k: "threats", label: "Threats", sub: "External, hinders", icon: ShieldAlert, head: "bg-[#323D4F] text-[#EEF2F6]", ring: "border-[#323D4F]/25" },
] as const;

export function StatusChip({ status }: { status: string }) {
  const s = status || "Not assessed";
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", st(s).chip)} data-testid="status-area">{s === "Critical" && <AlertTriangle className="h-3 w-3" />}{s}</span>;
}

type Confirm = { label: string; run: () => void } | null;

export function AssessmentEditor({ value, onChange, readOnly }: { value: Json; onChange?: (v: Json) => void; readOnly?: boolean }) {
  const d = obj(value);
  const areas = arr(d.areas);
  const messages = arr(d.messages);
  const swot = obj(d.swot);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState<Confirm>(null);
  const ta = cn(inputCls, "h-auto py-2 leading-relaxed");
  const set = (patch: Obj) => onChange?.({ ...d, ...patch });
  const patchArea = (i: number, p: Obj) => set({ areas: areas.map((a, j) => (j === i ? { ...obj(a), ...p } : a)) });
  const patchMsg = (i: number, p: Obj) => set({ messages: messages.map((m, j) => (j === i ? { ...obj(m), ...p } : m)) });
  const ask = (label: string, run: () => void) => setConfirm({ label, run });

  const overall = messages.map((m, i) => ({ m: obj(m), i })).filter((x) => isOverall(str(x.m.type)));
  const prios = messages.map((m, i) => ({ m: obj(m), i })).filter((x) => !isOverall(str(x.m.type)));
  const counts = STATUSES.map((s) => ({ s, n: areas.filter((a) => (str(obj(a).status) || "Not assessed") === s).length }));

  const msgCard = (x: { m: Obj; i: number }, hero: boolean, n?: number) => {
    const id = str(x.m.id) || `msg${x.i}`;
    return (
      <div key={id} className={cn("relative rounded-xl p-4", hero ? "bg-white/[.07] ring-1 ring-white/15 backdrop-blur" : "border border-[#323D4F]/10 bg-white")} data-testid={`card-message-${x.i}`}>
        <div className="flex items-start gap-3">
          {n !== undefined && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#323D4F] font-mono text-sm font-semibold text-[#1ED3D9]">{n}</span>}
          <div className="min-w-0 flex-1">
            {readOnly ? <p className={cn("whitespace-pre-wrap break-words", hero ? "text-[17px] font-medium leading-snug text-[#EEF2F6]" : "text-sm leading-relaxed text-[#323D4F]")} data-testid={`text-message-${x.i}`}>{str(x.m.text) || <span className="opacity-60">Message not written yet.</span>}</p>
              : <>
                <textarea rows={hero ? 3 : 2} className={cn(ta, hero && "border-white/20 bg-white/10 text-[#EEF2F6] placeholder:text-[#AEB8C6]")} value={str(x.m.text)} placeholder="One clear, precise message." onChange={(e) => patchMsg(x.i, { text: e.target.value })} aria-label="Message text" data-testid={`input-message-${x.i}`} />
                <div className="mt-2 flex items-center gap-2">
                  <select className={cn(inputCls, "h-8 w-auto text-xs", hero && "border-white/20 bg-white/10 text-[#EEF2F6]")} value={isOverall(str(x.m.type)) ? "Overall" : "Priority"} onChange={(e) => patchMsg(x.i, { type: e.target.value })} aria-label="Message type" data-testid={`select-message-type-${x.i}`}>
                    <option value="Overall" className="text-[#323D4F]">Overall message</option><option value="Priority" className="text-[#323D4F]">Priority</option>
                  </select>
                  <button type="button" className={cn("ml-auto grid h-9 w-9 place-items-center rounded-md", hero ? "text-[#AEB8C6] hover:bg-white/10 hover:text-[#FF6A0D]" : "text-[#5B6678] hover:bg-muted hover:text-destructive")} aria-label="Remove message" onClick={() => ask(str(x.m.text).slice(0, 80) || "this message", () => set({ messages: messages.filter((_, j) => j !== x.i) }))} data-testid={`button-remove-message-${x.i}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              </>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5" data-testid="assessment-editor">
      <p className="flex gap-2 rounded-lg border-l-4 border-[#1ED3D9] bg-[#E4F8F9] px-4 py-3 text-xs leading-relaxed text-[#1F5F63]" data-testid="text-assessment-note"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>{readOnly ? "Authored analysis — read-only view." : "Authored analysis, fully editable."}</strong> Statuses, findings and messages are written judgements. They are not recalculated when Module 1 data changes; review them when the baseline changes. Financial and affordability narratives are preliminary and not independently verified.</span></p>

      {/* Messages */}
      <section className="navy-depth overflow-hidden rounded-2xl bg-[#323D4F] p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5"><Megaphone className="h-5 w-5 text-[#1ED3D9]" /><div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1ED3D9]">The headline</div><h3 className="text-lg font-semibold">Overall messages</h3></div></div>
          {!readOnly && <Btn variant="outline" className="h-8 border-white/25 bg-white/10 text-white hover:bg-white/20" onClick={() => set({ messages: [...messages, { id: newId("msg"), type: "Overall", text: "" }] })} data-testid="button-add-overall"><Plus className="h-4 w-4" /> Add overall message</Btn>}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{overall.length ? overall.map((x) => msgCard(x, true)) : <p className="text-sm text-[#AEB8C6]">No overall message yet. State the single most important conclusion of the assessment.</p>}</div>
      </section>

      <section className="rounded-2xl border border-[#323D4F]/10 bg-[#F7F9FB] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#127A80]">What to act on first</div><h3 className="text-[15px] font-semibold text-[#323D4F]">Priorities ({prios.length})</h3></div>
          {!readOnly && <Btn variant="outline" className="h-8" onClick={() => set({ messages: [...messages, { id: newId("msg"), type: "Priority", text: "" }] })} data-testid="button-add-priority"><Plus className="h-4 w-4" /> Add priority</Btn>}
        </div>
        <div className="mt-3 grid gap-2.5 lg:grid-cols-2">{prios.length ? prios.map((x, k) => msgCard(x, false, k + 1)) : <p className="text-xs text-muted-foreground">No priorities recorded.</p>}</div>
      </section>

      {/* Areas */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#127A80]">Diagnosis by area</div><h3 className="text-[15px] font-semibold text-[#323D4F]">Assessment areas ({areas.length})</h3></div>
          {!readOnly && <Btn variant="outline" className="h-8" onClick={() => { const id = newId("area"); setOpen({ ...open, [id]: true }); set({ areas: [...areas, { id, area: "", status: "Not assessed", key_indicators: "", findings: [], message: "" }] }); }} data-testid="button-add-area"><Plus className="h-4 w-4" /> Add area</Btn>}
        </div>
        {areas.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5" data-testid="text-status-summary">{counts.filter((c) => c.n).map((c) => <span key={c.s} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] text-[#323D4F]"><span className={cn("h-2 w-2 rounded-full", st(c.s).bar)} />{c.s}: <strong className="tnum">{c.n}</strong></span>)}</div>}
        {areas.length === 0 && <p className="mt-3 rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground">No assessment areas.</p>}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {areas.map((raw, i) => {
            const a = obj(raw); const id = str(a.id) || `area${i}`; const s = str(a.status) || "Not assessed";
            const findings = arr(a.findings); const isOpen = !!open[id];
            return (
              <article key={id} className={cn("overflow-hidden rounded-xl border bg-white transition", st(s).card, isOpen && "md:col-span-2")} data-testid={`card-area-${i}`}>
                <div className={cn("h-1", st(s).bar)} />
                <button type="button" className="flex w-full items-start gap-3 p-4 text-left" onClick={() => setOpen({ ...open, [id]: !isOpen })} aria-expanded={isOpen} data-testid={`button-toggle-area-${i}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-[#323D4F]">{str(a.area) || "Untitled area"}</h4><StatusChip status={s} /></div>
                    <p className={cn("mt-1.5 text-sm leading-relaxed", str(a.message) ? "text-[#5B6678]" : "text-muted-foreground italic", !isOpen && "line-clamp-2")}>{str(a.message) || "No key message yet."}</p>
                    {!isOpen && findings.length > 0 && <p className="mt-1.5 text-[11px] text-[#127A80]">{findings.length} finding{findings.length > 1 ? "s" : ""}</p>}
                  </div>
                  <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-[#5B6678] transition", isOpen && "rotate-180")} />
                </button>
                {isOpen && <div className="space-y-4 border-t border-[#323D4F]/[.07] bg-[#F7F9FB]/60 p-4">
                  {!readOnly && <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
                    <Fld label="Area name"><input className={inputCls} value={str(a.area)} onChange={(e) => patchArea(i, { area: e.target.value })} data-testid={`input-area-name-${i}`} /></Fld>
                    <Fld label="Status"><select className={inputCls} value={s} onChange={(e) => patchArea(i, { status: e.target.value })} data-testid={`select-area-status-${i}`}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select></Fld>
                  </div>}
                  <Fld label="Key message">{readOnly ? null : <textarea rows={2} className={ta} value={str(a.message)} onChange={(e) => patchArea(i, { message: e.target.value })} placeholder="The one-sentence conclusion for this area." data-testid={`input-area-message-${i}`} />}</Fld>
                  <Fld label="Key indicators">{readOnly ? <p className="whitespace-pre-wrap text-sm text-[#323D4F]">{str(a.key_indicators) || <span className="text-muted-foreground">Not provided</span>}</p>
                    : <textarea rows={2} className={ta} value={str(a.key_indicators)} onChange={(e) => patchArea(i, { key_indicators: e.target.value })} placeholder="Short evidence, e.g. NRW around 40 percent, 14 h supply." data-testid={`input-area-indicators-${i}`} />}</Fld>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between"><span className="text-xs font-medium text-[#323D4F]/85">Findings ({findings.length})</span>
                      {!readOnly && <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-[#127A80] hover:underline" onClick={() => patchArea(i, { findings: [...findings, ""] })} data-testid={`button-add-finding-${i}`}><Plus className="h-3.5 w-3.5" /> Add finding</button>}</div>
                    {findings.length === 0 && <p className="text-xs text-muted-foreground">No findings recorded.</p>}
                    <ul className="space-y-1.5">{findings.map((f, j) => (
                      <li key={j} className="flex items-start gap-2" data-testid={`row-finding-${i}-${j}`}>
                        <span className={cn("mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full", st(s).bar)} />
                        {readOnly ? <p className="flex-1 whitespace-pre-wrap py-1 text-sm text-[#323D4F]">{str(f)}</p> : <>
                          <textarea rows={1} className={cn(ta, "min-h-10 flex-1")} value={str(f)} onChange={(e) => patchArea(i, { findings: findings.map((x, k) => (k === j ? e.target.value : x)) })} aria-label={`Finding ${j + 1}`} data-testid={`input-finding-${i}-${j}`} />
                          <button type="button" aria-label="Remove finding" className="grid h-10 w-9 place-items-center rounded-md text-[#5B6678] hover:bg-white hover:text-destructive" onClick={() => ask(str(f).slice(0, 80) || "this finding", () => patchArea(i, { findings: findings.filter((_, k) => k !== j) }))} data-testid={`button-remove-finding-${i}-${j}`}><Trash2 className="h-4 w-4" /></button>
                        </>}
                      </li>))}</ul>
                  </div>
                  {!readOnly && <div className="flex justify-end"><Btn variant="ghost" className="h-8 text-destructive" onClick={() => ask(str(a.area) || "this area", () => set({ areas: areas.filter((_, k) => k !== i) }))} data-testid={`button-remove-area-${i}`}><Trash2 className="h-4 w-4" /> Remove area</Btn></div>}
                </div>}
              </article>
            );
          })}
        </div>
      </section>

      {/* SWOT */}
      <section>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#127A80]">Strategic position</div>
        <h3 className="text-[15px] font-semibold text-[#323D4F]">SWOT</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {SWOT.map((q) => {
            const items = arr(swot[q.k]); const Icon = q.icon;
            const setItems = (v: Json[]) => set({ swot: { ...swot, [q.k]: v } });
            return (
              <div key={q.k} className={cn("overflow-hidden rounded-xl border bg-white", q.ring)} data-testid={`card-swot-${q.k}`}>
                <div className={cn("flex items-center gap-2 px-4 py-2.5", q.head)}><Icon className="h-4 w-4" /><span className="text-sm font-semibold">{q.label}</span><span className="text-[11px] opacity-75">{q.sub}</span><span className="ml-auto font-mono text-xs tnum">{items.length}</span></div>
                <ul className="divide-y divide-[#323D4F]/[.06]">
                  {items.map((it, j) => { const o = obj(it); return (
                    <li key={str(o.id) || j} className="flex items-start gap-2 px-3 py-2" data-testid={`row-swot-${q.k}-${j}`}>
                      {readOnly ? <p className="flex-1 whitespace-pre-wrap px-1 py-0.5 text-sm leading-relaxed text-[#323D4F]">{str(o.text)}</p> : <>
                        <textarea rows={1} className={cn(ta, "min-h-9 flex-1 text-sm")} value={str(o.text)} onChange={(e) => setItems(items.map((x, k) => (k === j ? { ...obj(x), text: e.target.value } : x)))} aria-label={`${q.label} ${j + 1}`} data-testid={`input-swot-${q.k}-${j}`} />
                        <button type="button" aria-label="Remove item" className="grid h-9 w-9 place-items-center rounded-md text-[#5B6678] hover:bg-muted hover:text-destructive" onClick={() => ask(str(o.text).slice(0, 80) || "this item", () => setItems(items.filter((_, k) => k !== j)))} data-testid={`button-remove-swot-${q.k}-${j}`}><Trash2 className="h-4 w-4" /></button>
                      </>}
                    </li>); })}
                  {items.length === 0 && <li className="px-4 py-3 text-xs text-muted-foreground">None recorded.</li>}
                </ul>
                {!readOnly && <button type="button" className="flex w-full items-center gap-1 border-t border-[#323D4F]/[.06] px-4 py-2 text-xs font-medium text-[#127A80] hover:bg-[#E4F8F9]" onClick={() => setItems([...items, { id: newId(q.k.slice(0, 3)), text: "" }])} data-testid={`button-add-swot-${q.k}`}><Plus className="h-3.5 w-3.5" /> Add {q.label.toLowerCase().replace(/ies$/, "y").replace(/s$/, "")}</button>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Review notes */}
      <section className="rounded-xl border border-[#FF6A0D]/30 bg-[#FFF1E8]/60 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#9A3A05]"><Gauge className="h-4 w-4" /> Data review notes</div>
        <p className="mt-0.5 text-[11px] text-[#9A3A05]/80">Inconsistencies or gaps to resolve before relying on the conclusions.</p>
        {readOnly ? <p className="mt-2 whitespace-pre-wrap text-sm text-[#323D4F]" data-testid="text-review-notes">{str(d.review_notes) || <span className="text-muted-foreground">No review notes.</span>}</p>
          : <textarea rows={3} className={cn(ta, "mt-2 bg-white")} value={str(d.review_notes)} onChange={(e) => set({ review_notes: e.target.value })} data-testid="input-review-notes" />}
      </section>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader><DialogTitle className="text-[#323D4F]">Remove this item?</DialogTitle><DialogDescription>"{confirm?.label}" will be removed from your draft. Nothing is saved until you click Save draft. Cancel keeps it unchanged.</DialogDescription></DialogHeader>
          <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setConfirm(null)} data-testid="button-cancel-remove">Cancel</Btn><Btn variant="danger" onClick={() => { confirm?.run(); setConfirm(null); }} data-testid="button-confirm-remove">Remove</Btn></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return <label className="block min-w-0"><span className="mb-1 block text-xs font-medium text-[#323D4F]/85">{label}</span>{children}</label>;
}

/** Guidance card for the version 1 assessment (replaces legacy guidance). */
export function AssessmentGuide() {
  return (
    <div className="text-sm">
      <h3 className="font-semibold text-[#323D4F]">Writing the assessment</h3>
      <ol className="mt-3 list-decimal space-y-2.5 pl-4 text-xs leading-relaxed text-muted-foreground">
        <li>Rate each area with a qualitative status. Use Not assessed when evidence is missing; never guess.</li>
        <li>Give each area one key message, a short line of key indicators and concrete findings.</li>
        <li>Distil one or two overall messages and up to five priorities that the strategy must answer.</li>
        <li>Keep SWOT items short: internal factors as strengths or weaknesses, external ones as opportunities or threats.</li>
        <li>Record data inconsistencies in the review notes.</li>
      </ol>
      <p className="mt-4 rounded-md bg-[#FFF1E8] px-3 py-2 text-[11px] text-[#9A3A05]">This is authored analysis. It does not update when Module 1 changes. Financial and affordability statements are preliminary.</p>
    </div>
  );
}

/** Readable report view for assessment v1. */
export function AssessmentReport({ value }: { value: unknown }) {
  const d = obj(value);
  const msgs = arr(d.messages).map(obj);
  const sw = obj(d.swot);
  const ov = msgs.filter((m) => isOverall(str(m.type))); const pr = msgs.filter((m) => !isOverall(str(m.type)));
  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs italic text-[#5B6678]">Authored analysis; not recalculated from Module 1. Financial narratives are preliminary.</p>
      {ov.length > 0 && <div><h3 className="text-xs font-semibold uppercase tracking-wider">Overall messages</h3>{ov.map((m, i) => <p key={i} className="mt-1 whitespace-pre-wrap font-medium">{str(m.text)}</p>)}</div>}
      {pr.length > 0 && <div><h3 className="text-xs font-semibold uppercase tracking-wider">Priorities</h3><ol className="list-decimal pl-5">{pr.map((m, i) => <li key={i} className="whitespace-pre-wrap">{str(m.text)}</li>)}</ol></div>}
      <div><h3 className="text-xs font-semibold uppercase tracking-wider">Assessment areas</h3>
        {arr(d.areas).map(obj).map((a, i) => (
          <div key={i} className="mt-2 break-inside-avoid rounded border p-2">
            <p className="font-semibold">{str(a.area) || `Area ${i + 1}`} <span className="font-normal text-[#5B6678]">- {str(a.status) || "Not assessed"}</span></p>
            {str(a.message) && <p className="whitespace-pre-wrap">{str(a.message)}</p>}
            {str(a.key_indicators) && <p className="mt-1 text-xs"><strong>Key indicators:</strong> {str(a.key_indicators)}</p>}
            {arr(a.findings).length > 0 && <ul className="mt-1 list-disc pl-5 text-xs">{arr(a.findings).map((f, j) => <li key={j}>{str(f)}</li>)}</ul>}
          </div>))}
      </div>
      <div><h3 className="text-xs font-semibold uppercase tracking-wider">SWOT</h3>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">{SWOT.map((q) => <div key={q.k} className="break-inside-avoid rounded border p-2"><p className="text-xs font-semibold">{q.label}</p>{arr(sw[q.k]).length ? <ul className="list-disc pl-5 text-xs">{arr(sw[q.k]).map((x, j) => <li key={j}>{str(obj(x).text)}</li>)}</ul> : <p className="text-xs">None recorded</p>}</div>)}</div>
      </div>
      {str(d.review_notes) && <div><h3 className="text-xs font-semibold uppercase tracking-wider">Data review notes</h3><p className="whitespace-pre-wrap">{str(d.review_notes)}</p></div>}
    </div>
  );
}
