import { createContext, useContext, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, CircleSlash } from "lucide-react";
import { cn } from "@/lib/utils";

export type R = Record<string, unknown>;
export const isR = (v: unknown): v is R => !!v && typeof v === "object" && !Array.isArray(v);
export const obj = (v: unknown): R => (isR(v) ? v : {});
export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
/** Unwrap {value, ...} wrappers used in imported data. */
export const val = (v: unknown): number | null => (isNum(v) ? v : isR(v) && isNum(v.value) ? v.value : null);
export const str = (v: unknown): string => (typeof v === "string" ? v : isNum(v) ? String(v) : "");

/** Source file codes used by the imported Tagbilaran package. */
export const SOURCE_FILES: Record<string, string> = {
  "01": "01_Tagbilaran_City_Preliminary_Business_Plan_.pdf",
  "02": "02_Tagbilaran_Financial_Model.xlsx",
  "03": "03_Tagbilaran_WSP_data_summarized.xlsx",
  "04": "04_Tagbilaran_City_filled-up_questionnaire.pdf",
  "05": "05_Tagbilaran_City_Waterworks_WSC_BV_and_collection_data.pdf",
  "06": "06_Tagbilaran_water_rate_schedule.jpg",
  "07": "07_Tagbilaran_City_Waterworks_production_data.pdf",
};
export const ADDENDUM_FILE = "TCWS_Business_Plan_1792030506254.md";
export const DATA_REVIEW_FILE = "TCWS_Data_Review_1792030506255.xlsx";
export const PROJECTIONS_FILE = "tagbilaran_tcws_optionB_1792021268124.json";
export const HISTORY_SOURCE = DATA_REVIEW_FILE;
export const DEMO_FILE = "demo_utility_valle_verde_v2_1792021268122.json";

/** Source/currency context keyed by plan kind, so fallbacks never cite the wrong package. */
export type SourceInfo = { fallback: string; currency: string };
export function sourceInfoFor(kind: string | undefined): SourceInfo {
  if (kind === "real") return { fallback: PROJECTIONS_FILE, currency: "PHP" };
  if (kind === "fictional") return { fallback: DEMO_FILE, currency: "USD" };
  return { fallback: "user-entered plan data", currency: "" };
}
const SourceCtx = createContext<SourceInfo>({ fallback: "supplied plan data", currency: "" });
export function SourceProvider({ kind, children }: { kind: string | undefined; children: ReactNode }) {
  return <SourceCtx.Provider value={sourceInfoFor(kind)}>{children}</SourceCtx.Provider>;
}
export const useSourceInfo = () => useContext(SourceCtx);
export function sourceOf(v: unknown, fallback = ""): string {
  const s = obj(obj(v).source).file ?? obj(v).source;
  const codes = str(s).split(/[;,\s]+/).filter(Boolean);
  const names = codes.map((c) => SOURCE_FILES[c] ?? c).filter(Boolean);
  return names.length ? names.join("; ") : fallback;
}

const nf = (d: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: d });
export const fmtN = (v: number | null | undefined, d = 0) => (isNum(v) ? nf(d).format(v) : "No data");
export const fmtM = (v: number | null | undefined, d = 1) => (isNum(v) ? `${nf(d).format(v / 1e6)} M` : "No data");
export const fmtPct = (v: number | null | undefined, d = 1) => (isNum(v) ? `${nf(d).format(v * 100)}%` : "No data");
export const compact = (v: number) => (Math.abs(v) >= 1e9 ? `${nf(1).format(v / 1e9)}B` : Math.abs(v) >= 1e6 ? `${nf(1).format(v / 1e6)}M` : Math.abs(v) >= 1e3 ? `${nf(1).format(v / 1e3)}k` : nf(2).format(v));

/** {"2030": n, ...} → sorted [{year, value}] with numeric values only. */
export function yearSeries(v: unknown): { year: number; value: number }[] {
  return Object.entries(obj(v)).map(([k, x]) => ({ year: Number(k.replace(/^y/, "")), value: val(x) })).filter((p): p is { year: number; value: number } => Number.isFinite(p.year) && p.value !== null).sort((a, b) => a.year - b.year);
}
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const C = { cyan: "#1ED3D9", lime: "#C9DA3A", orange: "#FF6A0D", navy: "#323D4F", slate: "#5A6780", green: "#70AD47", teal: "#127A80", gray: "#9AA4B2" };

export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[10.5px] leading-snug text-[#6B7687]" data-testid="text-source">{children}</p>;
}

export function Section({ title, kicker, children, aside, className }: { title: string; kicker?: string; children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-[#E3E8EE] bg-white p-4 md:p-5 print-avoid", className)}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>{kicker && <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#127A80]">{kicker}</div>}<h3 className="text-[15px] font-semibold text-[#323D4F]">{title}</h3></div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, accent = C.cyan, testid }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string; testid?: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#E3E8EE] bg-white p-3.5 print-avoid" data-testid={testid}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} aria-hidden />
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#5B6678]">{label}</div>
      <div className="mt-1 text-[22px] font-semibold leading-tight text-[#323D4F] tnum">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-[#6B7687]">{sub}</div>}
    </div>
  );
}

export function NoData({ children = "No data supplied" }: { children?: ReactNode }) {
  return <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#D5DCE5] bg-[#F7F9FB] px-3 py-4 text-xs text-[#6B7687]"><CircleSlash className="h-4 w-4" />{children}</div>;
}

export type Series = { key: string; label: string; color: string; dashed?: boolean };
/** Annual line/bar chart. Points with no value are left as gaps (never zero). */
export function YearChart({ data, series, unit, kind = "line", height = 220, fmt = compact }: { data: Record<string, number | null | string>[]; series: Series[]; unit: string; kind?: "line" | "bar"; height?: number; fmt?: (v: number) => string }) {
  if (!data.length || !series.some((s) => data.some((d) => isNum(d[s.key])))) return <NoData>No data for this chart</NoData>;
  const common = (
    <>
      <CartesianGrid stroke="#E3E8EE" vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5B6678" }} tickLine={false} axisLine={{ stroke: "#D5DCE5" }} />
      <YAxis tick={{ fontSize: 11, fill: "#5B6678" }} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => fmt(v)} label={{ value: unit, angle: -90, position: "insideLeft", fontSize: 10, fill: "#6B7687", dx: -2 }} />
      <Tooltip formatter={(v: number, n: string) => [`${nf(2).format(v)} ${unit}`, n]} contentStyle={{ borderRadius: 8, border: "1px solid #E3E8EE", fontSize: 12 }} />
      {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
    </>
  );
  return (
    <div style={{ height }} className="w-full print-chart" role="img" aria-label={`Chart in ${unit}: ${series.map((s) => s.label).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "bar" ? (
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>{common}{series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} isAnimationActive={false} />)}</BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>{common}{series.map((s) => <Line key={s.key} dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.25} strokeDasharray={s.dashed ? "5 4" : undefined} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />)}</LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function Collapse({ title, sub, children, defaultOpen, testid }: { title: string; sub?: string; children: ReactNode; defaultOpen?: boolean; testid?: string }) {
  return (
    <details className="group rounded-xl border border-[#E3E8EE] bg-[#F7F9FB] no-print" open={defaultOpen} data-testid={testid}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-[#323D4F]">
        {title}{sub && <span className="text-xs font-normal text-[#6B7687]">{sub}</span>}
        <ChevronDown className="ml-auto h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-[#E3E8EE] bg-white p-4">{children}</div>
    </details>
  );
}

export function Table({ head, rows, right = [], testid }: { head: ReactNode[]; rows: ReactNode[][]; right?: number[]; testid?: string }) {
  if (!rows.length) return <NoData>No entries</NoData>;
  return (
    <div className="overflow-x-auto" data-testid={testid}>
      <table className="w-full border-collapse text-xs">
        <thead><tr className="border-b-2 border-[#323D4F]/15 text-left text-[10.5px] uppercase tracking-wide text-[#5B6678]">{head.map((h, i) => <th key={i} className={cn("px-2 py-2 font-semibold", right.includes(i) && "text-right")}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-[#E3E8EE] align-top even:bg-[#F7F9FB]/60">{r.map((c, j) => <td key={j} className={cn("px-2 py-1.5 text-[#323D4F]", right.includes(j) && "text-right tnum whitespace-nowrap")}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** Row × year matrix for {"2030": n} objects. */
export function YearMatrix({ rows, unit, fmt = (v: number) => fmtN(v) }: { rows: { label: string; data: unknown }[]; unit: string; fmt?: (v: number) => string }) {
  const years = Array.from(new Set(rows.flatMap((r) => yearSeries(r.data).map((p) => p.year)))).sort((a, b) => a - b);
  if (!years.length) return <NoData />;
  return <Table head={[`Item (${unit})`, ...years]} right={years.map((_, i) => i + 1)} rows={rows.map((r) => { const m = new Map(yearSeries(r.data).map((p) => [p.year, p.value])); return [r.label, ...years.map((y) => (m.has(y) ? fmt(m.get(y)!) : "–"))]; })} />;
}

type HistRow = { metric: string; unit: string; year: number | string; value: number | null; note: string };
export function parseHistory(v: unknown): HistRow[] {
  return arr(v).filter(isR).map((r) => ({ metric: str(r.metric), unit: str(r.unit), year: isNum(r.year) ? r.year : str(r.year), value: val(r.value), note: str(r.note) })).filter((r) => r.metric);
}
const annualYear = (y: number | string) => (isNum(y) ? y : /^\d{4}$/.test(String(y)) ? Number(y) : null);

/** Historical series: one small chart per metric (annual points only; partial periods listed, not connected). */
export function HistoryPanel({ history, source, title = "Historical series" }: { history: unknown; source: string; title?: string }) {
  const rows = parseHistory(history);
  if (!rows.length) return null;
  const metrics = Array.from(new Set(rows.map((r) => `${r.metric}|${r.unit}`)));
  return (
    <Section title={title} kicker="Reported history" aside={<span className="text-[11px] text-[#6B7687]">{metrics.length} metrics · {rows.length} observations</span>}>
      <div className="grid gap-3 md:grid-cols-2">
        {metrics.map((key) => {
          const [metric, unit] = key.split("|");
          const list = rows.filter((r) => r.metric === metric && r.unit === unit);
          const annual = list.filter((r) => annualYear(r.year) !== null).sort((a, b) => annualYear(a.year)! - annualYear(b.year)!);
          const partial = list.filter((r) => annualYear(r.year) === null);
          const last = annual.filter((r) => r.value !== null).at(-1);
          return (
            <div key={key} className="rounded-lg border border-[#E3E8EE] p-3 print-avoid" data-testid={`history-${metric}`}>
              <div className="flex items-baseline justify-between gap-2"><div className="text-xs font-semibold text-[#323D4F]">{metric}</div><div className="text-[11px] text-[#6B7687]">{unit || "unit not stated"}</div></div>
              {last && <div className="mt-0.5 text-lg font-semibold text-[#323D4F] tnum">{fmtN(last.value, 2)} <span className="text-xs font-normal text-[#6B7687]">in {last.year}</span></div>}
              {annual.length > 1 ? <YearChart height={130} unit={unit} data={annual.map((r) => ({ label: String(r.year), v: r.value }))} series={[{ key: "v", label: metric, color: C.cyan }]} /> : null}
              {(partial.length > 0 || annual.some((r) => r.note)) && (
                <ul className="mt-1 space-y-0.5 text-[11px] text-[#5B6678]">
                  {partial.map((r, i) => <li key={`p${i}`}><span className="font-medium text-[#323D4F]">{String(r.year)}:</span> {fmtN(r.value, 2)} {unit} <span className="text-[#9A3A05]">(partial period, not plotted)</span>{r.note ? ` · ${r.note}` : ""}</li>)}
                  {annual.filter((r) => r.note).map((r, i) => <li key={`n${i}`}><span className="font-medium text-[#323D4F]">{String(r.year)}:</span> {r.note}</li>)}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <SourceNote>Source: {source}. Annual values only are connected; partial-year figures are listed separately.</SourceNote>
    </Section>
  );
}
