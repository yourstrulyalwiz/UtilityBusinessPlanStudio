import { useMemo, useState } from "react";
import { workbook, inputVariables, derivedVariables, levelLabels, createBaseline, isBaseline, evaluateBaseline, type BaselineData } from "@workspace/baseline";
import { AlertTriangle, ChevronDown, CircleSlash, Info, Search } from "lucide-react";
import { inputCls } from "@/components/kit";
import { cn } from "@/lib/utils";

export const SOURCE_FILE = "Indicadores_TCWS_2024_1792026762156.xlsx";
type Evaluated = ReturnType<typeof evaluateBaseline>;
type Indicator = Evaluated["indicators"][number];
type Variable = (typeof workbook.variables)[number];

export const LEVEL_COLORS = ["#FF6A0D", "#5A6780", "#1ED3D9", "#70AD47", "#D9E950"];
const varById = new Map(workbook.variables.map((v) => [v.id, v]));

export const asBaseline = (v: unknown): BaselineData => {
  if (!isBaseline(v)) return createBaseline(false);
  return { ...createBaseline(false), ...v, variables: { ...createBaseline(false).variables, ...v.variables }, variableNotes: v.variableNotes ?? {}, indicatorNotes: v.indicatorNotes ?? {} };
};

const num = (n: number, d = 2) => n.toLocaleString("en-US", { maximumFractionDigits: d });
export function fmtValue(v: number | null, unit: string) {
  if (v === null) return "No data";
  return unit === "%" ? `${num(v * 100, 1)}%` : `${num(v)} ${unit}`;
}
const isPct = (u: string) => u === "%";

export function LevelMeter({ level, informational, compact }: { level: number | null; informational?: boolean; compact?: boolean }) {
  const text = informational ? "Informational, no levels defined" : level === null ? "No level" : `Level ${level} of 5 · ${levelLabels[level - 1]}`;
  return (
    <div role="meter" aria-valuemin={1} aria-valuemax={5} aria-valuenow={level ?? undefined} aria-valuetext={text} aria-label="Performance level">
      <div className={cn("flex gap-1", compact ? "h-2" : "h-3")}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={cn("flex-1 rounded-sm transition-colors duration-300", informational && "bg-[repeating-linear-gradient(45deg,#E3E8EE_0_4px,#F7F9FB_4px_8px)]")}
            style={informational ? undefined : { background: level !== null && i <= level ? LEVEL_COLORS[level - 1] : "#E3E8EE" }} />
        ))}
      </div>
      {!compact && <div className="mt-1.5 flex justify-between font-mono text-[10px] text-[#6B7687]" aria-hidden>{[1, 2, 3, 4, 5].map((i) => <span key={i} className={cn(level === i && "font-semibold text-[#323D4F]")}>{i}</span>)}</div>}
      <div className="mt-1 text-xs font-medium text-[#323D4F]" data-testid="text-level">{text}</div>
    </div>
  );
}

function NumInput({ value, unit, onChange, readOnly, id, invalid }: { value: number | null; unit: string; onChange: (v: number | null) => void; readOnly?: boolean; id: string; invalid?: boolean }) {
  const shown = value === null ? "" : isPct(unit) ? String(Math.round(value * 100 * 1e6) / 1e6) : String(value);
  const [txt, setTxt] = useState<string | null>(null);
  return (
    <div className="relative">
      <input id={id} type="number" step="any" inputMode="decimal" disabled={readOnly} aria-invalid={invalid || undefined}
        className={cn(inputCls, "tnum pr-14", invalid && "border-[#FF6A0D] focus:border-[#FF6A0D]")}
        value={txt ?? shown} placeholder="No data"
        onChange={(e) => { setTxt(e.target.value); const s = e.target.value; if (s === "") onChange(null); else { const n = Number(s); if (Number.isFinite(n)) onChange(isPct(unit) ? n / 100 : n); } }}
        onBlur={() => setTxt(null)} data-testid={`input-var-${id}`} />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7687]">{unit}</span>
    </div>
  );
}

type Props = { value: unknown; onChange?: (v: BaselineData) => void; readOnly?: boolean };

export function BaselineEditor({ value, onChange, readOnly }: Props) {
  const data = useMemo(() => asBaseline(value), [value]);
  const ev = useMemo(() => evaluateBaseline(data), [data]);
  const [q, setQ] = useState("");
  const [dim, setDim] = useState("");
  const [show, setShow] = useState<"all" | "issues" | "missing">("all");
  const set = (patch: Partial<BaselineData>) => onChange?.({ ...data, ...patch });
  const setVar = (id: string, v: number | null) => set({ variables: { ...data.variables, [id]: v } });

  const fromWorkbook = (id: string) => data.importedWorkbook && data.variables[id] === (varById.get(id)?.value ?? null);
  const issueKeys = new Map<string, string[]>();
  ev.issues.forEach((i) => i.keys.forEach((k) => issueKeys.set(k, [...(issueKeys.get(k) ?? []), i.message])));

  const dims = Array.from(new Set(workbook.indicators.map((i) => i.dimension)));
  const s = q.trim().toLowerCase();
  const visible = ev.indicators.filter((i) =>
    (!dim || i.dimension === dim) && (!s || `${i.name} ${i.dimension} ${i.formula}`.toLowerCase().includes(s)) &&
    (show === "all" || (show === "issues" ? i.issues.length > 0 : i.value === null)));
  const counts = [1, 2, 3, 4, 5].map((l) => ev.indicators.filter((i) => i.level === l).length);
  const noData = ev.indicators.filter((i) => i.value === null).length;
  const groups = Array.from(new Set(inputVariables.map((v) => v.group)));
  const errors = ev.issues.filter((i) => i.severity === "error").length;
  const warnings = ev.issues.length - errors;

  return (
    <div className="space-y-6" data-testid="baseline-editor">
      {/* Summary */}
      <div className="navy-depth rounded-xl p-5 text-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1ED3D9]">22 indicators · computed from the variables below</div>
          <div className="text-xs text-[#AEB8C6]">Reference year: <strong className="tnum text-[#EEF2F6]">{data.referenceYear ?? "not set"}</strong></div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-7">
          {counts.map((c, i) => (
            <div key={i} className="rounded-lg bg-white/[.06] p-2.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#AEB8C6]"><span className="h-2 w-2 rounded-sm" style={{ background: LEVEL_COLORS[i] }} />Level {i + 1}</div>
              <div className="mt-1 text-xl font-semibold tnum" data-testid={`count-level-${i + 1}`}>{c}</div>
            </div>
          ))}
          <div className="rounded-lg bg-white/[.06] p-2.5"><div className="text-[10px] uppercase tracking-wide text-[#AEB8C6]">No data</div><div className="mt-1 text-xl font-semibold tnum" data-testid="count-nodata">{noData}</div></div>
          <div className="rounded-lg bg-white/[.06] p-2.5"><div className="text-[10px] uppercase tracking-wide text-[#AEB8C6]">Checks</div><div className="mt-1 text-sm font-semibold" data-testid="count-issues">{errors} errors · {warnings} warnings</div></div>
        </div>
        <p className="mt-3 text-[11px] text-[#AEB8C6]">Levels follow the defined performance thresholds. Results with consistency errors receive no level. Drafts can be saved with warnings or errors; submission is checked by the server.</p>
      </div>

      <details className="group rounded-lg border border-[#E3E8EE] bg-[#F7F9FB] p-4 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-[#323D4F]" data-testid="toggle-method-help"><Info className="h-4 w-4 text-[#127A80]" />How indicators and levels work<ChevronDown className="ml-auto h-4 w-4 transition group-open:rotate-180" /></summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-relaxed text-[#5B6678]">
          <li>Each indicator is calculated from your input variables using the formula shown on its card. Enter percentages from 0 to 100.</li>
          <li>Levels 1 to 5 ({levelLabels.join(", ")}) follow the defined performance bands. For "higher is better" indicators a value at or above a boundary reaches that level; for "lower is better" a value at or below it.</li>
          <li>Missing inputs stay empty and the indicator shows No data; nothing is replaced by zero.</li>
          <li>HR costs as % of operating costs is informational: no performance levels are defined for it.</li>
          <li>Operation cost coverage above 100% and a negative EBITDA margin are valid results.</li>
        </ul>
      </details>

      {data.importedWorkbook && (
        <details className="group rounded-lg border-l-4 border-[#FF6A0D] bg-[#FFF1E8] p-4 text-xs text-[#9A3A05]" data-testid="notes-workbook">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />Baseline assumptions and data limitations<ChevronDown className="ml-auto h-4 w-4 transition group-open:rotate-180" /></summary>
          <ul className="mt-2 space-y-1 leading-relaxed">{workbook.notes.map((n, i) => <li key={i}>{n.replace(/^•\s*/, "")}</li>)}</ul>
        </details>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className={inputCls + " pl-9"} placeholder="Search indicators" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search-indicators" /></div>
        <select className={cn(inputCls, "md:w-56")} value={dim} onChange={(e) => setDim(e.target.value)} data-testid="filter-dimension"><option value="">All dimensions</option>{dims.map((d) => <option key={d}>{d}</option>)}</select>
        <select className={cn(inputCls, "md:w-48")} value={show} onChange={(e) => setShow(e.target.value as typeof show)} data-testid="filter-show"><option value="all">All indicators</option><option value="issues">With checks</option><option value="missing">No data</option></select>
      </div>
      <div className="text-xs text-[#6B7687]" data-testid="text-visible-count">Showing {visible.length} of 22 indicators</div>

      {/* Indicators */}
      {dims.map((d) => {
        const list = visible.filter((i) => i.dimension === d);
        if (!list.length) return null;
        return (
          <section key={d}>
            <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#323D4F]"><span className="h-3 w-1 rounded bg-[#1ED3D9]" />{d}<span className="font-mono text-[10px] font-normal normal-case text-[#6B7687]">{list.length} indicators</span></h3>
            <div className="grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
              {list.map((i) => <IndicatorCard key={i.id} ind={i} note={data.indicatorNotes[i.id] ?? ""} readOnly={readOnly}
                onNote={(t) => set({ indicatorNotes: { ...data.indicatorNotes, [i.id]: t } })} />)}
            </div>
          </section>
        );
      })}
      {visible.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No indicators match. <button className="text-[#127A80] hover:underline" onClick={() => { setQ(""); setDim(""); setShow("all"); }} data-testid="button-reset-filters">Show all 22</button></div>}

      {/* Variables last */}
      <section className="space-y-2 border-t pt-6">
        <h3 className="text-sm font-semibold text-[#323D4F]">Input variables</h3>
        <p className="text-xs text-[#5B6678]">Open a group to view or edit values. Indicators above update immediately; the server recalculates on submission.</p>
        <div className="max-w-xs">
          <label htmlFor="ref-year" className="mb-1 block text-xs font-medium text-[#323D4F]">Year of measurement (optional)</label>
          <input id="ref-year" type="number" step={1} className={cn(inputCls, "tnum")} disabled={readOnly} value={data.referenceYear ?? ""} placeholder="e.g. 2024"
            onChange={(e) => set({ referenceYear: e.target.value === "" ? null : Number(e.target.value) })} data-testid="input-reference-year" />
          {ev.issues.filter((i) => i.keys.length === 0).map((i, k) => <p key={k} className="mt-1 text-xs text-[#9A3A05]">{i.message}</p>)}
        </div>
        {groups.map((g) => {
          const vars = inputVariables.filter((v) => v.group === g);
          const filled = vars.filter((v) => data.variables[v.id] != null).length;
          const bad = vars.filter((v) => issueKeys.has(v.id)).length;
          return (
            <details key={g} className="group rounded-lg border border-[#E3E8EE] bg-white" data-testid={`group-${g}`}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3 text-sm font-medium text-[#323D4F]">
                {g}<span className="text-xs font-normal text-[#6B7687] tnum">{filled}/{vars.length} filled</span>
                {bad > 0 && <span className="inline-flex items-center gap-1 rounded bg-[#FFF1E8] px-1.5 py-0.5 text-[11px] text-[#9A3A05]"><AlertTriangle className="h-3 w-3" />{bad} to check</span>}
                <ChevronDown className="ml-auto h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <div className="grid gap-4 border-t p-4 md:grid-cols-2">
                {vars.map((v) => <VariableField key={v.id} v={v} value={data.variables[v.id] ?? null} note={data.variableNotes[v.id] ?? ""} readOnly={readOnly}
                  msgs={issueKeys.get(v.id) ?? []} origin={data.variables[v.id] == null ? null : fromWorkbook(v.id) ? "Baseline value" : "Entered value"}
                  onValue={(n) => setVar(v.id, n)} onNote={(t) => set({ variableNotes: { ...data.variableNotes, [v.id]: t } })} />)}
              </div>
            </details>
          );
        })}
        <details className="group rounded-lg border border-[#E3E8EE] bg-[#F7F9FB]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-[#323D4F]" data-testid="group-derived">Calculated intermediate variables<span className="text-xs font-normal text-[#6B7687]">read-only</span><ChevronDown className="ml-auto h-4 w-4 transition group-open:rotate-180" /></summary>
          <div className="grid gap-3 border-t p-4 md:grid-cols-2">
            {derivedVariables.map((v) => (
              <div key={v.id} className="rounded-md bg-white p-3 ring-1 ring-[#E3E8EE]">
                <div className="text-xs font-medium text-[#323D4F]">{v.name}</div>
                <div className="mt-1 text-lg font-semibold text-[#323D4F] tnum" data-testid={`text-derived-${v.id}`}>{fmtValue(ev.derived[v.id] ?? null, v.unit)}</div>
                {v.note && <div className="mt-1 text-[11px] text-[#6B7687]">{v.note}</div>}
                {issueKeys.get(v.id)?.map((m, k) => <p key={k} className="mt-1 text-xs text-[#9A3A05]">{m}</p>)}
              </div>
            ))}
          </div>
        </details>
      </section>
    </div>
  );
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos((Math.PI * a) / 180), cy - r * Math.sin((Math.PI * a) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
}
/** Semicircular 1-5 level gauge. Level is also given as text (never colour alone). */
export function LevelGauge({ level, informational, size = 92 }: { level: number | null; informational?: boolean; size?: number }) {
  const text = informational ? "Informational, no levels defined" : level === null ? "No level" : `Level ${level} of 5, ${levelLabels[level - 1]}`;
  const needle = level === null ? null : 180 - (level - 0.5) * 36;
  return (
    <svg viewBox="0 0 100 58" width={size} height={size * 0.58} role="meter" aria-valuemin={1} aria-valuemax={5} aria-valuenow={level ?? undefined} aria-valuetext={text} aria-label="Performance level" className="shrink-0">
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={arcPath(50, 50, 40, 180 - i * 36 - 2, 180 - (i + 1) * 36 + 2)} fill="none" strokeWidth={10} strokeLinecap="butt"
          stroke={informational ? "#E3E8EE" : level !== null && i + 1 <= level ? LEVEL_COLORS[level - 1] : "#E3E8EE"} strokeDasharray={informational ? "3 3" : undefined} />
      ))}
      {needle !== null && <line x1={50} y1={50} x2={50 + 30 * Math.cos((Math.PI * needle) / 180)} y2={50 - 30 * Math.sin((Math.PI * needle) / 180)} stroke="#323D4F" strokeWidth={2.5} strokeLinecap="round" />}
      <circle cx={50} cy={50} r={4.5} fill="#323D4F" />
      <text x={50} y={36} textAnchor="middle" fontSize={13} fontWeight={700} fill="#323D4F" fontFamily="JetBrains Mono, monospace">{informational ? "i" : level ?? "–"}</text>
    </svg>
  );
}

function IndicatorCard({ ind, note, onNote, readOnly }: { ind: Indicator; note: string; onNote: (t: string) => void; readOnly?: boolean }) {
  const info = !ind.direction;
  const hasErr = ind.issues.some((x) => x.severity === "error");
  return (
    <article className="flex flex-col rounded-xl border border-[#E3E8EE] bg-white p-3 transition hover:border-[#1ED3D9]/60" data-testid={`card-indicator-${ind.id}`}>
      <div className="flex items-center gap-3">
        <LevelGauge level={ind.level} informational={info} size={78} />
        <div className="min-w-0 flex-1">
          <h4 className="text-[12.5px] font-semibold leading-snug text-[#323D4F]">{ind.name}</h4>
          {ind.value === null ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#6B7687]"><CircleSlash className="h-3.5 w-3.5" />No data</span>
            : <div className={cn("text-lg font-semibold leading-tight tnum", hasErr ? "text-[#9A3A05]" : "text-[#323D4F]")} data-testid={`text-value-${ind.id}`}>{fmtValue(ind.value, ind.unit)}</div>}
          <div className="text-[10.5px] text-[#5B6678]" data-testid="text-level">{info ? "Informational" : ind.level ? `L${ind.level} · ${levelLabels[ind.level - 1]}` : "No level"} · {ind.direction === ">" ? "higher is better" : ind.direction === "<" ? "lower is better" : "no bands"}</div>
        </div>
        {ind.issues.length > 0 && <span className="shrink-0 rounded bg-[#FFF1E8] p-1 text-[#9A3A05]" title={ind.issues.map((x) => x.message).join("\n")} aria-label={`${ind.issues.length} checks`}><AlertTriangle className="h-3.5 w-3.5" /></span>}
      </div>
      <details className="group mt-2 text-xs">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] font-medium text-[#127A80]" data-testid={`toggle-formula-${ind.id}`}>Details, formula and note<ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />{note && <span className="ml-auto rounded bg-[#E4F8F9] px-1.5 text-[10px] text-[#1F5F63]">note</span>}</summary>
        <div className="mt-2 space-y-2 text-[#5B6678]">
          {ind.issues.map((x, k) => <p key={k} className={cn("flex gap-1.5 rounded px-2 py-1", x.severity === "error" ? "bg-[#FFF1E8] text-[#9A3A05]" : "bg-[#F7F9FB]")}><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /><span><strong>{x.severity === "error" ? "Error" : "Warning"}:</strong> {x.message}</span></p>)}
          {ind.value === null && ind.missing.length > 0 && <p>Missing: {ind.missing.map((k) => varById.get(k)?.name ?? k).join("; ")}</p>}
          <p><span className="font-medium text-[#323D4F]">Formula:</span> {ind.formula} <span className="text-[#6B7687]">({ind.unit})</span></p>
          {info ? <p>No performance levels are defined for this indicator.</p> : (
            <div className="grid grid-cols-5 gap-1 text-center">{ind.bands.map((b, k) => <div key={k} className={cn("rounded px-1 py-1", ind.level === k + 1 ? "bg-[#323D4F] text-white" : "bg-[#F7F9FB]")}><div className="font-mono text-[10px]">L{k + 1}</div><div className="text-[10px] tnum">{b}</div></div>)}</div>
          )}
          <label className="block text-[11px] font-medium text-[#323D4F]" htmlFor={`note-${ind.id}`}>Analytical note</label>
          <textarea id={`note-${ind.id}`} rows={2} disabled={readOnly} className={cn(inputCls, "h-auto py-2 text-xs")} placeholder={readOnly ? "No note" : "Interpretation, caveats, data quality"} value={note} onChange={(e) => onNote(e.target.value)} data-testid={`input-note-${ind.id}`} />
        </div>
      </details>
    </article>
  );
}

function VariableField({ v, value, note, onValue, onNote, readOnly, msgs, origin }: { v: Variable; value: number | null; note: string; onValue: (n: number | null) => void; onNote: (t: string) => void; readOnly?: boolean; msgs: string[]; origin: string | null }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-start justify-between gap-2">
        <label htmlFor={v.id} className="text-xs font-medium text-[#323D4F]">{v.name}</label>
        {origin && <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px]", origin === "Entered value" ? "bg-[#E4F8F9] text-[#1F5F63]" : "bg-[#F7F9FB] text-[#5B6678]")} data-testid={`badge-origin-${v.id}`}>{origin}</span>}
      </div>
      <NumInput id={v.id} value={value} unit={v.unit} onChange={onValue} readOnly={readOnly} invalid={msgs.length > 0} />
      {msgs.map((m, k) => <p key={k} className="mt-1 text-xs text-[#9A3A05]" data-testid={`error-${v.id}`}>{m}</p>)}
      <textarea rows={1} disabled={readOnly} aria-label={`Note for ${v.name}`} className={cn(inputCls, "mt-1.5 h-auto py-1.5 text-xs")} placeholder={readOnly ? "" : "Note (source, period, estimate)"} value={note} onChange={(e) => onNote(e.target.value)} data-testid={`input-varnote-${v.id}`} />
    </div>
  );
}

/** Read-only report rendering for print. */
export function BaselineReport({ value }: { value: unknown }) {
  const data = asBaseline(value);
  const ev = evaluateBaseline(data);
  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-[#5B6678]">Year of measurement: {data.referenceYear ?? "not set"}{data.importedWorkbook ? " · Imported values are approximations; see workbook notes." : ""}</p>
      <table className="w-full border-collapse text-xs">
        <thead><tr className="border-b text-left"><th className="py-1 pr-2">Indicator</th><th className="py-1 pr-2">Value</th><th className="py-1 pr-2">Level</th><th className="py-1">Note / checks</th></tr></thead>
        <tbody>{ev.indicators.map((i) => (
          <tr key={i.id} className="border-b align-top">
            <td className="py-1 pr-2"><div className="font-medium">{i.name}</div><div className="text-[10px] text-[#6B7687]">{i.dimension}</div></td>
            <td className="py-1 pr-2 tnum">{fmtValue(i.value, i.unit)}</td>
            <td className="py-1 pr-2">{!i.direction ? "Informational" : i.level ? `${i.level} · ${levelLabels[i.level - 1]}` : "No level"}</td>
            <td className="py-1">{data.indicatorNotes[i.id] || ""}{i.issues.map((x, k) => <div key={k} className="text-[#9A3A05]">{x.message}</div>)}</td>
          </tr>))}</tbody>
      </table>
      <h3 className="pt-2 text-sm font-semibold">Input variables</h3>
      <table className="w-full border-collapse text-xs">
        <tbody>{inputVariables.map((v) => (
          <tr key={v.id} className="border-b align-top"><td className="py-1 pr-2">{v.name}</td><td className="py-1 pr-2 tnum whitespace-nowrap">{fmtValue(data.variables[v.id] ?? null, v.unit)}</td><td className="py-1 text-[#5B6678]">{data.variableNotes[v.id] ?? ""}</td></tr>
        ))}</tbody>
      </table>
      <p className="text-[11px] text-[#6B7687]">Source: {SOURCE_FILE} (methodology)</p>
    </div>
  );
}
