import { AlertTriangle, CheckCircle2, CircleDashed, Star } from "lucide-react";
import { inputCls } from "@/components/kit";
import { DemoM5View, DemoM6View, isDemoM5, isDemoM6 } from "@/components/demo-views";
import { cn } from "@/lib/utils";
import {
  type R, obj, arr, isR, isNum, val, str, sum, yearSeries, sourceOf, fmtN, fmtM, fmtPct, compact,
  Section, Stat, NoData, SourceNote, YearChart, Table, YearMatrix, HistoryPanel, C, HISTORY_SOURCE, DATA_REVIEW_FILE, useSourceInfo,
} from "@/components/plan-data";

const isPartial = (period: unknown) => { const p = str(period).trim(); return !!p && !/^(jan\s*[-–]\s*dec|annual|full year|fy)$/i.test(p); };
const PHP = (v: number | null) => (isNum(v) ? `PHP ${fmtM(v)}` : "No data");

export function ProjectionNotice() {
  return (
    <div className="rounded-xl border-l-4 border-[#1ED3D9] bg-[#E4F8F9] px-4 py-3 text-xs leading-relaxed text-[#1F5F63]" data-testid="text-projection-notice">
      <strong>Supplied projections vs. temporary sensitivity.</strong> Charts and tables reproduce the figures supplied in the preliminary business plan; the Studio does not recalculate them. Where the updated data review differs, it takes precedence for reported history, and any discrepancy in financial figures is flagged and not approved. The what-if tool is a temporary sensitivity and is never saved.
    </div>
  );
}

/* ---------------- Module 4 ---------------- */
export function M4View({ data }: { data: unknown }) {
  const d = obj(data);
  const { fallback: PROJECTIONS_FILE, currency } = useSourceInfo();
  const cur = currency ? `${currency} ` : "";
  const goals = arr(d.goals).filter(isR);
  const actions = arr(d.actions).filter(isR);
  const actTotal = (a: R) => val(a.total_capex_2026_2029_php) ?? val(a.total_capex) ?? (yearSeries(a.capex_by_year).length ? sum(yearSeries(a.capex_by_year).map((p) => p.value)) : null);
  const capex = actions.map((a) => ({ code: str(a.code), title: str(a.title), total: actTotal(a) }));
  const totalCapex = capex.map((c) => c.total).filter(isNum);
  if (!goals.length && !actions.length) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Goals" value={goals.length} accent={C.cyan} />
        <Stat label="Strategies" value={arr(d.strategies).length} accent={C.teal} />
        <Stat label="Actions" value={actions.length} accent={C.lime} />
        <Stat label="Action CAPEX (total)" value={totalCapex.length ? `${cur}${fmtM(sum(totalCapex))}` : "No data"} sub={`${totalCapex.length} of ${actions.length} actions costed`} accent={C.orange} />
      </div>
      <Section title="Goals and targets" kicker="Measurable goals">
        <Table head={["Code", "Goal", "KPI", "Target", "Year"]} right={[3, 4]} rows={goals.map((g) => [<span className="font-mono">{str(g.code)}</span>, str(g.title), str(g.kpi) || "–", fmtN(val(g.target), 2), str(g.target_year) || str(g.year) || "–"])} />
      </Section>
      {capex.some((c) => isNum(c.total)) && <Section title={`CAPEX by action${currency ? ` (${currency})` : ""}`} kicker="Investment programme">
        <YearChart kind="bar" unit={currency || "currency as supplied"} height={220} data={capex.filter((c) => isNum(c.total)).map((c) => ({ label: c.code, v: c.total }))} series={[{ key: "v", label: "Action CAPEX", color: C.cyan }]} />
        <SourceNote>Source: {sourceOf(actions[0], PROJECTIONS_FILE)}. Supplied values, not recalculated.</SourceNote>
      </Section>}
      <Section title="Action plan" kicker="Who does what, when">
        <Table head={["Code", "Action", "Responsible", "Period", "Funding", "Status", `CAPEX (${cur}M)`]} right={[6]} rows={actions.map((a) => [<span className="font-mono">{str(a.code)}</span>, <div><div className="font-medium">{str(a.title)}</div>{(str(a.expected_effect) || str(a.type) || str(a.intervention_type)) && <div className="text-[11px] text-[#5B6678]">{str(a.expected_effect) || str(a.type) || str(a.intervention_type)}</div>}</div>, str(a.responsible) || str(a.owner) || "–", [str(a.start), str(a.end)].filter(Boolean).join(" – ") || "–", str(a.funding) || "–", str(a.status) ? str(a.status).replace(/_/g, " ") : "–", isNum(actTotal(a)) ? fmtM(actTotal(a)).replace(" M", "") : "–"])} />
      </Section>
    </div>
  );
}

/* ---------------- Module 5 ---------------- */
export function M5View({ data }: { data: unknown }) {
  if (isDemoM5(data)) return <DemoM5View data={data} />;
  return <M5Tcws data={data} />;
}
function M5Tcws({ data }: { data: unknown }) {
  const d = obj(data);
  const { fallback: PROJECTIONS_FILE } = useSourceInfo();
  const bp = obj(d.business_plan);
  const actuals = arr(d.actuals).filter(isR);
  const annual = actuals.filter((a) => !isPartial(a.period));
  const partial = actuals.filter((a) => isPartial(a.period));
  const capexY = yearSeries(bp.capex_by_year_php);
  const capex2629 = capexY.filter((p) => p.year >= 2026 && p.year <= 2029);
  const later = capexY.filter((p) => p.year > 2029);
  const opex = yearSeries(bp.opex_php);
  const req = yearSeries(bp.required_revenue_php);
  const fin = obj(bp.financing);
  const projYears = Array.from(new Set([...opex, ...req].map((p) => p.year))).sort((a, b) => a - b);
  const om = new Map(opex.map((p) => [p.year, p.value])), rm = new Map(req.map((p) => [p.year, p.value]));
  const dep = yearSeries(obj(bp.depreciation).annual_php);
  const cats = Object.entries(obj(bp.capex_by_category_2026_2029_php)).filter(([, v]) => isNum(v)) as [string, number][];
  const projSrc = `${PROJECTIONS_FILE} (${sourceOf(bp, "financial model")})`;
  const hasAny = actuals.length || capexY.length || opex.length || req.length;
  return (
    <div className="space-y-4">
      <ProjectionNotice />
      {hasAny ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat testid="stat-capex" label="CAPEX 2026–2029" value={capex2629.length ? PHP(sum(capex2629.map((p) => p.value))) : "No data"} sub={later.length ? `+ ${later.map((p) => `${fmtM(p.value)} in ${p.year}`).join(", ")}` : undefined} accent={C.cyan} />
        <Stat testid="stat-opex" label={`OPEX ${opex[0]?.year ?? ""}`} value={PHP(opex[0]?.value ?? null)} sub={opex.length > 1 ? `${fmtM(opex.at(-1)!.value)} in ${opex.at(-1)!.year}` : undefined} accent={C.teal} />
        <Stat testid="stat-revenue" label={`Required revenue ${req[0]?.year ?? ""}`} value={PHP(req[0]?.value ?? null)} sub={req.length > 1 ? `${fmtM(req.at(-1)!.value)} in ${req.at(-1)!.year}` : undefined} accent={C.lime} />
        <Stat testid="stat-financing" label="Financing mix" value={isNum(fin.grant_pct) ? `${fmtPct(fin.grant_pct as number, 0)} grant` : "No data"} sub={isNum(fin.loan_pct) ? `Loan ${fmtPct(fin.loan_pct as number, 0)} · equity ${fmtPct(val(fin.equity_pct), 0)}` : undefined} accent={C.orange} />
      </div> : <NoData>No financial figures supplied yet. Unknown values stay unknown.</NoData>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Historical collections and OPEX" kicker="Actuals · PHP per year">
          <YearChart unit="PHP" kind="bar" data={annual.map((a) => ({ label: str(a.year), c: val(a.collections_php), o: val(a.opex_php) }))} series={[{ key: "c", label: "Collections", color: C.cyan }, { key: "o", label: "OPEX", color: C.slate }]} />
          {partial.map((a, i) => <p key={i} className="mt-2 text-[11px] text-[#9A3A05]"><strong>{str(a.year)} ({str(a.period)}), partial year, not plotted:</strong> collections {PHP(val(a.collections_php))}, OPEX {PHP(val(a.opex_php))}.</p>)}
          <SourceNote>Source: {sourceOf(actuals[0], HISTORY_SOURCE)}. OPEX confidence varies by year (see table).</SourceNote>
        </Section>
        <Section title="Projected OPEX and required revenue" kicker="Supplied projection · PHP per year">
          <YearChart unit="PHP" data={projYears.map((y) => ({ label: String(y), r: rm.get(y) ?? null, o: om.get(y) ?? null }))} series={[{ key: "r", label: "Required revenue", color: C.cyan }, { key: "o", label: "OPEX", color: C.orange, dashed: true }]} />
          <SourceNote>Source: {projSrc}.</SourceNote>
        </Section>
        <Section title="CAPEX by year" kicker="Supplied projection · PHP">
          <YearChart unit="PHP" kind="bar" data={capexY.map((p) => ({ label: String(p.year), v: p.value }))} series={[{ key: "v", label: "CAPEX", color: C.teal }]} />
          <SourceNote>Source: {projSrc}.</SourceNote>
        </Section>
        <Section title="CAPEX by category, 2026–2029" kicker="Breakdown · PHP">
          {cats.length ? <div className="space-y-1.5">{cats.sort((a, b) => b[1] - a[1]).map(([k, v]) => { const t = sum(cats.map((c) => c[1])); return (
            <div key={k} className="text-xs"><div className="flex justify-between"><span className="text-[#323D4F]">{k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}</span><span className="tnum text-[#5B6678]">{fmtM(v)} · {fmtPct(v / t)}</span></div><div className="mt-0.5 h-2 overflow-hidden rounded-full bg-[#E3E8EE]"><div className="h-full rounded-full bg-[#1ED3D9]" style={{ width: `${(v / t) * 100}%` }} /></div></div>); })}</div> : <NoData />}
          <SourceNote>Source: {projSrc}.</SourceNote>
        </Section>
      </div>

      <Section title="Historical actuals" kicker="Table">
        <Table head={["Year", "Period", "Collections (PHP)", "OPEX (PHP)", "OPEX basis"]} right={[2, 3]} rows={actuals.map((a) => [str(a.year), str(a.period) || "Jan–Dec", fmtN(val(a.collections_php)), fmtN(val(a.opex_php)), str(a.opex_confidence) || "–"])} />
        <SourceNote>Source: {sourceOf(actuals[0], HISTORY_SOURCE)}.</SourceNote>
      </Section>
      {(opex.length > 0 || dep.length > 0) && <Section title="Projection detail" kicker="PHP per year">
        <YearMatrix unit="PHP M" fmt={(v) => fmtN(v / 1e6, 2)} rows={[{ label: "OPEX", data: bp.opex_php }, { label: "Depreciation", data: obj(bp.depreciation).annual_php }, { label: "Required revenue", data: bp.required_revenue_php }]} />
        <SourceNote>Source: {projSrc}.</SourceNote>
      </Section>}
      <HistoryPanel history={d.history} source={HISTORY_SOURCE} title="Financial history (reviewed)" />
    </div>
  );
}

/* ---------------- Module 6 ---------------- */
function Blocks({ rows }: { rows: unknown }) {
  const r = arr(rows).filter(Array.isArray) as unknown[][];
  return <Table head={["From (m³)", "To (m³)", "PHP/m³"]} right={[0, 1, 2]} rows={r.map((b) => [fmtN(val(b[0])), isNum(b[1]) ? fmtN(b[1]) : "and above", fmtN(val(b[2]), 2)])} />;
}
export function M6View({ data }: { data: unknown }) {
  if (isDemoM6(data)) return <DemoM6View data={data} />;
  return <M6Tcws data={data} />;
}
function M6Tcws({ data }: { data: unknown }) {
  const d = obj(data);
  const { fallback: PROJECTIONS_FILE } = useSourceInfo();
  const cur = obj(d.current_tariff);
  const rt = obj(d.required_tariff);
  const sb = yearSeries(rt.source_basis_php_m3), tv = yearSeries(rt.tcws_volume_only_php_m3);
  const years = Array.from(new Set([...sb, ...tv].map((p) => p.year))).sort((a, b) => a - b);
  const sbm = new Map(sb.map((p) => [p.year, p.value])), tvm = new Map(tv.map((p) => [p.year, p.value]));
  const should = yearSeries(d.should_be_tariff_php_m3);
  const cmp = obj(d.bill_comparison_php_month);
  const providers = Object.keys(cmp).filter((k) => isR(cmp[k]) && k !== "source");
  const prop = obj(d.proposed_tariff);
  const bills = obj(cur.bills_php);
  const aff = obj(d.affordability);
  const src = sourceOf(d.required_tariff, sourceOf(prop, PROJECTIONS_FILE));
  return (
    <div className="space-y-4">
      <ProjectionNotice />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Current minimum charge" value={isNum(cur.minimum_charge_php) ? `PHP ${fmtN(cur.minimum_charge_php as number, 2)}` : "No data"} sub={isNum(cur.minimum_m3) ? `first ${cur.minimum_m3} m³ · effective ${str(cur.effective) || "n/a"}` : undefined} accent={C.cyan} />
        <Stat label="Current bill at 20 m³" value={isNum(bills.m20) ? `PHP ${fmtN(bills.m20 as number, 2)}` : "No data"} sub="per month" accent={C.teal} />
        <Stat label={`Required tariff ${sb[0]?.year ?? ""}`} value={sb.length ? `PHP ${fmtN(sb[0].value, 2)}/m³` : "No data"} sub="model basis" accent={C.lime} />
        <Stat label="Collection rate" value={isNum(val(d.collection_rate)) ? fmtPct(val(d.collection_rate)) : "No data"} sub={val(d.collection_rate) === null ? "Not supplied; not assumed" : undefined} accent={C.orange} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Required tariff projection" kicker="Supplied · PHP/m³">
          <YearChart unit="PHP/m³" fmt={(v) => fmtN(v, 0)} data={years.map((y) => ({ label: String(y), a: sbm.get(y) ?? null, b: tvm.get(y) ?? null }))} series={[{ key: "a", label: "Model basis (all volume)", color: C.cyan }, { key: "b", label: "TCWS volume only", color: C.orange, dashed: true }]} />
          {tv.length > 0 && <p className="mt-2 flex gap-1.5 text-[11px] text-[#9A3A05]"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />The two bases differ materially; this discrepancy is flagged and not approved.</p>}
          <SourceNote>Source: {src}.</SourceNote>
        </Section>
        <Section title="Monthly bill comparison" kicker="PHP per month by consumption">
          <YearChart kind="bar" unit="PHP/month" fmt={(v) => fmtN(v, 0)} data={["m10", "m20", "m30"].map((m) => ({ label: m.replace("m", "") + " m³", ...Object.fromEntries(providers.map((p) => [p, val(obj(cmp[p])[m])])) }))} series={providers.map((p, i) => ({ key: p, label: p.replace(/_/g, " "), color: [C.cyan, C.slate, C.lime, C.orange][i % 4] }))} />
          <SourceNote>Source: {sourceOf(cmp, PROJECTIONS_FILE)}.</SourceNote>
        </Section>
      </div>
      <Section title="Affordability" kicker="Customer impact">
        {str(aff.statement) ? <p className="text-sm text-[#323D4F]">{str(aff.statement)}</p> : <NoData>No affordability statement supplied</NoData>}
        <p className="mt-1 text-[11px] text-[#5B6678]">Household income data: {val(aff.income) === null && !isR(aff.income) ? "not supplied" : "supplied"}.</p>
        {should.length > 0 && <div className="mt-3"><div className="mb-1 text-xs font-semibold text-[#323D4F]">Historical should-be tariff (PHP/m³)</div><YearChart height={150} unit="PHP/m³" fmt={(v) => fmtN(v, 0)} data={should.map((p) => ({ label: String(p.year), v: p.value }))} series={[{ key: "v", label: "Should-be tariff", color: C.teal }]} /></div>}
        <SourceNote>Source: {sourceOf(aff, PROJECTIONS_FILE)}.</SourceNote>
      </Section>
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Current residential blocks" kicker={str(cur.effective) || "Current"}><Blocks rows={cur.blocks_php_m3} /><SourceNote>Source: {sourceOf(cur, PROJECTIONS_FILE)}.</SourceNote></Section>
        {Object.entries(prop).filter(([, v]) => isR(v)).map(([k, v]) => (
          <Section key={k} title={`Proposed ${k.replace(/^y/, "").replace("_", "–")}`} kicker={isNum(obj(v).minimum_charge_php) ? `Minimum PHP ${fmtN(obj(v).minimum_charge_php as number, 2)}` : "Proposed"}><Blocks rows={obj(v).blocks_php_m3} /><SourceNote>Source: {sourceOf(prop, PROJECTIONS_FILE)}.</SourceNote></Section>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Module 7 ---------------- */
const KPI: Record<string, { label: string; unit: string; lower?: boolean }> = {
  water_coverage: { label: "Water service coverage", unit: "%" }, water_quality: { label: "Water quality compliance", unit: "%" },
  water_availability: { label: "Water availability", unit: "hours/day" }, nrw: { label: "Non-revenue water", unit: "%", lower: true },
  water_pressure: { label: "Water pressure", unit: "" }, operating_ratio: { label: "Operating ratio", unit: "ratio" },
  collection_efficiency: { label: "Collection efficiency", unit: "%" }, avg_tariff: { label: "Average tariff", unit: "PHP/m³" },
  staff_per_1000: { label: "Staff per 1,000 connections", unit: "staff", lower: true }, metered_connections: { label: "Metered connections", unit: "%" },
  avg_consumption: { label: "Average consumption", unit: "m³/conn./month" }, desludged_tanks: { label: "Septic tanks desludged", unit: "" },
};
const kpiName = (c: string) => KPI[c]?.label ?? c.replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase());
export function M7View({ data }: { data: unknown }) {
  const d = obj(data);
  const { fallback: PROJECTIONS_FILE } = useSourceInfo();
  const kpis = arr(d.kpis).filter(isR);
  const mon = obj(d.actuals_2025_monthly);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const vol = months.map((m) => ({ label: m, p: val(obj(mon.production_m3)[m]), b: val(obj(mon.billed_m3)[m]) })).filter((x) => x.p !== null || x.b !== null);
  const col = months.map((m) => ({ label: m, v: val(obj(mon.collections_php)[m]) })).filter((x) => x.v !== null);
  const tracking = obj(d.tracking);
  const rows = kpis.map((k) => {
    const code = str(k.code);
    const meta = str(k.name) || str(k.unit) ? { label: str(k.name) || kpiName(code), unit: str(k.unit), lower: str(k.direction) === "down" || str(k.direction) === "lower" } : KPI[code];
    const base = val(k.baseline_value) ?? val(k.baseline);
    const tg = isR(k.annual_targets_improvement) ? obj(k.annual_targets_improvement) : obj(k.targets);
    const tEntries = Object.entries(tg).filter(([, v]) => isNum(v)) as [string, number][];
    const first = tEntries.sort((a, b) => (a[0] === "any" ? 1 : b[0] === "any" ? -1 : Number(a[0]) - Number(b[0])))[0];
    let state: "met" | "gap" | "unknown" = "unknown";
    if (base !== null && first) state = (meta?.lower ? base <= first[1] : base >= first[1]) ? "met" : "gap";
    return { code, meta, base, baseRaw: str(k.baseline), period: str(k.baseline_period) || str(k.baseline_year), tEntries, first, state, k };
  });
  const counts = { met: rows.filter((r) => r.state === "met").length, gap: rows.filter((r) => r.state === "gap").length, unknown: rows.filter((r) => r.state === "unknown").length };
  if (!kpis.length && !vol.length) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="KPIs tracked" value={kpis.length} accent={C.cyan} />
        <Stat label="Baseline meets target" value={counts.met} sub="first target, baseline value" accent={C.lime} />
        <Stat label="Gap to target" value={counts.gap} accent={C.orange} />
        <Stat label="Baseline or target missing" value={counts.unknown} sub="not assessed" accent={C.slate} />
      </div>
      <Section title="KPI monitoring board" kicker="Baseline → target">
        <div className="grid gap-2 md:grid-cols-2">
          {rows.map((r) => {
            const u = r.meta?.unit ?? "";
            const pct = r.base !== null && r.first && r.first[1] !== 0 ? Math.max(0, Math.min(1, r.meta?.lower ? r.first[1] / r.base : r.base / r.first[1])) : null;
            return (
              <div key={r.code} className="rounded-lg border border-[#E3E8EE] p-3 print-avoid" data-testid={`kpi-${r.code}`}>
                <div className="flex items-start justify-between gap-2">
                  <div><div className="text-xs font-semibold text-[#323D4F]">{r.meta?.label ?? kpiName(r.code)}</div><div className="text-[10.5px] text-[#6B7687]">{str(r.k.frequency) || "frequency not set"}{u ? ` · ${u}` : ""}</div></div>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", r.state === "met" ? "bg-[#D9E950] text-[#29323F]" : r.state === "gap" ? "bg-[#FFF1E8] text-[#9A3A05]" : "bg-[#EEF1F5] text-[#5B6678]")}>
                    {r.state === "met" ? <CheckCircle2 className="h-3 w-3" /> : r.state === "gap" ? <AlertTriangle className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}{r.state === "met" ? "On target" : r.state === "gap" ? "Gap" : "Not assessed"}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-3 text-sm tnum">
                  <span><span className="text-[10px] uppercase text-[#6B7687]">Baseline </span><strong className="text-[#323D4F]">{r.base !== null ? fmtN(r.base, 2) : r.baseRaw || "No data"}</strong>{r.period && <span className="text-[10px] text-[#6B7687]"> ({r.period})</span>}</span>
                  <span className="text-[#AEB8C6]">→</span>
                  <span><span className="text-[10px] uppercase text-[#6B7687]">Target </span><strong className="text-[#323D4F]">{r.tEntries.length ? r.tEntries.map(([y, v]) => `${fmtN(v, 2)}${y === "any" ? "" : ` by ${y}`}`).join(" · ") : "Not set"}</strong></span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E3E8EE]" role="progressbar" aria-valuenow={pct === null ? undefined : Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${kpiName(r.code)} progress toward target`}>
                  {pct !== null && <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: r.state === "met" ? C.lime : C.cyan }} />}
                </div>
                {str(r.k.monitoring_method) && <div className="mt-1.5 text-[10.5px] text-[#5B6678]">Method: {str(r.k.monitoring_method)}</div>}
              </div>
            );
          })}
        </div>
        <SourceNote>Source: {sourceOf(d, PROJECTIONS_FILE)}. Progress compares the baseline with the first target; it is not a forecast.</SourceNote>
      </Section>
      {(vol.length > 0 || col.length > 0) && <div className="grid gap-4 lg:grid-cols-2">
        <Section title="2025 monthly volumes" kicker="m³ per month · partial year">
          <YearChart unit="m³" kind="bar" data={vol} series={[{ key: "p", label: "Produced", color: C.slate }, { key: "b", label: "Billed", color: C.cyan }]} />
          <SourceNote>Source: {sourceOf(mon, PROJECTIONS_FILE)}. Monthly data; not comparable with annual totals.</SourceNote>
        </Section>
        <Section title="2025 monthly collections" kicker="PHP per month · partial year">
          <YearChart unit="PHP" data={col} series={[{ key: "v", label: "Collections", color: C.teal }]} />
          <SourceNote>Source: {sourceOf(mon, PROJECTIONS_FILE)}.</SourceNote>
        </Section>
      </div>}
      <Section title="Tracking arrangements" kicker="Governance">
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <div><dt className="font-semibold text-[#323D4F]">Tracking team</dt><dd className="text-[#5B6678]">{Array.isArray(tracking.team) ? arr(tracking.team).map(str).join(", ") || "Not set" : str(tracking.team) || "Not set"}</dd></div>
          <div><dt className="font-semibold text-[#323D4F]">Review cadence</dt><dd className="text-[#5B6678]">{str(tracking.cadence) || "Not set"}</dd></div>
        </dl>
        {str(tracking.gap_note) && <p className="mt-2 text-[11px] text-[#9A3A05]">{str(tracking.gap_note)}</p>}
      </Section>
    </div>
  );
}

/* ---------------- Module 8 ---------------- */
const SEV: Record<string, string> = { high: "bg-[#FF6A0D] text-[#29323F]", medium: "bg-[#FFF1E8] text-[#9A3A05]", low: "bg-[#EEF1F5] text-[#5B6678]" };
export function summaryText(v: unknown): string[] {
  if (typeof v === "string") return v.trim() ? [v] : [];
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  if (isR(v)) return Object.entries(v).filter(([k]) => !/source|loc|file/i.test(k)).map(([k, x]) => (typeof x === "string" && x.trim() ? `${k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}: ${x}` : "")).filter(Boolean);
  return [];
}
export function M8View({ data }: { data: unknown }) {
  const d = obj(data);
  const review = arr(d.data_review).filter(isR);
  const issues = arr(d.open_issues).map(str).filter(Boolean);
  const summ = summaryText(d.executive_summary);
  const events = arr(d.events).filter(isR);
  const bySev = (s: string) => review.filter((r) => str(r.severity).toLowerCase() === s).length;
  return (
    <div className="space-y-4">
      <Section title="Executive summary" kicker="Corrected summary">
        {summ.length ? <div className="space-y-2 text-sm leading-relaxed text-[#323D4F]">{summ.map((p, i) => <p key={i}>{p}</p>)}</div> : <NoData>No executive summary supplied</NoData>}
      </Section>
      {review.length > 0 && <>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="High severity" value={bySev("high")} accent={C.orange} />
          <Stat label="Medium" value={bySev("medium")} accent={C.cyan} />
          <Stat label="Low / other" value={review.length - bySev("high") - bySev("medium")} accent={C.slate} />
        </div>
        <Section title="Data review" kicker="Corrections and open questions">
          <Table testid="table-data-review" head={["ID", "Topic", "Previous", "Supporting evidence", "Severity", "Action"]} rows={review.map((r) => [<span className="font-mono">{str(r.id)}</span>, <span className="font-medium">{str(r.topic)}</span>, str(r.previous) || "–", str(r.supporting) || "–", <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", SEV[str(r.severity).toLowerCase()] ?? SEV.low)}>{str(r.severity) || "n/a"}</span>, str(r.action) || "–"])} />
          <SourceNote>Source: {DATA_REVIEW_FILE}.</SourceNote>
        </Section>
      </>}
      <Section title="Open issues" kicker="To resolve before approval">
        {issues.length ? <ol className="space-y-1.5 text-xs text-[#323D4F]">{issues.map((x, i) => <li key={i} className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF1E8] font-mono text-[10px] text-[#9A3A05]">{i + 1}</span><span className="leading-relaxed">{x}</span></li>)}</ol> : <NoData>No open issues recorded</NoData>}
      </Section>
      {events.length > 0 && <Section title="Dissemination events" kicker="Outreach"><Table head={["Date", "Audience", "Format"]} rows={events.map((e) => [str(e.date) || "–", str(e.audience) || "–", str(e.format) || "–"])} /></Section>}
    </div>
  );
}

/* ---------------- Fixed scenarios ---------------- */
export const FIXED = [
  { key: "conservative", code: "SC-CONSERVATIVE", name: "Conservative", color: C.slate },
  { key: "base", code: "SC-BASE-CASE", name: "Base", color: C.cyan },
  { key: "ambitious", code: "SC-AMBITIOUS", name: "Ambitious", color: C.lime },
] as const;
const matchKey = (s: R) => { const t = `${str(s.type)}|${str(s.name)}`.toLowerCase(); return FIXED.find((f) => str(s.type).toLowerCase() === f.key || str(s.name).toLowerCase() === f.name.toLowerCase() || t.startsWith(f.key + "|"))?.key; };
/** Always returns exactly three scenarios with unique codes. Legacy records are reported separately, never silently merged. */
export function normalizeScenarios(v: unknown): { fixed: R[]; legacy: R[] } {
  const list = arr(v).filter(isR);
  const fixed = FIXED.map((f) => { const m = list.find((s) => matchKey(s) === f.key); return { ...(m ?? { description: "", assumptions: "", is_primary: false }), code: f.code, name: f.name, type: f.key }; });
  const legacy = list.filter((s) => !matchKey(s));
  return { fixed, legacy };
}
export function ScenarioPanel({ value, onChange, readOnly }: { value: unknown; onChange?: (v: R[]) => void; readOnly?: boolean }) {
  const { fixed, legacy } = normalizeScenarios(value);
  const set = (i: number, patch: R) => onChange?.(fixed.map((s, j) => (patch.is_primary === true ? { ...s, is_primary: j === i, ...(j === i ? patch : {}) } : j === i ? { ...s, ...patch } : s)));
  return (
    <div className="space-y-4" data-testid="panel-scenarios">
      <p className="rounded-lg bg-[#E4F8F9] px-3 py-2 text-xs text-[#1F5F63]">Three fixed scenarios. Names cannot be changed, added or removed; only descriptions, assumptions and the primary flag are editable. Saved with Module 1.</p>
      {legacy.length > 0 && <div className="rounded-lg border-l-4 border-[#FF6A0D] bg-[#FFF1E8] p-3 text-xs text-[#9A3A05]" data-testid="text-legacy-scenarios">
        <div className="font-semibold">{legacy.length} earlier scenario record{legacy.length > 1 ? "s" : ""} do not match the fixed set and will be replaced by the three fixed scenarios when Module 1 is saved. Copy anything you want to keep:</div>
        <ul className="mt-1.5 space-y-1">{legacy.map((s, i) => <li key={i}><strong>{str(s.name) || str(s.code)}</strong>{str(s.description) ? `: ${str(s.description)}` : ""}</li>)}</ul>
      </div>}
      <div className="grid gap-3 lg:grid-cols-3">
        {fixed.map((s, i) => {
          const f = FIXED[i];
          const proj = obj(s.projections);
          const hasProj = Object.keys(proj).length > 0;
          return (
            <div key={f.key} className="overflow-hidden rounded-xl border border-[#E3E8EE] bg-white" data-testid={`card-scenario-${f.key}`}>
              <div className="h-1.5" style={{ background: f.color }} />
              <div className="space-y-2.5 p-4">
                <div className="flex items-center justify-between"><div><div className="font-mono text-[10px] text-[#6B7687]">{f.code}</div><div className="text-[15px] font-semibold text-[#323D4F]">{f.name}</div></div>
                  <button type="button" disabled={readOnly} onClick={() => set(i, { is_primary: true })} aria-pressed={!!s.is_primary} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold", s.is_primary ? "bg-[#323D4F] text-[#D9E950]" : "bg-[#EEF1F5] text-[#5B6678] hover:bg-[#E3E8EE]")} data-testid={`button-primary-${f.key}`}><Star className="h-3 w-3" />{s.is_primary ? "Primary" : "Set primary"}</button></div>
                <label className="block text-[11px] font-medium text-[#323D4F]">Description<textarea rows={3} disabled={readOnly} className={cn(inputCls, "mt-1 h-auto py-2 text-xs")} placeholder={readOnly ? "Not described" : "What this scenario represents"} value={str(s.description)} onChange={(e) => set(i, { description: e.target.value })} data-testid={`input-scenario-desc-${f.key}`} /></label>
                <label className="block text-[11px] font-medium text-[#323D4F]">Assumptions<textarea rows={3} disabled={readOnly} className={cn(inputCls, "mt-1 h-auto py-2 text-xs")} placeholder={readOnly ? "Not stated" : "Key assumptions (text only)"} value={str(s.assumptions)} onChange={(e) => set(i, { assumptions: e.target.value })} data-testid={`input-scenario-assumptions-${f.key}`} /></label>
                <div className="rounded-md bg-[#F7F9FB] px-2.5 py-2 text-[11px] text-[#5B6678]">{hasProj ? <>Projections supplied for: {Object.keys(proj).join(", ")}</> : <><strong className="text-[#323D4F]">Projections: unknown.</strong> Not supplied; the Studio does not invent scenario figures.</>}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export const compactFmt = compact;
