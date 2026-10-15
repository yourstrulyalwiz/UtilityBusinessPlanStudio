/**
 * Shared presentation model for the business plan document and executive deck.
 * Built only from the plan's saved module data (moduleWorkflow response) and the utility row.
 * Never invents content: anything missing becomes a "Data needed" item.
 */
import { evaluateBaseline, isBaseline } from "@workspace/baseline";
import { MODULE_COLORS, PHASES, phaseOf, T, type StatusKey } from "./theme";

/* eslint-disable @typescript-eslint/no-explicit-any */
type R = Record<string, any>;
export type Conf = "Measured" | "Calculated" | "Estimated" | "Data needed";
export interface Fig { value: string; unit: string; label: string; trend?: "up" | "down" | "flat"; conf: Conf; missing?: boolean }
export interface Series { name: string; values: (number | null)[]; color: string }
export interface Chart { kind: "bar" | "stacked" | "line" | "doughnut" | "hbar"; title: string; labels: string[]; series: Series[]; unit: string; source: string; valueFmt?: "money" | "num" | "pct" }
export interface Tbl { title: string; head: string[]; rows: string[][]; status?: (StatusKey | null)[]; source: string; note?: string }
export interface Visual {
  facts?: { label: string; value: string; unit: string; missing?: boolean }[];
  quotes?: { label: string; text: string }[];
  cards?: { code: string; title: string; text: string }[];
  swot?: { label: string; items: string[] }[];
  cascade?: { label: string; count: number; example: string }[];
  segments?: { n: number; title: string; status: string; done: boolean }[];
  /** Compact chart used on the deck slide instead of a table. */
  deckChart?: Chart;
  charts: Chart[];
  table?: Tbl;
}
export interface Section {
  n: number; title: string; phase: number; phaseName: string; color: string;
  keyMessage: string; figures: Fig[]; visual: Visual; bullets: string[];
  sources: string[]; conf: Conf[]; notes: string[]; hasData: boolean; status: string;
}
export interface Annex { id: string; title: string; tables: Tbl[]; lines?: string[] }
export interface Model {
  utility: { name: string; short: string; country: string; city: string; currency: string; logo?: { buffer: Buffer; mime: string }; logoIssue?: string };
  period: { start: string; end: string; label: string };
  scenario: { code: string; name: string; note: string; primary: boolean };
  scenarioComputed: boolean;
  version: number; author: string; date: string; draft: boolean;
  summary: { messages: string[]; headline: Fig[]; progress: Chart | null; source: string };
  sections: Section[];
  annexes: Annex[];
  investment: { figures: Fig[]; chart: Chart | null; funding: Chart | null; notes: string[]; hasData: boolean };
  tariff: { figures: Fig[]; chart: Chart | null; bills: Chart | null; notes: string[]; hasData: boolean };
  decisions: { issues: string[]; steps: { what: string; owner: string; date: string }[]; notes: string[] };
  missing: { module: number; item: string }[];
  defaultSource: string;
}

/* ---------- helpers ---------- */
export const isR = (v: unknown): v is R => !!v && typeof v === "object" && !Array.isArray(v);
const obj = (v: unknown): R => (isR(v) ? v : {});
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const val = (v: unknown): number | null => (isNum(v) ? v : isR(v) && isNum(v.value) ? v.value : null);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : isNum(v) ? String(v) : "");
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const NEED = "Data needed";

export function yearSeries(v: unknown): { year: number; value: number }[] {
  return Object.entries(obj(v)).map(([k, x]) => ({ year: Number(String(k).replace(/^y/, "")), value: val(x) }))
    .filter((p): p is { year: number; value: number } => Number.isInteger(p.year) && p.year > 1900 && p.value !== null).sort((a, b) => a.year - b.year);
}
/** Cap to n words at a word boundary. */
export function cap(s: string, n: number): string {
  const w = str(s).replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (w.length <= n) return w.join(" ");
  return w.slice(0, n).join(" ").replace(/[,;:.\-–]+$/, "") + "…";
}
export const wordCount = (s: string) => str(s).split(/\s+/).filter(Boolean).length;
const sentences = (s: string) => str(s).replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((x) => x.trim()).filter(Boolean);

const nf = (d: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: d });
/** Rounded display: millions with "M", one decimal for percent. */
export function fmt(v: number | null | undefined, kind: "money" | "num" | "pct" | "pct100" | "dec" = "num"): string {
  if (!isNum(v)) return NEED;
  if (kind === "pct") return nf(1).format(v * 100);
  if (kind === "pct100") return nf(1).format(v);
  if (kind === "dec") return nf(2).format(v);
  const a = Math.abs(v);
  if (a >= 1e9) return `${nf(1).format(v / 1e9)} B`;
  if (a >= 1e6) return `${nf(1).format(v / 1e6)} M`;
  if (kind === "money" && a >= 1e4) return `${nf(0).format(v)}`;
  return nf(a < 10 ? 2 : a < 100 ? 1 : 0).format(v);
}
const titleCase = (k: string) => k.replace(/^y(?=\d)/, "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const KPI: Record<string, { label: string; unit: string; lower?: boolean }> = {
  water_coverage: { label: "Water service coverage", unit: "%" }, water_quality: { label: "Water quality compliance", unit: "%" },
  water_availability: { label: "Water availability", unit: "hours/day" }, nrw: { label: "Non-revenue water", unit: "%", lower: true },
  water_pressure: { label: "Water pressure", unit: "" }, operating_ratio: { label: "Operating ratio", unit: "ratio", lower: true },
  collection_efficiency: { label: "Collection efficiency", unit: "%" }, avg_tariff: { label: "Average tariff", unit: "CUR/m³" },
  staff_per_1000: { label: "Staff per 1,000 connections", unit: "staff", lower: true }, metered_connections: { label: "Metered connections", unit: "%" },
  avg_consumption: { label: "Average consumption", unit: "m³/conn./month" }, desludged_tanks: { label: "Septic tanks desludged", unit: "" },
  collection: { label: "Collection ratio", unit: "%" }, connections: { label: "Service connections", unit: "connections" },
};

/* ---------- main builder ---------- */
export interface BuildInput { workflow: any; utility: any; scenario: any; version: number; author: string; date: string }

export function buildModel(inp: BuildInput): Model {
  const wf = obj(inp.workflow), ut = obj(inp.utility), ctx = obj(wf.context);
  const cPlan = obj(ctx.plan), cUt = obj(ctx.utility), meta = obj(ctx.meta);
  const mods: R[] = arr(wf.modules).filter(isR);
  const mod = (n: number) => mods.find((m) => m.number === n) ?? { number: n, title: `Module ${n}`, status: "not_started", data: {} };
  const D = (n: number) => obj(mod(n).data);
  const currency = str(ut.currency) || str(cPlan.currency) || str(cUt.currency) || str(obj(ctx.meta).currency);
  const CUR = currency || "currency";
  const missing: { module: number; item: string }[] = [];
  const need = (module: number, item: string) => { if (!missing.some((x) => x.module === module && x.item === item)) missing.push({ module, item }); };
  const defaultSource = str(wf.source).replace(/^Source:\s*/i, "") || "Plan data entered in Business Plan Studio";
  const srcNames = obj(meta.sources);
  const srcOf = (v: unknown, fb = defaultSource): string => {
    const s = obj(obj(v).source).file ?? obj(v).source;
    const codes = str(s).split(/[;,\s]+/).filter(Boolean);
    const names = codes.map((c) => str(srcNames[c]) || c).filter(Boolean);
    return names.length ? Array.from(new Set(names)).join("; ") : fb;
  };
  const unitCur = (u: string) => u.replace(/\bPhP\b|\bPHP\b|\bCUR\b/g, CUR);

  /* scenario: one block only, never mixed */
  const scen = obj(inp.scenario);
  const scName = str(scen.name) || "Base", scCode = str(scen.code) || "SC-BASE", scType = str(scen.type);
  const scKeys = [scName, scCode, scType].filter(Boolean).map((s) => s.toLowerCase());
  let scenarioFallback = false, scenarioUncomputed = false;
  // The supplied plan case ("Improvement"/plan block or untagged plan data) is the primary scenario only.
  const isPrimary = scen.is_primary === true || (scen.is_primary === undefined && /base/i.test(`${scType} ${scCode} ${scName}`));
  const NONE: { block: R; label: string } = { block: {}, label: "" };
  const pickBlock = (d: R): { block: R; label: string } => {
    const keys = Object.keys(d);
    const direct = keys.find((k) => scKeys.includes(k.toLowerCase()));
    if (direct && isR(d[direct])) return { block: d[direct], label: direct };
    const nested = obj(d.scenarios);
    const nk = Object.keys(nested).find((k) => scKeys.includes(k.toLowerCase()));
    if (nk && isR(nested[nk])) return { block: nested[nk], label: nk };
    const plan = keys.find((k) => /^improvement$|^plan$|^with_plan$/i.test(k));
    if (!isPrimary) { if (plan || Object.keys(d).length) scenarioUncomputed = true; return NONE; }
    if (plan && isR(d[plan])) { scenarioFallback = true; return { block: d[plan], label: plan }; }
    return { block: d, label: "" };
  };
  const rowsFor = (rows: R[], label: string) => {
    const tagged = rows.filter((r) => str(r.scenario));
    if (!tagged.length) { if (!isPrimary && rows.length) { scenarioUncomputed = true; return []; } return rows; }
    const hit = rows.filter((r) => scKeys.includes(str(r.scenario).toLowerCase()));
    if (hit.length) return hit;
    if (!isPrimary) { scenarioUncomputed = true; return []; }
    scenarioFallback = true;
    return rows.filter((r) => str(r.scenario).toLowerCase() === label.toLowerCase() || /^improvement$|^plan$/i.test(str(r.scenario)));
  };

  /* period */
  const yearsInData: number[] = [];
  const start = val(cPlan.horizon_start) ?? val(cPlan.plan_year) ?? (isNum(ut.planYear) && ut.planYear > 0 ? ut.planYear : null);
  const end = val(cPlan.horizon_end);
  const short = str(ut.shortName) || str(cUt.short_name) || str(ut.name) || str(wf.utilityName);
  const name = str(ut.name) || str(wf.utilityName) || short;

  /* ===== M1 Profile ===== */
  const m1d = D(1);
  const base = isBaseline(m1d) ? evaluateBaseline(m1d as any) : null;
  const bv = (id: string): number | null => (base ? (isNum((m1d as any).variables?.[id]) ? (m1d as any).variables[id] : isNum(base.derived[id]) ? base.derived[id] as number : null) : null);
  const hist = arr(m1d.history).filter(isR);
  const histLast = (re: RegExp, unitRe?: RegExp) => {
    const rows = hist.filter((h) => re.test(str(h.metric)) && /^\d{4}$/.test(String(h.year)) && isNum(h.value) && (!unitRe || unitRe.test(str(h.unit))));
    rows.sort((a, b) => Number(a.year) - Number(b.year));
    return rows.at(-1) ?? null;
  };
  const prof = obj(D(1).profile);
  const connH = histLast(/^Service connections – total/i);
  const staffH = histLast(/^Staff/i);
  const connections = bv("v10") ?? val(connH?.value) ?? val(obj(prof.connections_2025).total);
  const popServed = bv("v56") ?? val(prof.population_served);
  const popArea = bv("v6");
  const staff = bv("v48") ?? val(staffH?.value) ?? val(obj(prof.staff).total);
  const prodVol = bv("v15") ?? val(histLast(/^Production volume$/i)?.value);
  const serviceArea = str(ut.serviceArea) || str(cUt.city_service_area) || str(prof.service_area);
  const waterSource = str(prof.water_source) || str(cUt.water_source);
  const refYear = str(m1d.referenceYear) || (connH ? String(connH.year) : "");
  const m1Src = base && (m1d as any).importedWorkbook ? "Baseline workbook (Module 1)" : srcOf(m1d);
  const m1conf: Conf = connections !== null ? "Measured" : "Data needed";
  const cov = base?.indicators.find((i: any) => i.row === 11)?.value ?? null;
  const facts = [
    { label: "Service area", value: serviceArea || NEED, unit: "", missing: !serviceArea },
    { label: "People served", value: fmt(popServed), unit: popServed !== null ? "people" : "", missing: popServed === null },
    { label: "Water connections", value: fmt(connections), unit: connections !== null ? `connections${refYear ? `, ${refYear}` : ""}` : "", missing: connections === null },
    { label: "Water sources", value: waterSource ? cap(waterSource, 8) : prodVol !== null ? fmt(prodVol) : NEED, unit: waterSource ? "" : prodVol !== null ? "m³ produced per year" : "", missing: !waterSource && prodVol === null },
    { label: "Staff", value: fmt(staff), unit: staff !== null ? "employees" : "", missing: staff === null },
  ];
  facts.filter((f) => f.missing).forEach((f) => need(1, f.label));
  // Only figures that come from the module itself count as data (registry service area does not).
  const m1HasData = [connections, popServed, staff, prodVol].some((v) => v !== null) || !!str(prof.service_area) || !!str(prof.water_source);
  const m1: Section = sec(1, {
    keyMessage: connections !== null
      ? cap(`${short} serves ${popServed !== null ? `${fmt(popServed)} people through ` : ""}${fmt(connections)} water connections${serviceArea ? ` in ${serviceArea}` : ""}.`, 25)
      : "Core profile figures are still needed before the plan can be read with confidence.",
    figures: [
      fig(connections, "connections", "Water connections", "num", m1conf, 1),
      fig(popServed, "people", "People served", "num", bv("v56") !== null ? "Calculated" : popServed !== null ? "Measured" : "Data needed", 1),
      cov !== null ? { value: fmt(cov, "pct"), unit: "%", label: "Water coverage", conf: "Calculated" } : fig(staff, "employees", "Staff", "num", staff !== null ? "Measured" : "Data needed", 1),
    ],
    visual: { facts, charts: [] },
    bullets: [
      popArea !== null ? `Service area population: ${fmt(popArea)} people (last census).` : "",
      str(cUt.operator_type) ? `Operator: ${cap(str(cUt.operator_type), 12)}.` : "",
      base ? `${base.indicators.filter((i: any) => i.value !== null).length} of ${base.indicators.length} baseline indicators can be calculated.` : "",
      refYear ? `Reference year for baseline figures: ${refYear}.` : "",
    ],
    sources: [m1Src], hasData: m1HasData,
    notes: base ? base.indicators.filter((i: any) => i.missing.length).slice(0, 3).map((i: any) => `${i.name}: inputs missing (${i.missing.join(", ")}).`) : [],
  });

  /* ===== M2 Vision ===== */
  const m2d = D(2);
  const objectives = arr(m2d.objectives).filter(isR);
  const vision = str(m2d.vision), mission = str(m2d.mission);
  if (!vision) need(2, "Vision statement"); if (!mission) need(2, "Mission statement"); if (!objectives.length) need(2, "Strategic objectives");
  const objText = (o: R) => str(o.smart) || str(o.specific) || str(obj(o.smart).specific) || str(o.target);
  const owned = objectives.filter((o) => str(o.owner)).length;
  const m2: Section = sec(2, {
    keyMessage: objectives.length ? cap(`${objectives.length} strategic objectives turn the vision into commitments the utility will be measured against.`, 25) : vision ? cap(vision, 25) : "Vision, mission and objectives still need to be agreed.",
    figures: [
      { value: objectives.length ? String(objectives.length) : NEED, unit: "objectives", label: "Strategic objectives", conf: objectives.length ? "Measured" : "Data needed", missing: !objectives.length },
      { value: objectives.length ? `${owned}/${objectives.length}` : NEED, unit: "with owner", label: "Objectives with an owner", conf: objectives.length ? "Measured" : "Data needed", missing: !objectives.length },
      { value: arr(m2d.values).length ? String(arr(m2d.values).length) : NEED, unit: "values", label: "Core values", conf: arr(m2d.values).length ? "Measured" : "Data needed", missing: !arr(m2d.values).length },
    ],
    visual: {
      quotes: [{ label: "Vision", text: vision || NEED }, { label: "Mission", text: mission || NEED }],
      cards: objectives.slice(0, 6).map((o, i) => ({ code: str(o.code) || `OBJ-${i + 1}`, title: cap(str(o.title), 8), text: cap(objText(o), 15) })),
      charts: [],
    },
    bullets: [
      arr(m2d.values).length ? `Values: ${arr(m2d.values).map(str).slice(0, 5).join(", ")}.` : "",
      str(obj(m2d.sign_off).decision) ? `Sign-off: ${str(obj(m2d.sign_off).decision)}${str(obj(m2d.sign_off).date) ? ` on ${str(obj(m2d.sign_off).date)}` : ""}.` : "",
      objectives.length && owned < objectives.length ? `${objectives.length - owned} objectives still need a named owner.` : "",
    ],
    sources: [srcOf(m2d)], hasData: !!(vision || mission || objectives.length),
    notes: objectives.slice(6).map((o) => `${str(o.code)} ${str(o.title)}`),
  });
  if (objectives.length && owned < objectives.length) need(2, "Owners for all objectives");

  /* ===== M3 Baseline and SWOT ===== */
  const m3d = D(3);
  const swotD = obj(m3d.swot);
  const swotItems = (k: string) => arr(swotD[k]).map((x) => (isR(x) ? { t: str(x.text), p: val(x.priority) ?? 9 } : { t: Array.isArray(x) ? str(x[0]) : str(x), p: 9 }))
    .filter((x) => x.t).sort((a, b) => a.p - b.p).map((x) => x.t);
  const quad = ["strengths", "weaknesses", "opportunities", "threats"];
  const swot = quad.map((k) => ({ label: titleCase(k), items: swotItems(k).slice(0, 3).map((t) => cap(t, 12)) }));
  if (swot.every((q) => !q.items.length)) need(3, "SWOT analysis");
  // most critical indicator trend: NRW first, then lowest-level indicator series
  let trend: Chart | null = null;
  const nrwHist = hist.filter((h) => /^non-revenue water/i.test(str(h.metric)) && /^\d{4}$/.test(String(h.year)) && isNum(h.value)).sort((a, b) => a.year - b.year);
  const bi = arr(m3d.baseline_indicators).filter(isR);
  const histSeries = (rows: R[], metric: string, unit: string, src: string): Chart => ({
    kind: "line", title: "", labels: rows.map((r) => String(r.year)), unit, source: src, valueFmt: unit === "%" ? "num" : "num",
    series: [{ name: metric, values: rows.map((r) => r.value as number), color: T.cyan }],
  });
  if (nrwHist.length >= 2) {
    const first = nrwHist[0], last = nrwHist.at(-1)!;
    trend = histSeries(nrwHist, "Non-revenue water", "%", HISTSRC(m1Src));
    trend.title = `Non-revenue water moved from ${fmt(first.value, "pct100")}% in ${first.year} to ${fmt(last.value, "pct100")}% in ${last.year}`;
  } else {
    const cand = bi.map((b) => ({ b, s: yearSeries(b.values) })).filter((x) => x.s.length >= 2);
    const pick = cand.find((x) => /nrw|non-revenue/i.test(str(x.b.name) + str(x.b.code))) ?? cand[0];
    if (pick) {
      const nm = str(pick.b.name) || str(pick.b.code);
      const u = unitCur(str(pick.b.unit));
      trend = { kind: "line", title: `${nm}: ${fmt(pick.s[0].value)} in ${pick.s[0].year} to ${fmt(pick.s.at(-1)!.value)} in ${pick.s.at(-1)!.year}`, labels: pick.s.map((p) => String(p.year)), unit: u, source: srcOf(m3d), series: [{ name: nm, values: pick.s.map((p) => p.value), color: T.cyan }] };
    }
  }
  if (!trend) need(3, "Indicator history (two or more years) for the trend chart");
  const messages = arr(m3d.messages).filter(isR);
  const areas = arr(m3d.areas).filter(isR);
  const weakAreas = areas.filter((a) => /weak|low|critical|elementary|basic/i.test(str(a.status)));
  const m3: Section = sec(3, {
    keyMessage: cap(str(messages.find((m) => /overall/i.test(str(m.type)))?.text) || (trend ? trend.title : swot[1].items[0] ? `Main weakness: ${swot[1].items[0]}` : "The baseline assessment still needs data."), 25),
    figures: [
      nrwHist.length ? { value: fmt(nrwHist.at(-1)!.value, "pct100"), unit: "%", label: `Non-revenue water, ${nrwHist.at(-1)!.year}`, conf: "Measured", trend: nrwHist.length > 1 ? dir(nrwHist.at(-2)!.value, nrwHist.at(-1)!.value) : undefined } : fig(null, "%", "Non-revenue water", "pct100", "Data needed", 3),
      { value: String(swotItems("weaknesses").length), unit: "items", label: "Weaknesses identified", conf: swotItems("weaknesses").length ? "Measured" : "Data needed", missing: !swotItems("weaknesses").length },
      { value: areas.length ? `${areas.filter((a) => !/not assessed/i.test(str(a.status))).length}/${areas.length}` : NEED, unit: "areas", label: "Assessment areas rated", conf: areas.length ? "Measured" : "Data needed", missing: !areas.length },
    ],
    visual: { swot, charts: trend ? [trend] : [] },
    bullets: [
      ...messages.filter((m) => !/overall/i.test(str(m.type))).slice(0, 3).map((m) => cap(str(m.text), 15)),
      weakAreas.length ? `Weakest areas: ${weakAreas.slice(0, 3).map((a) => str(a.area)).join(", ")}.` : "",
    ],
    sources: [srcOf(m3d), ...(nrwHist.length ? [HISTSRC(m1Src)] : [])], hasData: !!(trend || swot.some((q) => q.items.length) || areas.some((a) => str(a.status) && !/not assessed/i.test(str(a.status)))),
    notes: quad.flatMap((k) => swotItems(k).slice(3, 4).map((t) => `${titleCase(k)} also include: ${cap(t, 15)}`)),
  });

  /* ===== M4 Goals and actions ===== */
  const m4d = D(4);
  const goals = arr(m4d.goals).filter(isR), strategies = arr(m4d.strategies).filter(isR), actions = arr(m4d.actions).filter(isR);
  const actCost = (a: R): number | null => {
    const k = Object.keys(a).find((x) => /^total_capex/.test(x) && isNum(a[x]));
    if (k) return a[k];
    const ck = Object.keys(a).find((x) => /^capex_by_year/.test(x));
    const ys = ck ? yearSeries(a[ck]) : [];
    return ys.length ? sum(ys.map((p) => p.value)) : null;
  };
  const costed = actions.map((a) => ({ a, c: actCost(a) })).filter((x) => x.c !== null) as { a: R; c: number }[];
  const capexTotal = costed.length ? sum(costed.map((x) => x.c)) : null;
  if (!goals.length) need(4, "Goals"); if (!actions.length) need(4, "Actions"); if (actions.length && costed.length < actions.length) need(4, `Cost for ${actions.length - costed.length} actions`);
  const top = [...costed].sort((x, y) => y.c - x.c).slice(0, 5);
  const m4: Section = sec(4, {
    keyMessage: actions.length ? cap(`${actions.length} actions${capexTotal !== null ? ` worth ${CUR} ${fmt(capexTotal, "money")}` : ""} deliver ${goals.length} goals across ${objectives.length || "the"} objectives.`, 25) : "Goals, strategies and actions still need to be defined.",
    figures: [
      fig(capexTotal, CUR, "Action investment (total)", "money", capexTotal !== null ? "Estimated" : "Data needed", 4),
      { value: actions.length ? String(actions.length) : NEED, unit: "actions", label: "Actions planned", conf: actions.length ? "Measured" : "Data needed", missing: !actions.length },
      { value: goals.length ? String(goals.length) : NEED, unit: "goals", label: "Measurable goals", conf: goals.length ? "Measured" : "Data needed", missing: !goals.length },
    ],
    visual: {
      cascade: [
        { label: "Objective", count: objectives.length, example: cap(str(objectives[0]?.title), 6) },
        { label: "Goal", count: goals.length, example: cap(str(goals[0]?.title), 6) },
        { label: "Strategy", count: strategies.length, example: cap(str(strategies[0]?.title), 6) },
        { label: "Action", count: actions.length, example: cap(str(actions[0]?.title), 6) },
      ],
      charts: top.length ? [{ kind: "hbar", title: `Top ${top.length} actions account for ${capexTotal ? fmt(sum(top.map((t) => t.c)) / capexTotal, "pct") : "?"}% of action investment`, labels: top.map((t) => `${str(t.a.code)} ${cap(str(t.a.title), 5)}`), unit: CUR, source: srcOf(actions[0], srcOf(m4d)), valueFmt: "money", series: [{ name: "Investment", values: top.map((t) => t.c), color: T.cyan }] }] : [],
      table: top.length ? undefined : undefined,
    },
    bullets: [
      ...top.slice(0, 3).map((t) => `${str(t.a.code)}: ${cap(str(t.a.title), 8)}, ${CUR} ${fmt(t.c, "money")}.`),
      actions.filter((a) => !str(a.owner) && !str(a.responsible)).length ? `${actions.filter((a) => !str(a.owner) && !str(a.responsible)).length} actions still lack a responsible owner.` : "",
    ],
    sources: [srcOf(actions[0], srcOf(m4d))], hasData: !!(goals.length || actions.length),
    notes: costed.length < actions.length ? [`${actions.length - costed.length} actions have no cost estimate yet.`] : [],
  });

  /* ===== M5 Financial plan ===== */
  const m5d = D(5);
  const { block: fb, label: fLabel } = pickBlock(m5d);
  const bp = obj(fb.business_plan ?? (isPrimary ? m5d.business_plan : undefined));
  const cip = arr(fb.cip).filter(isR);
  const pl = arr(fb.pl).filter(isR);
  let capexChart: Chart | null = null, opexChart: Chart | null = null;
  let capexSum: number | null = null;
  let m5Src = srcOf(bp, srcOf(m5d));
  const est: Conf = "Estimated";
  if (cip.length && cip.some((c) => isNum(c.total_capex))) {
    const ys = cip.filter((c) => isNum(c.year)).sort((a, b) => a.year - b.year);
    const catKeys = Object.keys(ys[0] ?? {}).filter((k) => /^capex_/.test(k) && ys.some((y) => isNum(y[k]) && y[k] > 0));
    const cols = [T.cyan, T.slate, T.gray];
    capexSum = sum(ys.map((y) => val(y.total_capex) ?? 0));
    capexChart = { kind: "stacked", title: `${CUR} ${fmt(capexSum, "money")} of investment over ${ys[0].year}–${ys.at(-1)!.year}`, labels: ys.map((y) => String(y.year)), unit: CUR, source: m5Src, valueFmt: "money",
      series: (catKeys.length ? catKeys : ["total_capex"]).slice(0, 3).map((k, i) => ({ name: titleCase(k.replace(/^capex_/, "")), values: ys.map((y) => val(y[k])), color: cols[i] })) };
  } else {
    const cy = yearSeries(bp.capex_by_year_php ?? bp.capex_by_year ?? fb.capex_by_year);
    if (cy.length) {
      capexSum = sum(cy.map((p) => p.value));
      capexChart = { kind: "stacked", title: `${CUR} ${fmt(capexSum, "money")} of investment over ${cy[0].year}–${cy.at(-1)!.year}`, labels: cy.map((p) => String(p.year)), unit: CUR, source: m5Src, valueFmt: "money", series: [{ name: "Investment (CAPEX)", values: cy.map((p) => p.value), color: T.cyan }] };
    }
  }
  if (!capexChart) need(5, "Investment (CAPEX) by year");
  // OPEX structure
  const opexLinesKey = Object.keys(bp).find((k) => /^opex_lines/.test(k));
  let opexParts: [string, number][] = [];
  let opexYear = "";
  if (opexLinesKey) { opexParts = Object.entries(obj(bp[opexLinesKey])).filter(([, v]) => isNum(v) && (v as number) > 0) as [string, number][]; opexYear = (opexLinesKey.match(/\d{4}/) ?? [""])[0]; }
  else if (pl.length) {
    const yrs = Array.from(new Set(pl.map((p) => p.year).filter(isNum))).sort();
    const y = yrs.find((x) => !end || x <= end) !== undefined ? yrs.filter((x) => !end || x <= end).at(-1) : yrs.at(-1);
    opexYear = String(y ?? "");
    const lines = ["production_cost", "distribution_cost", "other_operating_expense", "sga", "bad_debt", "other_admin_expense"];
    opexParts = lines.map((l) => [titleCase(l).replace(/^Sga$/, "Selling, general and administrative"), val(pl.find((p) => p.year === y && p.line_code === l)?.value)] as [string, number | null]).filter((x): x is [string, number] => isNum(x[1]) && x[1] > 0);
  }
  if (opexParts.length) {
    opexParts.sort((a, b) => b[1] - a[1]);
    const head = opexParts.slice(0, 3), rest = opexParts.slice(3);
    if (rest.length) head.push(["Other", sum(rest.map((r) => r[1]))]);
    const tot = sum(head.map((h) => h[1]));
    opexChart = { kind: "doughnut", title: `${titleCase(head[0][0])} is the largest operating cost at ${fmt(head[0][1] / tot, "pct")}%`, labels: head.map((h) => titleCase(h[0])), unit: CUR, source: m5Src, valueFmt: "money",
      series: [{ name: `OPEX ${opexYear}`, values: head.map((h) => h[1]), color: T.cyan }] };
  } else need(5, "OPEX structure by line");
  const fin = obj(fb.financing ?? bp.financing);
  const finAmt = val(fin.amount);
  const finText = finAmt !== null ? `${CUR} ${fmt(finAmt, "money")}${str(fin.lender) ? ` ${cap(str(fin.lender), 6)}` : ""}` : isNum(fin.grant_pct) ? `${fmt(fin.grant_pct, "pct")}% grant, ${fmt(val(fin.loan_pct), "pct")}% loan` : "";
  if (!finText) need(5, "Financing plan");
  const reqRev = yearSeries(bp.required_revenue_php ?? bp.required_revenue);
  const ebitda = pl.filter((p) => p.line_code === "ebitda" && isNum(p.value)).sort((a, b) => a.year - b.year);
  const dscr = cip.filter((c) => isNum(c.dscr)).sort((a, b) => a.year - b.year);
  const m5has = !!(capexChart || opexChart || finText);
  const m5: Section = sec(5, {
    keyMessage: capexSum !== null ? cap(`The plan invests ${CUR} ${fmt(capexSum, "money")}${finText ? `, financed by ${finText}` : ""}.`, 25) : "The investment and operating cost plan still needs figures.",
    figures: [
      fig(capexSum, CUR, "Total investment (CAPEX)", "money", capexSum !== null ? est : "Data needed", 5),
      opexParts.length ? { value: fmt(sum(opexParts.map((p) => p[1])), "money"), unit: CUR, label: `Operating cost ${opexYear}`, conf: est } : fig(null, CUR, "Operating cost", "money", "Data needed", 5),
      dscr.length ? { value: fmt(dscr.at(-1)!.dscr, "dec"), unit: "x", label: `Debt service coverage ${dscr.at(-1)!.year}`, conf: "Calculated", trend: dir(dscr[0].dscr, dscr.at(-1)!.dscr) }
        : reqRev.length ? { value: fmt(reqRev[0].value, "money"), unit: CUR, label: `Required revenue ${reqRev[0].year}`, conf: est } : fig(null, "", "Debt service or required revenue", "num", "Data needed", 5),
    ],
    visual: { charts: [capexChart, opexChart].filter(Boolean) as Chart[] },
    bullets: [
      finText ? `Financing: ${finText}.` : "",
      ebitda.length ? `EBITDA reaches ${CUR} ${fmt(ebitda.at(-1)!.value, "money")} in ${ebitda.at(-1)!.year}.` : "",
      isNum(val(fin.interest_rate)) ? `Interest rate ${fmt(val(fin.interest_rate), "pct")}%${isNum(fin.repayment_years) ? ` over ${fin.repayment_years} years` : ""}.` : "",
      str(m5d.note) ? cap(str(m5d.note), 15) : "",
    ],
    sources: [m5Src], hasData: m5has,
    notes: fLabel ? [`Figures from the "${fLabel}" block of Module 5.`] : [],
  });

  /* ===== M6 Tariffs ===== */
  const m6d = D(6);
  const { label: tLabel } = pickBlock(m6d);
  const cmpRows = rowsFor(arr(m6d.comparison).filter(isR), tLabel || fLabel || "Improvement");
  const affRows = rowsFor(arr(m6d.affordability).filter(isR), tLabel || fLabel || "Improvement");
  const kf = (r: R, re: RegExp) => { const k = Object.keys(r).find((x) => re.test(x)); return k ? val(r[k]) : null; };
  let current: number | null = null, required: number | null = null, proposed: number | null = null;
  let tYear = "";
  // Current tariff/bills are actuals (kept for every scenario); required/proposed are forecasts of the plan case (primary only).
  if (!isPrimary && (m6d.required_tariff || m6d.proposed_tariff || m6d.bill_comparison_php_month || m6d.bill_comparison)) scenarioUncomputed = true;
  const cur6 = obj(m6d.current_tariff), rt = obj(isPrimary ? m6d.required_tariff : null), prop = obj(isPrimary ? m6d.proposed_tariff : null);
  let m6Src = srcOf(m6d);
  if (cmpRows.length) {
    const sorted = [...cmpRows].sort((a, b) => a.year - b.year);
    const first = sorted[0], last = sorted.at(-1)!;
    current = kf(first, /^applied_avg_tariff/); required = kf(last, /^required_tariff/); proposed = kf(last, /^applied_avg_tariff/);
    tYear = `${first.year}–${last.year}`;
  } else {
    const req = yearSeries(rt.source_basis_php_m3 ?? rt.required_php_m3 ?? rt.by_year);
    required = req[0]?.value ?? null; tYear = req[0] ? String(req[0].year) : "";
    current = val(cur6.avg_tariff_php_m3) ?? val(cur6.average_php_m3) ?? null;
    m6Src = srcOf(rt, srcOf(prop, m6Src));
  }
  const tariffChart: Chart | null = [current, required, proposed].some(isNum) ? {
    kind: "bar", title: required !== null && current !== null ? `The tariff must move from ${fmt(current, "dec")} to ${fmt(required, "dec")} ${CUR}/m³ to recover costs` : "Current, required and proposed average tariff",
    labels: ["Current", "Required", "Proposed"], unit: `${CUR}/m³`, source: m6Src, valueFmt: "num",
    series: [{ name: "Average tariff", values: [current, required, proposed], color: T.cyan }],
  } : null;
  if (current === null) need(6, "Current average tariff per m³"); if (required === null) need(6, "Required (cost-recovery) tariff"); if (proposed === null) need(6, "Proposed tariff");
  // bills at 10/20/30 m3
  let bills: Chart | null = null; let billConf: Conf = "Measured";
  const curBills = obj(cur6.bills_php ?? cur6.bills);
  const cmpBills = obj(isPrimary ? m6d.bill_comparison_php_month ?? m6d.bill_comparison : null);
  const propKey = Object.keys(cmpBills).find((k) => /proposed/i.test(k));
  const lv = ["m10", "m20", "m30"];
  if (Object.keys(curBills).length || propKey) {
    const s: Series[] = [];
    if (lv.some((l) => isNum(curBills[l]))) s.push({ name: "Current", values: lv.map((l) => val(curBills[l])), color: T.gray });
    if (propKey) s.push({ name: "Proposed", values: lv.map((l) => val(obj(cmpBills[propKey])[l])), color: T.cyan });
    if (s.length) bills = { kind: "bar", title: "Typical monthly bill at 10, 20 and 30 m³", labels: ["10 m³", "20 m³", "30 m³"], unit: `${CUR}/month`, source: srcOf(cmpBills, srcOf(cur6, m6Src)), valueFmt: "num", series: s };
  } else {
    const inputs = arr(obj(pickBlock(m6d).block).tariff_inputs).filter(isR);
    const res = inputs.filter((r) => /resid/i.test(str(r.customer_class))).sort((a, b) => a.year - b.year);
    if (res.length) {
      const billAt = (r: R, m3: number) => { const w = kf(r, /^tariff_water/), sw = kf(r, /^tariff_sewer/) ?? 0, fx = kf(r, /^fixed_charge/) ?? 0; return w === null ? null : Math.round((fx + (w + sw) * m3) * 100) / 100; };
      const f = res[0], l = res.at(-1)!;
      bills = { kind: "bar", title: `Residential bill at 10, 20 and 30 m³, ${f.year} and ${l.year}`, labels: ["10 m³", "20 m³", "30 m³"], unit: `${CUR}/month`, source: srcOf(m6d), valueFmt: "num",
        series: [{ name: String(f.year), values: [10, 20, 30].map((m) => billAt(f, m)), color: T.gray }, ...(l !== f ? [{ name: String(l.year), values: [10, 20, 30].map((m) => billAt(l, m)), color: T.cyan }] : [])] };
      billConf = "Calculated";
    }
  }
  if (!bills) need(6, "Typical bills at 10, 20 and 30 m³");
  const aff = affRows.sort((a, b) => a.year - b.year).at(-1);
  const affShare = aff ? kf(aff, /^share_avg_income/) : null;
  const affLow = aff ? kf(aff, /^share_lowest/) : null;
  const thr = val(m6d.affordability_threshold_pct);
  const affStmt = str(obj(m6d.affordability).statement);
  if (affShare === null && !affStmt) need(6, "Affordability (bill as share of household income)");
  const m6: Section = sec(6, {
    keyMessage: affShare !== null ? cap(`A typical bill takes ${fmt(affShare, "pct100")}% of average household income${affLow !== null ? ` and ${fmt(affLow, "pct100")}% for the poorest fifth` : ""}${thr !== null ? `, against a ${fmt(thr, "pct100")}% threshold` : ""}.`, 25)
      : tariffChart ? cap(tariffChart.title + ".", 25) : affStmt ? cap(affStmt, 25) : "Tariff levels and affordability still need data.",
    figures: [
      fig(required, `${CUR}/m³`, `Required tariff${tYear ? ` ${tYear.split("–").at(-1)}` : ""}`, "dec", required !== null ? est : "Data needed", 6),
      fig(current, `${CUR}/m³`, "Current average tariff", "dec", current !== null ? "Measured" : "Data needed", 6),
      affShare !== null ? { value: fmt(affShare, "pct100"), unit: "% of income", label: "Bill vs. average income", conf: "Calculated" } : val(m6d.collection_rate) !== null ? { value: fmt(val(m6d.collection_rate), "pct"), unit: "%", label: "Collection rate", conf: "Measured" } : fig(null, "%", "Affordability", "num", "Data needed", 6),
    ],
    visual: { charts: [tariffChart, bills].filter(Boolean) as Chart[] },
    bullets: [
      str(m6d.cost_recovery_level) ? `Cost recovery target: ${str(m6d.cost_recovery_level)}.` : "",
      affStmt ? cap(affStmt, 15) : "",
      isNum(cur6.minimum_charge_php) ? `Current minimum charge ${CUR} ${fmt(cur6.minimum_charge_php, "dec")} for the first ${str(cur6.minimum_m3) || "?"} m³.` : "",
      billConf === "Calculated" && bills ? "Bills calculated from residential tariff inputs, fixed charge included." : "",
    ],
    sources: [m6Src], hasData: !!(tariffChart || bills || affStmt),
    notes: cmpRows.length ? cmpRows.slice(0, 5).map((r) => `${r.year}: applied ${fmt(kf(r, /^applied/), "dec")}, required ${fmt(kf(r, /^required/), "dec")} ${CUR}/m³.`) : [],
  });

  /* ===== M7 KPIs ===== */
  const m7d = D(7);
  const kpis = arr(m7d.kpis).filter(isR);
  const kpiRows = kpis.map((k) => {
    const code = str(k.code);
    const meta7 = KPI[code];
    const label = str(k.name) || meta7?.label || titleCase(code);
    const unit = unitCur(str(k.unit) || meta7?.unit || "");
    const lower = /down|lower/i.test(str(k.direction)) || !!meta7?.lower;
    const b = val(k.baseline_value) ?? val(k.baseline);
    const tgOwn = Object.keys(k).find((x) => scKeys.some((sk) => x.toLowerCase() === `annual_targets_${sk.replace(/^sc-/, "")}`));
    // Targets of the plan case belong to the primary scenario only.
    const tg = tgOwn ? obj(k[tgOwn]) : isPrimary ? (isR(k.annual_targets_improvement) ? obj(k.annual_targets_improvement) : obj(k.targets)) : {};
    if (!tgOwn && !isPrimary && (isR(k.annual_targets_improvement) || isR(k.targets))) scenarioUncomputed = true;
    const ents = Object.entries(tg).filter(([, v]) => isNum(v)) as [string, number][];
    const dated = ents.filter(([y]) => /^\d{4}$/.test(y)).sort((a, c) => Number(a[0]) - Number(c[0]));
    const inPlan = dated.filter(([y]) => !end || Number(y) <= end);
    const tEnt = inPlan.at(-1) ?? dated[0] ?? ents.find(([y]) => y === "any");
    const t = tEnt ? tEnt[1] : null;
    const acts = arr(k.actuals).filter(isR).filter((a) => isNum(a.value));
    const latest = acts.at(-1);
    const now = latest ? latest.value : b;
    let status: StatusKey = "need";
    if (now !== null && t !== null) {
      const met = lower ? now <= t : now >= t;
      const gap = t === 0 ? 1 : Math.abs(now - t) / Math.abs(t);
      status = met ? "on" : gap <= 0.1 ? "risk" : "off";
    }
    if (b === null) need(7, `Baseline for ${label}`); if (t === null) need(7, `Target for ${label}`);
    return { code, label, unit, lower, b, t, tYear: tEnt ? (tEnt[0] === "any" ? "ongoing" : tEnt[0]) : "", std: str(k.standard), status, now, latest, k };
  });
  if (!kpis.length) need(7, "KPIs");
  const cnt = (s: StatusKey) => kpiRows.filter((r) => r.status === s).length;
  const kfmt = (v: number | null, u: string) => (v === null ? NEED : u === "%" && Math.abs(v) <= 1 && v !== 0 && !Number.isInteger(v) ? fmt(v * 100, "pct100") : fmt(v));
  const kpiTable: Tbl = {
    title: `${cnt("on")} of ${kpiRows.length} KPIs already meet their target`,
    head: ["KPI", "Baseline", "Target", "Standard", "Status"],
    rows: kpiRows.slice(0, 6).map((r) => [`${r.label}${r.unit ? ` (${r.unit})` : ""}`, kfmt(r.b, r.unit), r.t !== null ? `${kfmt(r.t, r.unit)}${r.tYear && r.tYear !== "ongoing" ? ` by ${r.tYear}` : ""}` : NEED, cap(r.std, 5) || "–", ""]),
    status: kpiRows.slice(0, 6).map((r) => r.status), source: srcOf(m7d),
    note: "Status compares the latest value (baseline if no actuals) with the target: within 10% of target is At risk.",
  };
  const tracking = obj(m7d.tracking);
  const m7: Section = sec(7, {
    keyMessage: kpis.length ? cap(`${cnt("on")} of ${kpis.length} KPIs are on track; ${cnt("off") + cnt("risk")} need action and ${cnt("need")} lack data.`, 25) : "KPIs and targets still need to be defined.",
    figures: [
      { value: kpis.length ? String(kpis.length) : NEED, unit: "KPIs", label: "Indicators monitored", conf: kpis.length ? "Measured" : "Data needed", missing: !kpis.length },
      { value: kpis.length ? String(cnt("on")) : NEED, unit: "on track", label: "Meeting target", conf: kpis.length ? "Calculated" : "Data needed", missing: !kpis.length },
      { value: kpis.length ? String(cnt("need")) : NEED, unit: "KPIs", label: "Missing baseline or target", conf: kpis.length ? "Calculated" : "Data needed", missing: !kpis.length },
    ],
    visual: { charts: [], table: kpiRows.length ? kpiTable : undefined,
      deckChart: kpiRows.length ? { kind: "doughnut", title: kpiTable.title, labels: ["On track", "At risk", "Off track", "Data needed"], unit: "KPIs", source: srcOf(m7d), valueFmt: "num",
        series: [{ name: "KPIs", values: [cnt("on"), cnt("risk"), cnt("off"), cnt("need")], color: T.cyan }] } : undefined },
    bullets: [
      str(tracking.cadence) ? `Reviewed ${str(tracking.cadence)}${str(tracking.first_meeting) ? `, first meeting ${str(tracking.first_meeting)}` : ""}.` : "",
      arr(tracking.team).length ? `Tracking team: ${arr(tracking.team).map(str).slice(0, 4).join(", ")}.` : "",
      ...kpiRows.filter((r) => r.status === "off").slice(0, 2).map((r) => `${r.label}: ${kfmt(r.now, r.unit)} vs. target ${kfmt(r.t, r.unit)}.`),
    ],
    sources: [srcOf(m7d)], hasData: kpiRows.some((r) => r.b !== null || r.t !== null),
    notes: kpiRows.slice(6).map((r) => `${r.label}: baseline ${kfmt(r.b, r.unit)}, target ${kfmt(r.t, r.unit)}.`),
  });
  if (!str(tracking.cadence)) need(7, "Monitoring cadence and team");

  /* ===== M8 Review ===== */
  const m8d = D(8);
  const issues = [...arr(m8d.open_issues).map(str).filter(Boolean), ...arr(m8d.data_review).filter(isR).filter((r) => /high/i.test(str(r.severity))).map((r) => `${str(r.id)} ${str(r.topic)}: ${str(r.action)}`)];
  const ms = arr(m7d.milestones_status).filter(isR).filter((m) => !/done|complete/i.test(str(m.status)) || !str(m.done));
  const steps: { what: string; owner: string; date: string }[] = [
    ...ms.map((m) => ({ what: `${str(m.action)} ${str(m.milestone)}`.trim(), owner: str(actions.find((a) => str(a.code) === str(m.action))?.owner) || NEED, date: str(m.due) || NEED })),
    ...actions.filter((a) => !/done|complete/i.test(str(a.status))).sort((a, b) => str(a.start).localeCompare(str(b.start))).map((a) => ({ what: `${str(a.code)} ${cap(str(a.title), 8)}`.trim(), owner: str(a.owner) || str(a.responsible) || NEED, date: str(a.start) || str(a.end) || NEED })),
  ].slice(0, 5);
  if (steps.some((s) => s.owner === NEED)) need(8, "Owners for next steps");
  if (!steps.length) need(8, "Next steps with owner and date");
  const approved = mods.filter((m) => m.status === "approved").length;
  const segs = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ n, title: str(mod(n).title), status: statusLabel(str(mod(n).status)), done: mod(n).status === "approved" }));
  const summ = typeof m8d.executive_summary === "string" ? m8d.executive_summary : arr(m8d.executive_summary).map(str).join(" ");
  if (!str(summ)) need(8, "Executive summary text");
  const m8: Section = sec(8, {
    keyMessage: cap(`${approved} of 8 modules are approved; ${issues.length} open issues must be resolved before the plan is final.`, 25),
    figures: [
      { value: `${approved}/8`, unit: "modules", label: "Approved modules", conf: "Measured" },
      { value: String(issues.length), unit: "issues", label: "Open issues", conf: "Measured" },
      { value: String(missing.length), unit: "items", label: "Data still needed", conf: "Calculated" },
    ],
    visual: {
      segments: segs, charts: [],
      table: steps.length ? { title: "Next steps", head: ["Step", "Owner", "Date"], rows: steps.map((s) => [cap(s.what, 10), cap(s.owner, 5), s.date]), source: srcOf(m4d) } : undefined,
    },
    bullets: issues.slice(0, 3).map((i) => cap(i, 15)),
    sources: [srcOf(m8d)], hasData: approved > 0 || issues.length > 0 || steps.length > 0 || !!str(summ),
    notes: issues.slice(3, 6).map((i) => cap(i, 25)),
  });

  const sections = [m1, m2, m3, m4, m5, m6, m7, m8];

  /* ===== Executive summary ===== */
  const fromSumm = sentences(summ).filter((s) => wordCount(s) <= 20);
  const fromMods = [m5, m7, m4, m3, m1].filter((s) => s.hasData).map((s) => s.keyMessage).filter((s) => wordCount(s) <= 20 && !s.endsWith("…"));
  const msgs = Array.from(new Set([...fromSumm, ...fromMods])).slice(0, 3);
  const primaryKpi = kpiRows.find((r) => r.b !== null && r.t !== null && /nrw/.test(r.code)) ?? kpiRows.find((r) => r.b !== null && r.t !== null);
  const headline: Fig[] = [
    capexSum !== null || capexTotal !== null ? { value: fmt(capexSum ?? capexTotal, "money"), unit: CUR, label: "Total investment", conf: "Estimated" } : { value: NEED, unit: "", label: "Total investment", conf: "Data needed", missing: true },
    primaryKpi ? { value: `${kfmt(primaryKpi.b, primaryKpi.unit)} to ${kfmt(primaryKpi.t, primaryKpi.unit)}`, unit: primaryKpi.unit, label: `${primaryKpi.label}${primaryKpi.tYear && primaryKpi.tYear !== "ongoing" ? ` by ${primaryKpi.tYear}` : ""}`, conf: "Estimated", trend: primaryKpi.lower ? "down" : "up" } : { value: NEED, unit: "", label: "Main KPI target", conf: "Data needed", missing: true },
    popServed !== null ? { value: fmt(popServed), unit: "people", label: "People served", conf: "Measured" } : connections !== null ? { value: fmt(connections), unit: "connections", label: "Water connections", conf: "Measured" } : { value: NEED, unit: "", label: "People served", conf: "Data needed", missing: true },
    finAmt !== null ? { value: fmt(finAmt, "money"), unit: CUR, label: "External financing", conf: "Estimated" } : required !== null ? { value: fmt(required, "dec"), unit: `${CUR}/m³`, label: "Required tariff", conf: "Estimated" } : { value: NEED, unit: "", label: "Financing", conf: "Data needed", missing: true },
  ];
  const prog = kpiRows.filter((r) => r.now !== null && r.t !== null && r.t !== 0 && r.now !== 0).slice(0, 4);
  const progress: Chart | null = prog.length ? {
    kind: "hbar", title: `Distance to target for ${prog.length} main KPIs (100 = target met)`, labels: prog.map((r) => cap(r.label, 4)), unit: "% of target", source: srcOf(m7d), valueFmt: "num",
    series: [{ name: "Progress", values: prog.map((r) => Math.round(Math.min(100, Math.max(0, (r.lower ? r.t! / r.now! : r.now! / r.t!) * 100)) * 10) / 10), color: T.cyan }],
  } : null;
  if (!msgs.length) need(8, "Key messages (executive summary)");

  /* ===== Investment, tariff, decisions (deck) ===== */
  const disb = yearSeries(fin.disbursement);
  const ownFunds = cip.filter((c) => isNum(c.own_funds));
  const funding: Chart | null = disb.length && ownFunds.length ? {
    kind: "stacked", title: "Loan disbursements and own funds by year", labels: ownFunds.map((c) => String(c.year)), unit: CUR, source: m5Src, valueFmt: "money",
    series: [{ name: "Loan", values: ownFunds.map((c) => val(c.loans_received)), color: T.cyan }, { name: "Own funds", values: ownFunds.map((c) => val(c.own_funds)), color: T.gray }],
  } : null;

  /* ===== Annexes ===== */
  const actRows = actions.map((a) => [str(a.code), cap(str(a.title), 12), str(a.owner) || str(a.responsible) || NEED, `${str(a.start) || "?"}–${str(a.end) || "?"}`, str(a.funding) || NEED, actCost(a) !== null ? fmt(actCost(a), "money") : NEED]);
  const charters = arr(m4d.charters).filter(isR);
  const capexYears = capexChart ? capexChart.labels : [];
  const annexes: Annex[] = [
    { id: "A", title: "Detailed tables", tables: [
      ...(goals.length ? [{ title: "Goals and targets", head: ["Code", "Goal", "KPI", "Target", "Year"], rows: goals.map((g) => [str(g.code), cap(str(g.title), 14), str(g.kpi) || NEED, isNum(g.target) ? fmt(g.target) : NEED, str(g.target_year) || str(g.year) || NEED]), source: srcOf(m4d) }] : []),
      ...(actRows.length ? [{ title: "Action plan", head: ["Code", "Action", "Owner", "Period", "Funding", `CAPEX (${CUR})`], rows: actRows, source: srcOf(actions[0], srcOf(m4d)) }] : []),
      ...(capexChart ? [{ title: `Investment by year (${CUR})`, head: ["Series", ...capexYears], rows: capexChart.series.map((s) => [s.name, ...s.values.map((v) => fmt(v, "money"))]), source: m5Src }] : []),
      ...(kpiRows.length ? [{ title: "All KPIs", head: ["KPI", "Unit", "Baseline", "Target", "Standard", "Status"], rows: kpiRows.map((r) => [r.label, r.unit || "–", kfmt(r.b, r.unit), r.t !== null ? `${kfmt(r.t, r.unit)} ${r.tYear}` : NEED, r.std || "–", ""]), status: kpiRows.map((r) => r.status), source: srcOf(m7d) }] : []),
      ...(cmpRows.length ? [{ title: `Tariff comparison (${CUR}/m³)`, head: ["Year", "Applied average tariff", "Required tariff", "Cost recovery ratio"], rows: cmpRows.map((r) => [String(r.year), fmt(kf(r, /^applied/), "dec"), fmt(kf(r, /^required/), "dec"), fmt(kf(r, /cost_recovery/), "dec")]), source: srcOf(m6d) }] : []),
      ...(base ? [{ title: "Baseline indicators", head: ["Dimension", "Indicator", "Value", "Level"], rows: base.indicators.map((i: any) => [i.dimension, i.name, i.value === null ? NEED : i.unit === "%" ? `${fmt(i.value, "pct")}%` : fmt(i.value), i.level ? ["Elementary", "Basic", "Good", "Well-performing", "World-class"][i.level - 1] : "Not rated"]), source: m1Src }] : []),
    ] },
    { id: "B", title: "Project charters", tables: charters.map((c) => ({
      title: str(c.project_name) || str(c.action), head: ["Field", "Detail"], source: srcOf(c, srcOf(m4d)),
      rows: [["Action", str(c.action) || NEED], ["Mission", str(c.mission) || NEED], ["Scope", str(c.scope) || NEED], ["Sponsor", str(c.sponsor) || NEED], ["Project manager", str(c.project_manager) || NEED],
        ["Budget", (() => { const k = Object.keys(c).find((x) => /^budget/.test(x)); return k && isNum(c[k]) ? `${CUR} ${fmt(c[k], "money")}` : NEED; })()], ["Completion", str(c.completion) || str(c.completion_date) || NEED],
        ["Milestones", arr(c.milestones).map((m) => (Array.isArray(m) ? `${str(m[0])} (${str(m[1])})` : str(m))).join("; ") || NEED], ["Risks", arr(c.risks).map(str).join("; ") || NEED]],
    })), lines: charters.length ? [] : ["No project charters recorded. " + NEED + "."] },
    { id: "C", title: "Indicator definitions", tables: [
      ...(kpis.some((k) => str(k.formula) || str(k.monitoring_method)) ? [{ title: "Module 7 KPIs", head: ["KPI", "Definition or formula", "Frequency", "Method"], rows: kpiRows.map((r) => [r.label, str(r.k.formula) || NEED, str(r.k.frequency) || NEED, str(r.k.monitoring_method) || "–"]), source: srcOf(m7d) }] : []),
      ...(base ? [{ title: "Baseline indicator formulas", head: ["Indicator", "Unit", "Formula"], rows: base.indicators.map((i: any) => [i.name, unitCur(str(i.unit)), str(i.formula)]), source: "Baseline workbook definitions (Module 1)" }] : []),
    ] },
    { id: "D", title: "Source documents", tables: [], lines: [
      ...Object.entries(srcNames).map(([k, v]) => `[${k}] ${str(v)}`),
      defaultSource,
    ] },
    { id: "E", title: "Open issues and data needed", tables: [
      ...(issues.length ? [{ title: "Open issues", head: ["#", "Issue"], rows: issues.map((x, i) => [String(i + 1), x]), source: srcOf(m8d) }] : []),
      ...(missing.length ? [{ title: "Data needed", head: ["Module", "Item"], rows: missing.map((m) => [`Module ${m.module}`, m.item]), source: "Generated from gaps in plan data" }] : []),
    ] },
  ];

  const scenarioNote = scenarioUncomputed
    ? `The ${scName} scenario has not been computed: forecasts, tariffs and targets are marked Data needed. Baseline, history and actions are shared across scenarios.`
    : scenarioFallback
    ? `The supplied plan case ("Improvement") is shown as the primary ${scName} scenario.`
    : `Figures shown belong to the ${scName} scenario or are scenario-independent plan data.`;
  // Plan horizon comes from the plan source (context.plan); only if absent is it derived from projection years in the data.
  const dataYears = [...(capexChart?.labels ?? []), ...goals.map((g) => str(g.target_year) || str(g.year)), ...kpiRows.map((r) => r.tYear)].map(Number).filter((y) => Number.isInteger(y) && y > 1900);
  const endD = end ?? (dataYears.length ? Math.max(...dataYears) : null);
  const startD = start ?? (capexChart ? Number(capexChart.labels[0]) || null : null);
  const startY = startD !== null ? String(startD) : NEED, endY = endD !== null ? String(endD) : NEED;
  void yearsInData;
  return {
    utility: { name, short, country: str(ut.countryName) || str(cUt.country) || str(ut.countryIso3) || str(cUt.country_iso3), city: serviceArea, currency: CUR, logo: ut.utilityLogo && Buffer.isBuffer(ut.utilityLogo.buffer) ? ut.utilityLogo : undefined },
    period: { start: startY, end: endY, label: startD !== null && endD !== null ? `${startD}–${endD}` : startD !== null ? `${startD} onwards` : "Plan period " + NEED.toLowerCase() },
    scenario: { code: scCode, name: scName, note: scenarioNote, primary: isPrimary },
    scenarioComputed: !scenarioUncomputed,
    version: inp.version, author: inp.author, date: inp.date, draft: approved < 8,
    summary: { messages: msgs, headline, progress, source: srcOf(m8d) },
    sections, annexes,
    investment: { figures: m5.figures, chart: capexChart, funding: funding ?? opexChart, notes: [...m5.bullets.filter(Boolean), ...top.slice(0, 2).map((t) => `${str(t.a.code)} ${cap(str(t.a.title), 8)}: ${CUR} ${fmt(t.c, "money")}`)].slice(0, 5), hasData: m5has },
    tariff: { figures: m6.figures, chart: tariffChart, bills, notes: m6.bullets.filter(Boolean).concat(m6.notes).slice(0, 5), hasData: m6.hasData },
    decisions: { issues: issues.slice(0, 3).map((i) => cap(i, 12)), steps, notes: issues.slice(3, 8).map((i) => cap(i, 25)) },
    missing, defaultSource,
  };

  /* ---- local helpers needing closure ---- */
  function fig(v: number | null, unit: string, label: string, kind: Parameters<typeof fmt>[1], conf: Conf, module: number): Fig {
    if (v === null) { need(module, label); return { value: NEED, unit: "", label, conf: "Data needed", missing: true }; }
    return { value: fmt(v, kind), unit, label, conf };
  }
  function sec(n: number, p: { keyMessage: string; figures: Fig[]; visual: Visual; bullets: string[]; sources: string[]; hasData: boolean; notes: string[] }): Section {
    const m = mod(n), ph = phaseOf(n);
    const bullets = p.bullets.filter(Boolean);
    const overflow = bullets.slice(5);
    const conf = Array.from(new Set<Conf>([...p.figures.map((f) => f.conf), ...(missingFor(n) ? ["Data needed" as Conf] : [])]));
    return {
      n, title: str(m.title) || `Module ${n}`, phase: ph.n, phaseName: ph.name, color: MODULE_COLORS[n - 1],
      keyMessage: cap(p.keyMessage, 25), figures: p.figures.slice(0, 3), visual: p.visual,
      bullets: bullets.slice(0, 5).map((b) => cap(b, 15)), sources: Array.from(new Set(p.sources.filter(Boolean))), conf,
      notes: [...bullets.filter((b) => wordCount(b) > 15), ...overflow, ...p.notes].filter(Boolean),
      hasData: p.hasData, status: statusLabel(str(m.status)),
    };
  }
  function missingFor(n: number) { return missing.some((x) => x.module === n); }
}

function HISTSRC(s: string) { return s; }
function dir(a: number, b: number): "up" | "down" | "flat" { return b > a ? "up" : b < a ? "down" : "flat"; }
const SL: Record<string, string> = { not_started: "Not started", needs_data: "Needs data", in_progress: "In progress", ready_for_review: "Ready for review", approved: "Approved" };
export const statusLabel = (s: string) => SL[s] ?? s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
export { PHASES };

/**
 * Never draw a missing value as zero. Single-series (and doughnut) charts drop categories without a value;
 * multi-series charts keep only categories where every series has a value. Returns null when too little is left.
 */
export function completeChart(c: Chart): { chart: Chart | null; dropped: string[] } {
  const keep = c.labels.map((_, i) => (c.kind === "doughnut" ? c.series[0].values[i] !== null : c.series.every((s) => s.values[i] !== null)));
  const dropped = c.labels.filter((_, i) => !keep[i]);
  const labels = c.labels.filter((_, i) => keep[i]);
  const min = c.kind === "line" ? 2 : 1;
  if (labels.length < min) return { chart: null, dropped };
  return { chart: { ...c, labels, series: c.series.map((s) => ({ ...s, values: s.values.filter((_, i) => keep[i]) })) }, dropped };
}
/** Words that count toward slide body caps: numeric tokens (figures, years, values) are not words. */
export const bodyWords = (s: string) => str(s).split(/\s+/).filter((t) => t && !/^[\d.,%+\-–↑↓→()/x:]+$/.test(t)).length;
