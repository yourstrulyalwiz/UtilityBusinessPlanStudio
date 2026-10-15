/**
 * Generator smoke test (no DB, no network).
 * Usage (from artifacts/api-server):
 *   pnpm --filter @workspace/scripts exec tsx ../artifacts/api-server/src/lib/outputs/smoke.ts [workflow.json ...] [--out DIR] [--scenario CODE] [--no-pdf]
 * A workflow.json is a moduleWorkflow response (or {planId,kind,context,scenarios,modules:[{number,status,data}]}).
 * Without arguments only the built-in missing-data fixture is generated.
 * Writes .docx/.pdf/.pptx plus PNG previews (pdftoppm) and prints quality checks.
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { moduleDefinitions } from "../module-definitions";
import { buildModel, generateOutput, pdfAvailable, resolveScenario } from "./index";
import { NEED, completeChart, wordCount, type Chart } from "./model";

const run = promisify(execFile);
const args = process.argv.slice(2);
const flag = (k: string) => { const i = args.indexOf(k); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const out = path.resolve(flag("--out") ?? "/tmp/bp-outputs");
const scenarioCode = flag("--scenario");
const noPdf = args.includes("--no-pdf"); if (noPdf) args.splice(args.indexOf("--no-pdf"), 1);

function withTitles(wf: Record<string, unknown>) {
  const mods = (wf.modules as Record<string, unknown>[]).map((m) => ({ ...moduleDefinitions[(m.number as number) - 1], ...m }));
  return { utilityName: "", source: "Source: plan data", ...wf, modules: mods };
}
const missingFixture = () => withTitles({
  planId: "fixture-missing", kind: "user", utilityName: "Rio Claro Municipal Water", context: {}, source: "Source: user-entered plan data",
  scenarios: [{ code: "SC-CONSERVATIVE", name: "Conservative", type: "conservative", is_primary: false }, { code: "SC-BASE", name: "Base", type: "base", is_primary: true }, { code: "SC-AMBITIOUS", name: "Ambitious", type: "ambitious", is_primary: false }],
  modules: [
    { number: 1, status: "in_progress", data: { baselineVersion: 1, referenceYear: 2025, variables: { v10: 18250, v48: 141 }, variableNotes: {}, indicatorNotes: {}, importedWorkbook: false } },
    { number: 2, status: "in_progress", data: { vision: "Safe water for every household in Rio Claro by 2032.", mission: "", objectives: [{ code: "OBJ-1", title: "Cut water losses", specific: "Reduce NRW to 30% by 2030", owner: "" }], sign_off: {} } },
    { number: 3, status: "not_started", data: { swot: { strengths: [], weaknesses: [{ text: "Old meters" }], opportunities: [], threats: [] } } },
    { number: 4, status: "not_started", data: { goals: [], actions: [], strategies: [], charters: [] } },
    { number: 5, status: "not_started", data: {} }, { number: 6, status: "not_started", data: {} },
    { number: 7, status: "not_started", data: { kpis: [{ code: "nrw", baseline: 41.5, targets: null }] } },
    { number: 8, status: "not_started", data: { executive_summary: "" } },
  ],
});
const utilityFor = (wf: Record<string, unknown>) => {
  const c = (wf.context ?? {}) as Record<string, Record<string, unknown>>;
  const u = c.utility ?? {};
  return { name: (u.name as string) || (wf.utilityName as string) || "Rio Claro Municipal Water", shortName: (u.short_name as string) || "RCMW", countryName: ({ PHL: "Philippines", PER: "Peru" } as Record<string, string>)[u.country_iso3 as string] ?? "Brazil", countryIso3: (u.country_iso3 as string) || "BRA", serviceArea: (u.city_service_area as string) || "", planYear: 2026, currency: (c.plan?.currency as string) || "BRL", logoPath: null };
};

async function previews(file: string, prefix: string, pages: number[]) {
  for (const p of pages) { try { await run("pdftoppm", ["-png", "-r", "60", "-f", String(p), "-l", String(p), file, `${prefix}-p${p}`]); } catch { /* page may not exist */ } }
}

async function main() {
  await mkdir(out, { recursive: true });
  const inputs: { name: string; wf: Record<string, unknown> }[] = [{ name: "missing-data", wf: missingFixture() }];
  for (const f of args) { const raw = JSON.parse(await readFile(f, "utf8")); inputs.push({ name: path.basename(f, ".json"), wf: raw.modules?.[0]?.title ? raw : withTitles(raw) }); }
  const pdfOk = !noPdf && (await pdfAvailable());
  console.log(`pdfAvailable=${pdfOk} out=${out}`);
  let fail = 0;
  for (const { name, wf } of inputs) {
    const utility = utilityFor(wf);
    const scenario = resolveScenario(wf, scenarioCode);
    const base = { workflow: wf, utility, scenario, version: 1, author: "Smoke Test", date: new Date().toISOString().slice(0, 10) };
    const m = buildModel(base);
    const checks: string[] = [];
    if (m.summary.messages.some((x) => wordCount(x) > 20)) checks.push("key message > 20 words");
    for (const s of m.sections) {
      if (wordCount(s.keyMessage) > 25) checks.push(`M${s.n} key message > 25 words`);
      if (s.bullets.length > 5 || s.bullets.some((b) => wordCount(b) > 15)) checks.push(`M${s.n} bullet limits`);
      if (s.figures.length > 3) checks.push(`M${s.n} > 3 figures`);
      if (s.visual.table && s.visual.table.rows.slice(0, 6).some((r) => r.length > 5)) checks.push(`M${s.n} table > 5 columns`);
    }
    if (/UoF/i.test(JSON.stringify(m))) checks.push("contains UoF");
    console.log(`\n== ${name}: ${m.utility.name} · ${m.period.label} · scenario ${m.scenario.name} · missing items ${m.missing.length}`);
    console.log(`   modules with data: ${m.sections.filter((s) => s.hasData).map((s) => s.n).join(",")}`);
    for (const fmt of (pdfOk ? ["docx", "pptx", "pdf"] : ["docx", "pptx"]) as Array<"docx" | "pptx" | "pdf">) {
      const t0 = Date.now();
      const r = await generateOutput({ ...base, format: fmt });
      const file = path.join(out, `${name}__${r.filename}`);
      await writeFile(file, r.buffer);
      console.log(`   ${fmt}: ${r.filename} ${(r.buffer.length / 1024).toFixed(0)} KB in ${Date.now() - t0} ms ${JSON.stringify(r.meta)}`);
      if (fmt === "pptx" && (r.meta.slideCount ?? 0) > 14) checks.push("deck > 14 slides");
      if (fmt === "pptx" && (r.meta.maxBodyWords ?? 0) > 25) checks.push(`slide body ${r.meta.maxBodyWords} words > 25`);
      if (fmt === "pdf") await previews(file, path.join(out, `${name}-doc`), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
      if (fmt === "pptx" && pdfOk) {
        try {
          await run("soffice", ["--headless", "--convert-to", "pdf", "--outdir", out, file], { timeout: 180000 });
          await previews(file.replace(/\.pptx$/, ".pdf"), path.join(out, `${name}-deck`), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
        } catch (e) { console.log("   deck preview failed", (e as Error).message); }
      }
    }
    // Regression: no zero-filled gaps — every drawn chart must be complete after completeChart.
    for (const c of [...m.sections.flatMap((x) => x.visual.charts), m.investment.chart, m.investment.funding, m.tariff.chart, m.tariff.bills].filter(Boolean) as Chart[]) {
      const cc = completeChart(c).chart;
      if (cc && cc.series.some((x) => x.values.some((v) => v === null))) checks.push(`chart "${c.title}" keeps null values`);
    }
    // Regression: modules with only default/empty structure are not counted as data.
    if (name === "missing-data" && m.sections[4].hasData) checks.push("empty M5 counted as data");
    // Regression: alternate uncomputed scenarios never carry the plan case's forecasts.
    for (const alt of (Array.isArray(wf.scenarios) ? wf.scenarios : []).filter((x: Record<string, unknown>) => !x.is_primary)) {
      const am = buildModel({ ...base, scenario: alt });
      const leaks: string[] = [];
      if (am.investment.chart || am.investment.funding) leaks.push("investment charts");
      if (am.tariff.chart?.series[0].values.slice(1).some((v) => v !== null)) leaks.push("required/proposed tariff");
      if (am.tariff.bills?.series.some((x) => !/current/i.test(x.name))) leaks.push("proposed bills");
      if (am.sections[4].hasData) leaks.push("M5 data");
      const kt = am.sections[6].visual.table?.rows.filter((r) => r[2] !== NEED).length ?? 0;
      if (kt) leaks.push(`${kt} KPI targets`);
      const pm = buildModel({ ...base, scenario: resolveScenario(wf, undefined) });
      const altRes = await generateOutput({ ...base, scenario: alt, format: "pptx" });
      console.log(`   alt scenario ${String(alt.name)}: computed=${am.scenarioComputed}, slides=${altRes.meta.slideCount}, primary has investment chart=${!!pm.investment.chart}${leaks.length ? `, LEAKS: ${leaks.join(", ")}` : ", no plan-case figures"}`);
      if (leaks.length) checks.push(`scenario ${String(alt.name)} leaks ${leaks.join(", ")}`);
    }
    console.log(checks.length ? `   CHECKS FAILED: ${checks.join("; ")}` : "   checks passed");
    if (checks.length) fail++;
  }
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
