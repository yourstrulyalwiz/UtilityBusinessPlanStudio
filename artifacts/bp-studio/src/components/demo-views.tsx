import { obj, arr, isR, isNum, val, str, fmtN, fmtM, fmtPct, Section, Stat, NoData, SourceNote, YearChart, Table, C, useSourceInfo, type R } from "@/components/plan-data";

/** Adapters for the supplied fictional demo package (USD, actuals + "Baseline" / "Improvement" scenarios). Display only; no figures are derived beyond what is supplied. */
export const isDemoM5 = (d: unknown) => isR(obj(d).actuals) && Array.isArray(obj(obj(d).actuals).pl);
export const isDemoM6 = (d: unknown) => Array.isArray(obj(d).comparison) || Array.isArray(obj(obj(d).Baseline).tariff_inputs);

const SCEN = ["Baseline", "Improvement"] as const;
const LINES: Record<string, string> = {
  water_charges: "Water charges", sewage_charges: "Sewage charges", other_revenue: "Other revenue", total_revenue: "Total revenue",
  production_cost: "Production cost", distribution_cost: "Distribution cost", other_operating_expense: "Other operating expense", total_cost_of_operations: "Total cost of operations",
  gross_profit: "Gross profit", sga: "Selling, general and admin.", bad_debt: "Bad debt", other_admin_expense: "Other admin. expense", total_admin: "Total administrative",
  ebitda: "EBITDA", depreciation: "Depreciation", ebit: "EBIT", interest: "Interest", ebt: "Earnings before tax", income_tax: "Income tax", net_income: "Net income",
};
const TOTALS = new Set(["total_revenue", "total_cost_of_operations", "gross_profit", "total_admin", "ebitda", "ebit", "ebt", "net_income"]);

type PL = { year: number; line: string; value: number };
const pl = (block: unknown): PL[] => arr(obj(block).pl).filter(isR).map((r) => ({ year: val(r.year) ?? NaN, line: str(r.line_code), value: val(r.value) ?? NaN })).filter((r) => Number.isFinite(r.year) && Number.isFinite(r.value));
const line = (rows: PL[], code: string) => new Map(rows.filter((r) => r.line === code).map((r) => [r.year, r.value]));

function PLTable({ rows, cur }: { rows: PL[]; cur: string }) {
  const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b);
  const codes = Array.from(new Set(rows.map((r) => r.line)));
  if (!years.length) return <NoData />;
  return <Table head={[`Line (${cur} M)`, ...years]} right={years.map((_, i) => i + 1)} rows={codes.map((c) => { const m = line(rows, c); return [<span className={TOTALS.has(c) ? "font-semibold" : ""}>{LINES[c] ?? c.replace(/_/g, " ")}</span>, ...years.map((y) => (m.has(y) ? fmtN(m.get(y)! / 1e6, 2) : "–"))]; })} />;
}

export function DemoM5View({ data }: { data: unknown }) {
  const d = obj(data);
  const { fallback, currency } = useSourceInfo();
  const cur = currency || "USD";
  const act = pl(d.actuals);
  const sc = Object.fromEntries(SCEN.map((s) => [s, pl(d[s])])) as Record<string, PL[]>;
  const actYears = Array.from(new Set(act.map((r) => r.year))).sort((a, b) => a - b);
  const lastA = actYears.at(-1);
  const at = (code: string) => (lastA === undefined ? null : line(act, code).get(lastA) ?? null);
  const years = Array.from(new Set([...act, ...sc.Baseline, ...sc.Improvement].map((r) => r.year))).sort((a, b) => a - b);
  const series = (code: string) => { const a = line(act, code), b = line(sc.Baseline, code), i = line(sc.Improvement, code); return years.map((y) => ({ label: String(y), a: a.get(y) ?? null, b: b.get(y) ?? null, i: i.get(y) ?? null })); };
  const ser = [{ key: "a", label: "Actuals", color: C.navy }, { key: "b", label: "Baseline (supplied)", color: C.gray, dashed: true }, { key: "i", label: "Improvement (supplied)", color: C.cyan }];
  const cip = (s: string) => arr(obj(d[s]).cip).filter(isR);
  const cipYears = Array.from(new Set(SCEN.flatMap((s) => cip(s).map((r) => val(r.year))).filter(isNum))).sort((a, b) => a - b);
  const fin = obj(obj(d.Improvement).financing);
  const src = `Source: ${fallback}`;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Total revenue ${lastA ?? ""}`} value={isNum(at("total_revenue")) ? `${cur} ${fmtM(at("total_revenue"))}` : "No data"} sub="reported actual" accent={C.cyan} />
        <Stat label={`Cost of operations ${lastA ?? ""}`} value={isNum(at("total_cost_of_operations")) ? `${cur} ${fmtM(at("total_cost_of_operations"))}` : "No data"} sub={isNum(at("total_admin")) ? `+ admin. ${fmtM(at("total_admin"))}` : undefined} accent={C.slate} />
        <Stat label={`EBITDA ${lastA ?? ""}`} value={isNum(at("ebitda")) ? `${cur} ${fmtM(at("ebitda"))}` : "No data"} accent={C.lime} />
        <Stat label="Improvement financing" value={isNum(fin.amount) ? `${cur} ${fmtM(fin.amount as number)}` : "No data"} sub={str(fin.lender) ? `${str(fin.lender)}${isNum(fin.interest_rate) ? ` · ${fmtPct(fin.interest_rate as number)}` : ""}` : undefined} accent={C.orange} />
      </div>
      {str(d.note) && <p className="rounded-lg bg-[#F7F9FB] px-3 py-2 text-xs text-[#5B6678]">{str(d.note)}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Total revenue" kicker={`Reported and supplied · ${cur} per year`}><YearChart unit={cur} data={series("total_revenue")} series={ser} /><SourceNote>{src}. Actuals and scenario projections are separate series.</SourceNote></Section>
        <Section title="Cost of operations" kicker={`Reported and supplied · ${cur} per year`}><YearChart unit={cur} data={series("total_cost_of_operations")} series={ser} /><SourceNote>{src}.</SourceNote></Section>
        <Section title="Net income" kicker={`Reported and supplied · ${cur} per year`}><YearChart unit={cur} kind="bar" data={series("net_income")} series={ser} /><SourceNote>{src}.</SourceNote></Section>
        <Section title="Capital investment" kicker={`Supplied · ${cur} per year`}>
          <YearChart unit={cur} kind="bar" data={cipYears.map((y) => ({ label: String(y), ...Object.fromEntries(SCEN.map((s) => [s, val(cip(s).find((r) => val(r.year) === y)?.total_capex)])) }))} series={[{ key: "Baseline", label: "Baseline", color: C.gray }, { key: "Improvement", label: "Improvement", color: C.cyan }]} />
          <SourceNote>{src}.</SourceNote>
        </Section>
      </div>
      {cip("Improvement").length > 0 && <Section title="Improvement: investment and debt service" kicker={`${cur} M per year`}>
        <Table head={["Year", "CAPEX", "Loans", "Own funds", "Debt service", "DSCR"]} right={[1, 2, 3, 4, 5]} rows={cip("Improvement").map((r: R) => [str(r.year), fmtN((val(r.total_capex) ?? NaN) / 1e6, 2), fmtN((val(r.loans_received) ?? NaN) / 1e6, 2), fmtN((val(r.own_funds) ?? NaN) / 1e6, 2), fmtN((val(r.debt_service) ?? NaN) / 1e6, 2), isNum(val(r.dscr)) ? fmtN(val(r.dscr), 2) : "–"])} />
        <SourceNote>{src}.</SourceNote>
      </Section>}
      <Section title="Income statement: actuals" kicker="Reported"><PLTable rows={act} cur={cur} /><SourceNote>{src}.</SourceNote></Section>
      {SCEN.map((s) => sc[s].length > 0 && <Section key={s} title={`Income statement: ${s} scenario`} kicker="Supplied projection"><PLTable rows={sc[s]} cur={cur} /><SourceNote>{src}.</SourceNote></Section>)}
    </div>
  );
}

export function DemoM6View({ data }: { data: unknown }) {
  const d = obj(data);
  const { fallback, currency } = useSourceInfo();
  const cur = currency || "USD";
  const cmp = arr(d.comparison).filter(isR);
  const aff = arr(d.affordability).filter(isR);
  const years = Array.from(new Set(cmp.map((r) => val(r.year)).filter(isNum))).sort((a, b) => a - b);
  const find = (rows: R[], y: number, s: string) => rows.find((r) => val(r.year) === y && str(r.scenario) === s);
  const affYears = Array.from(new Set(aff.map((r) => val(r.year)).filter(isNum))).sort((a, b) => a - b);
  const thr = val(d.affordability_threshold_pct);
  const inputs = arr(obj(d.Improvement).tariff_inputs).filter(isR);
  const src = `Source: ${fallback}`;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Cost recovery target" value={str(d.cost_recovery_level) || "Not stated"} accent={C.cyan} />
        <Stat label="Affordability threshold" value={thr !== null ? `${fmtN(thr, 1)}% of income` : "Not stated"} accent={C.orange} />
        <Stat label="Customer classes" value={arr(d.classes).length} accent={C.teal} />
        <Stat label="Comparison years" value={years.length ? `${years[0]}–${years.at(-1)}` : "No data"} accent={C.lime} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Required vs. applied tariff" kicker={`Supplied · ${cur}/m³`}>
          <YearChart unit={`${cur}/m³`} fmt={(v) => fmtN(v, 2)} data={years.map((y) => ({ label: String(y), rb: val(find(cmp, y, "Baseline")?.required_tariff_om_plus_debt_usd_m3), ab: val(find(cmp, y, "Baseline")?.applied_avg_tariff_usd_m3), ri: val(find(cmp, y, "Improvement")?.required_tariff_om_plus_debt_usd_m3), ai: val(find(cmp, y, "Improvement")?.applied_avg_tariff_usd_m3) }))}
            series={[{ key: "rb", label: "Required, Baseline", color: C.gray, dashed: true }, { key: "ab", label: "Applied, Baseline", color: C.slate }, { key: "ri", label: "Required, Improvement", color: C.orange, dashed: true }, { key: "ai", label: "Applied, Improvement", color: C.cyan }]} />
          <SourceNote>{src}. Required tariff covers O&amp;M plus debt service, as supplied.</SourceNote>
        </Section>
        <Section title="Bill share of average income" kicker="Supplied · % of household income">
          <YearChart unit="%" fmt={(v) => fmtN(v, 1)} data={affYears.map((y) => ({ label: String(y), b: val(find(aff, y, "Baseline")?.share_avg_income_pct), i: val(find(aff, y, "Improvement")?.share_avg_income_pct), q: val(find(aff, y, "Improvement")?.share_lowest_quintile_pct) }))}
            series={[{ key: "b", label: "Baseline, average", color: C.gray }, { key: "i", label: "Improvement, average", color: C.cyan }, { key: "q", label: "Improvement, lowest quintile", color: C.orange, dashed: true }]} />
          <SourceNote>{src}.{thr !== null ? ` Threshold supplied: ${fmtN(thr, 1)}%.` : ""}</SourceNote>
        </Section>
      </div>
      <Section title="Cost recovery by scenario" kicker="Table">
        <Table head={["Year", "Scenario", `Required (${cur}/m³)`, `Applied (${cur}/m³)`, "Cost recovery"]} right={[2, 3, 4]} rows={cmp.map((r) => [str(r.year), str(r.scenario), fmtN(val(r.required_tariff_om_plus_debt_usd_m3), 3), fmtN(val(r.applied_avg_tariff_usd_m3), 3), isNum(val(r.cost_recovery_ratio)) ? fmtPct(val(r.cost_recovery_ratio)) : "No data"])} />
        <SourceNote>{src}.</SourceNote>
      </Section>
      <Section title="Affordability" kicker="Table">
        <Table head={["Year", "Scenario", `Bill 10 m³ (${cur}/month)`, `Avg. income (${cur}/month)`, "Share avg. (%)", "Share lowest quintile (%)"]} right={[2, 3, 4, 5]} rows={aff.map((r) => [str(r.year), str(r.scenario), fmtN(val(r.typical_bill_10m3_usd), 2), fmtN(val(r.avg_household_income_usd_month)), fmtN(val(r.share_avg_income_pct), 2), fmtN(val(r.share_lowest_quintile_pct), 2)])} />
        <SourceNote>{src}.</SourceNote>
      </Section>
      {inputs.length > 0 && <Section title="Improvement tariff inputs by class" kicker={`${cur}/m³ and ${cur}/month`}>
        <Table head={["Year", "Class", "Connections", "m³/month", `Water (${cur}/m³)`, `Sewer (${cur}/m³)`, `Fixed (${cur}/month)`, "Collection"]} right={[2, 3, 4, 5, 6, 7]} rows={inputs.map((r) => [str(r.year), str(r.customer_class), fmtN(val(r.connections)), fmtN(val(r.avg_consumption_m3_month), 1), fmtN(val(r.tariff_water_usd_m3), 3), fmtN(val(r.tariff_sewer_usd_m3), 3), fmtN(val(r.fixed_charge_usd_month), 2), isNum(val(r.collection_rate)) ? fmtPct(val(r.collection_rate)) : "No data"])} />
        <SourceNote>{src}.</SourceNote>
      </Section>}
    </div>
  );
}
