import { useRef, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, Compass, Flag, Lightbulb, Plus, Target, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Btn, inputCls } from "@/components/kit";
import { isObj, type Json } from "@/components/field-editor";
import { cn } from "@/lib/utils";

type Obj = Record<string, Json>;
export const isStrategyV1 = (v: unknown): boolean => isObj(v) && (v.strategyVersion === 1 || v.strategyVersion === "1");

const str = (v: unknown) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));
const blank = (v: unknown) => str(v).trim() === "";

type FieldDef = { k: string; label: string; hint: string; long?: boolean; critical?: boolean };
const SMART: { group: string; letter: string; fields: FieldDef[] }[] = [
  { group: "Specific", letter: "S", fields: [
    { k: "specific", label: "Specific result", hint: "What exactly changes, where, for whom.", long: true },
    { k: "relevant", label: "Why it is relevant", hint: "Link to the vision, mission or a baseline gap.", long: true },
  ] },
  { group: "Measurable", letter: "M", fields: [
    { k: "kpi", label: "KPI", hint: "One indicator, e.g. Non-revenue water (%)." },
    { k: "kpi_formula", label: "KPI formula", hint: "e.g. (System input - billed volume) / system input x 100." },
    { k: "baseline", label: "Baseline value", hint: "Current measured value with unit." },
    { k: "baseline_year", label: "Baseline year", hint: "Year or period of the baseline." },
    { k: "target", label: "Target value", hint: "Value to reach, same unit as baseline." },
  ] },
  { group: "Achievable", letter: "A", fields: [
    { k: "achievable", label: "Why it is achievable", hint: "Resources, programmes or evidence that make the target realistic.", long: true, critical: true },
    { k: "owner", label: "Owner", hint: "Unit or position accountable, e.g. Commercial Division.", critical: true },
  ] },
  { group: "Time-bound", letter: "T", fields: [
    { k: "time_bound", label: "Deadline", hint: "Date or year by which the target is met.", critical: true },
  ] },
];
const ALL_KEYS = SMART.flatMap((g) => g.fields.map((f) => f.k));
const EMPTY_OBJ: Obj = { code: "", title: "", ...Object.fromEntries(ALL_KEYS.map((k) => [k, ""])) };

function useKeys(n: number) {
  const seq = useRef(0);
  const keys = useRef<string[]>([]);
  if (keys.current.length !== n) {
    const k = keys.current.slice(0, n);
    while (k.length < n) k.push(`k${seq.current++}`);
    keys.current = k;
  }
  return {
    keys: keys.current,
    add: () => { keys.current = [...keys.current, `k${seq.current++}`]; },
    remove: (i: number) => { keys.current = keys.current.filter((_, j) => j !== i); },
    move: (i: number, j: number) => { const k = [...keys.current]; [k[i], k[j]] = [k[j], k[i]]; keys.current = k; },
  };
}

function Guide({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex items-center gap-1 text-xs font-medium text-[#127A80] hover:underline" data-testid={`button-guide-${title.toLowerCase().replace(/\W+/g, "-")}`}>
        <Lightbulb className="h-3.5 w-3.5" /> {open ? "Hide" : "Show"} guidance: {title}<ChevronDown className={cn("h-3 w-3 transition", open && "rotate-180")} />
      </button>
      {open && <div className="mt-2 rounded-lg border border-[#1ED3D9]/30 bg-[#E4F8F9] p-3 text-xs leading-relaxed text-[#1F5F63]">{children}</div>}
    </div>
  );
}

function Section({ icon, eyebrow, title, children, aside }: { icon: React.ReactNode; eyebrow: string; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#323D4F]/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#323D4F] text-[#1ED3D9]">{icon}</span>
          <div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#127A80]">{eyebrow}</div><h3 className="text-[15px] font-semibold text-[#323D4F]">{title}</h3></div>
        </div>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function missingCritical(o: Obj) { return SMART.flatMap((g) => g.fields).filter((f) => f.critical && blank(o[f.k])); }

type Confirm = { kind: "value" | "objective"; index: number; label: string } | null;

export function StrategyEditor({ value, onChange, readOnly }: { value: Json; onChange?: (v: Json) => void; readOnly?: boolean }) {
  const d: Obj = isObj(value) ? value : {};
  const values: Json[] = Array.isArray(d.values) ? d.values : [];
  const objectives: Json[] = Array.isArray(d.objectives) ? d.objectives : [];
  const vk = useKeys(values.length);
  const ok = useKeys(objectives.length);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [openObj, setOpenObj] = useState<Record<string, boolean>>({});

  const set = (patch: Obj) => onChange?.({ ...d, ...patch });
  const setValues = (v: Json[]) => set({ values: v });
  const setObjectives = (v: Json[]) => set({ objectives: v });
  const patchObj = (i: number, k: string, val: string) => setObjectives(objectives.map((o, j) => (j === i ? { ...(isObj(o) ? o : {}), [k]: val } : o)));

  const incomplete = objectives.filter((o) => isObj(o) && missingCritical(o).length > 0).length;
  const ta = cn(inputCls, "h-auto py-2 leading-relaxed");

  const doRemove = () => {
    if (!confirm) return;
    if (confirm.kind === "value") { vk.remove(confirm.index); setValues(values.filter((_, j) => j !== confirm.index)); }
    else { ok.remove(confirm.index); setObjectives(objectives.filter((_, j) => j !== confirm.index)); }
    setConfirm(null);
  };

  return (
    <div className="space-y-4" data-testid="strategy-editor">
      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={<Compass className="h-4 w-4" />} eyebrow="Where we are going" title="Vision">
          {readOnly ? <Prose text={str(d.vision)} empty="No vision statement yet." testid="text-vision" />
            : <textarea rows={4} className={ta} value={str(d.vision)} onChange={(e) => set({ vision: e.target.value })} placeholder="Describe the future state the utility aims for." data-testid="input-vision" />}
          <Guide title="Vision">A vision is one or two sentences describing the long-term service the utility aims to deliver, not activities. Example shape: "Safe, continuous water and sanitation for every household in our service area." Keep it memorable and avoid lists.</Guide>
        </Section>
        <Section icon={<Flag className="h-4 w-4" />} eyebrow="What we do" title="Mission">
          {readOnly ? <Prose text={str(d.mission)} empty="No mission statement yet." testid="text-mission" />
            : <textarea rows={4} className={ta} value={str(d.mission)} onChange={(e) => set({ mission: e.target.value })} placeholder="State what the utility does, for whom and how." data-testid="input-mission" />}
          <Guide title="Mission">The mission states what the utility does today, for whom and how. It should be achievable now and support the vision. Name customers and core services; avoid slogans.</Guide>
        </Section>
      </div>

      <Section icon={<span className="font-mono text-xs font-semibold">{values.length}</span>} eyebrow="How we behave" title="Values"
        aside={!readOnly && <Btn variant="outline" className="h-8" onClick={() => { vk.add(); setValues([...values, ""]); }} data-testid="button-add-value"><Plus className="h-4 w-4" /> Add value</Btn>}>
        {values.length === 0 && <p className="rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground">No values recorded.{!readOnly && " Add the principles that guide staff decisions."}</p>}
        <ol className="space-y-2">
          {values.map((v, i) => (
            <li key={vk.keys[i]} className="flex items-start gap-2 rounded-lg bg-[#F7F9FB] p-2 ring-1 ring-[#323D4F]/[.06]" data-testid={`row-value-${i}`}>
              <span className="mt-2 w-6 shrink-0 text-right font-mono text-[11px] text-[#5B6678]">{i + 1}</span>
              {readOnly ? <p className="min-w-0 flex-1 whitespace-pre-wrap break-words py-1.5 text-sm text-[#323D4F]">{str(v) || <span className="text-muted-foreground">Blank</span>}</p>
                : <textarea rows={1} className={cn(ta, "min-h-10 flex-1")} value={str(v)} onChange={(e) => setValues(values.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Value ${i + 1}`} data-testid={`input-value-${i}`} />}
              {!readOnly && <div className="flex shrink-0 items-center">
                <IconBtn label="Move up" disabled={i === 0} onClick={() => { vk.move(i, i - 1); const a = [...values]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; setValues(a); }} testid={`button-value-up-${i}`}><ArrowUp className="h-4 w-4" /></IconBtn>
                <IconBtn label="Move down" disabled={i === values.length - 1} onClick={() => { vk.move(i, i + 1); const a = [...values]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; setValues(a); }} testid={`button-value-down-${i}`}><ArrowDown className="h-4 w-4" /></IconBtn>
                <IconBtn label="Remove value" danger onClick={() => setConfirm({ kind: "value", index: i, label: str(v).slice(0, 80) || `Value ${i + 1}` })} testid={`button-value-remove-${i}`}><Trash2 className="h-4 w-4" /></IconBtn>
              </div>}
            </li>
          ))}
        </ol>
        <Guide title="Values">Values are short principles staff can apply when deciding, such as "Integrity: we bill only what is consumed and measured." A name plus one explanatory line works better than a single word.</Guide>
      </Section>

      <Section icon={<Target className="h-4 w-4" />} eyebrow="SMART objectives" title={`Strategic objectives (${objectives.length})`}
        aside={!readOnly && <Btn variant="outline" className="h-8" onClick={() => { ok.add(); setObjectives([...objectives, { ...EMPTY_OBJ }]); }} data-testid="button-add-objective"><Plus className="h-4 w-4" /> Add objective</Btn>}>
        {incomplete > 0 && <p className="mb-3 flex gap-2 rounded-lg border-l-4 border-[#FF6A0D] bg-[#FFF1E8] px-3 py-2 text-xs text-[#9A3A05]" data-testid="text-objectives-incomplete"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>{incomplete} of {objectives.length} objectives are not fully specified.</strong> Owner, achievability or deadline is missing. Complete them before the strategy can be considered SMART.</span></p>}
        <Guide title="SMART objectives">
          <p>Each objective should answer: what result (Specific), measured by which KPI from which baseline to which target (Measurable), why it is realistic and who is accountable (Achievable), and by when (Time-bound).</p>
          <p className="mt-1.5">Example shape: "Reduce non-revenue water. KPI: NRW (%) = (input - billed) / input x 100. Baseline 2023: value. Target: value by 2028. Owner: NRW unit." Leave fields blank rather than guessing; blanks are flagged.</p>
        </Guide>
        {objectives.length === 0 && <p className="mt-3 rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground">No objectives recorded.</p>}
        <div className="mt-3 space-y-3">
          {objectives.map((raw, i) => {
            const o: Obj = isObj(raw) ? raw : {};
            const key = ok.keys[i];
            const miss = missingCritical(o);
            const open = openObj[key] ?? (objectives.length <= 2 || !readOnly && blank(o.title));
            return (
              <article key={key} className={cn("overflow-hidden rounded-xl border bg-white", miss.length ? "border-[#FF6A0D]/40" : "border-[#323D4F]/12")} data-testid={`card-objective-${i}`}>
                <div className="flex flex-wrap items-center gap-2 bg-[#323D4F] px-3 py-2.5 text-[#EEF2F6] sm:px-4">
                  <span className="rounded bg-[#1ED3D9] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#29323F]">{str(o.code) || `#${i + 1}`}</span>
                  <button type="button" onClick={() => setOpenObj({ ...openObj, [key]: !open })} aria-expanded={open} className="min-w-0 flex-1 text-left text-sm font-medium" data-testid={`button-toggle-objective-${i}`}>
                    <span className="line-clamp-2">{str(o.title) || <span className="text-[#AEB8C6]">Untitled objective</span>}</span>
                  </button>
                  {miss.length > 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-[#FF6A0D] px-2 py-0.5 text-[10px] font-semibold text-[#29323F]"><AlertTriangle className="h-3 w-3" /> Missing {miss.map((f) => f.label.replace("Why it is achievable", "achievability").replace("Deadline", "deadline").replace("Owner", "owner")).join(", ")}</span>
                    : <span className="rounded-full bg-[#D9E950] px-2 py-0.5 text-[10px] font-semibold text-[#29323F]">Key fields set</span>}
                  <div className="flex items-center">
                    {!readOnly && <>
                      <IconBtn dark label="Move up" disabled={i === 0} onClick={() => { ok.move(i, i - 1); const a = [...objectives]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; setObjectives(a); }} testid={`button-objective-up-${i}`}><ArrowUp className="h-4 w-4" /></IconBtn>
                      <IconBtn dark label="Move down" disabled={i === objectives.length - 1} onClick={() => { ok.move(i, i + 1); const a = [...objectives]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; setObjectives(a); }} testid={`button-objective-down-${i}`}><ArrowDown className="h-4 w-4" /></IconBtn>
                      <IconBtn dark danger label="Remove objective" onClick={() => setConfirm({ kind: "objective", index: i, label: [str(o.code), str(o.title)].filter(Boolean).join(" ") || `Objective ${i + 1}` })} testid={`button-objective-remove-${i}`}><Trash2 className="h-4 w-4" /></IconBtn>
                    </>}
                    <IconBtn dark label={open ? "Collapse" : "Expand"} onClick={() => setOpenObj({ ...openObj, [key]: !open })} testid={`button-objective-expand-${i}`}><ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} /></IconBtn>
                  </div>
                </div>
                {open && <div className="space-y-4 p-3 sm:p-4">
                  {!readOnly && <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                    <Fld label="Code" hint="Short ID, e.g. SO1."><input className={inputCls} value={str(o.code)} onChange={(e) => patchObj(i, "code", e.target.value)} data-testid={`input-objective-${i}-code`} /></Fld>
                    <Fld label="Objective title" hint="One line naming the intended result."><input className={inputCls} value={str(o.title)} onChange={(e) => patchObj(i, "title", e.target.value)} data-testid={`input-objective-${i}-title`} /></Fld>
                  </div>}
                  {SMART.map((g) => (
                    <div key={g.group} className="grid gap-3 sm:grid-cols-[44px_1fr]">
                      <div className="flex items-center gap-2 sm:block"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#E4F8F9] font-mono text-sm font-semibold text-[#127A80]">{g.letter}</span><span className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6678] sm:hidden">{g.group}</span></div>
                      <div className={cn("grid gap-3", g.fields.length > 1 && "md:grid-cols-2", g.group === "Measurable" && "xl:grid-cols-3")}>
                        {g.fields.map((f) => {
                          const v = str(o[f.k]); const flag = f.critical && blank(v);
                          return (
                            <Fld key={f.k} label={f.label} hint={readOnly ? undefined : f.hint} flag={flag} wide={f.long}>
                              {readOnly ? <p className={cn("whitespace-pre-wrap break-words rounded-md px-2.5 py-2 text-sm", flag ? "bg-[#FFF1E8] text-[#9A3A05]" : v ? "bg-[#F7F9FB] text-[#323D4F]" : "bg-[#F7F9FB] text-muted-foreground")} data-testid={`text-objective-${i}-${f.k}`}>{v || (flag ? "Missing - to be completed" : "Not provided")}</p>
                                : f.long ? <textarea rows={2} className={cn(ta, flag && "border-[#FF6A0D]/60")} value={v} onChange={(e) => patchObj(i, f.k, e.target.value)} data-testid={`input-objective-${i}-${f.k}`} />
                                : <input className={cn(inputCls, flag && "border-[#FF6A0D]/60")} value={v} onChange={(e) => patchObj(i, f.k, e.target.value)} data-testid={`input-objective-${i}-${f.k}`} />}
                            </Fld>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>}
              </article>
            );
          })}
        </div>
      </Section>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader><DialogTitle className="text-[#323D4F]">Remove this {confirm?.kind}?</DialogTitle><DialogDescription>"{confirm?.label}" will be removed from your draft. Nothing is saved until you click Save draft. Cancel keeps it unchanged.</DialogDescription></DialogHeader>
          <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setConfirm(null)} data-testid="button-cancel-remove">Cancel</Btn><Btn variant="danger" onClick={doRemove} data-testid="button-confirm-remove">Remove</Btn></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Prose({ text, empty, testid }: { text: string; empty: string; testid: string }) {
  return text.trim() ? <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#323D4F]" data-testid={testid}>{text}</p> : <p className="rounded-md bg-[#FFF1E8] px-3 py-2 text-xs text-[#9A3A05]" data-testid={testid}>{empty}</p>;
}
function Fld({ label, hint, flag, wide, children }: { label: string; hint?: string; flag?: boolean; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn("block min-w-0", wide && "md:col-span-full")}>
      <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[#323D4F]/85">{label}{flag && <span className="rounded bg-[#FFF1E8] px-1.5 text-[10px] font-semibold text-[#9A3A05]">Required to complete</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[#5B6678]">{hint}</span>}
    </label>
  );
}
function IconBtn({ children, label, onClick, disabled, danger, dark, testid }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean; dark?: boolean; testid: string }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} data-testid={testid}
    className={cn("grid h-9 w-9 place-items-center rounded-md transition disabled:opacity-30", dark ? "text-[#AEB8C6] hover:bg-white/10 hover:text-white" : "text-[#5B6678] hover:bg-white", danger && (dark ? "hover:text-[#FF6A0D]" : "hover:text-destructive"))}>{children}</button>;
}

/** Readable report view for strategy v1 data. */
export function StrategyReport({ value }: { value: unknown }) {
  const d: Obj = isObj(value) ? (value as Obj) : {};
  const values = Array.isArray(d.values) ? d.values : [];
  const objs = Array.isArray(d.objectives) ? d.objectives : [];
  return (
    <div className="space-y-3 text-sm">
      <div><h3 className="text-xs font-semibold uppercase tracking-wider">Vision</h3><p className="whitespace-pre-wrap">{str(d.vision) || "Not provided"}</p></div>
      <div><h3 className="text-xs font-semibold uppercase tracking-wider">Mission</h3><p className="whitespace-pre-wrap">{str(d.mission) || "Not provided"}</p></div>
      <div><h3 className="text-xs font-semibold uppercase tracking-wider">Values</h3>{values.length ? <ol className="list-decimal pl-5">{values.map((v, i) => <li key={i}>{str(v)}</li>)}</ol> : <p>None recorded</p>}</div>
      <div><h3 className="text-xs font-semibold uppercase tracking-wider">Strategic objectives</h3>
        {objs.length === 0 && <p>None recorded</p>}
        {objs.map((raw, i) => { const o: Obj = isObj(raw) ? raw : {}; const miss = missingCritical(o); return (
          <div key={i} className="mt-2 break-inside-avoid rounded border p-2">
            <p className="font-semibold">{[str(o.code), str(o.title)].filter(Boolean).join(" - ") || `Objective ${i + 1}`}</p>
            {miss.length > 0 && <p className="text-xs text-[#9A3A05]">Incomplete: missing {miss.map((f) => f.label.toLowerCase()).join(", ")}</p>}
            <dl className="mt-1 grid gap-x-4 gap-y-1 sm:grid-cols-2">{SMART.flatMap((g) => g.fields).filter((f) => !blank(o[f.k])).map((f) => <div key={f.k}><dt className="text-xs font-semibold">{f.label}</dt><dd className="whitespace-pre-wrap">{str(o[f.k])}</dd></div>)}</dl>
          </div>); })}
      </div>
    </div>
  );
}
