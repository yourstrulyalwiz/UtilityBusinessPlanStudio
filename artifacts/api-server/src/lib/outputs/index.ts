import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { buildModel, isR, type Model } from "./model";
import { renderDocx, tocEntries, type TocEntry } from "./render-docx";
import { renderPptx } from "./render-pptx";
import { svgToPng } from "./charts-svg";

export { buildModel } from "./model";
export type { Model } from "./model";

const run = promisify(execFile);
const MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
const SOFFICE = ["soffice", "libreoffice"];
let sofficeBin: string | null | undefined;
async function findSoffice(): Promise<string | null> {
  if (sofficeBin !== undefined) return sofficeBin;
  for (const b of SOFFICE) { try { await run(b, ["--version"], { timeout: 20000 }); return (sofficeBin = b); } catch { /* next */ } }
  return (sofficeBin = null);
}
async function hasPdftotext() { try { await run("pdftotext", ["-v"], { timeout: 10000 }); return true; } catch { return false; } }

/** True when LibreOffice headless can be used for PDF export. */
export async function pdfAvailable(): Promise<boolean> { return (await findSoffice()) !== null; }

async function toPdf(docx: Buffer, dir: string, name: string): Promise<Buffer> {
  const bin = await findSoffice();
  if (!bin) throw new Error("PDF export is not available on this server (LibreOffice not installed).");
  const src = path.join(dir, `${name}.docx`);
  await writeFile(src, docx);
  await run(bin, [`-env:UserInstallation=file://${path.join(dir, "lo-profile")}`, "--headless", "--norestore", "--convert-to", "pdf", "--outdir", dir, src], { timeout: 180000 });
  return readFile(path.join(dir, `${name}.pdf`));
}
/** Page index (1-based) of each TOC heading in the rendered PDF; cover is page 1, contents page 2. */
async function headingPages(pdf: Buffer, dir: string, toc: TocEntry[]): Promise<TocEntry[]> {
  const f = path.join(dir, "pages.pdf");
  await writeFile(f, pdf);
  const { stdout } = await run("pdftotext", ["-layout", f, "-"], { maxBuffer: 64 * 1024 * 1024 });
  const pages = stdout.split("\f").map((p) => p.replace(/\s+/g, " "));
  let from = 2; // skip cover and contents
  return toc.map((e) => {
    const key = e.text.replace(/\s+/g, " ");
    let idx = pages.findIndex((p, i) => i >= from && p.includes(key));
    if (idx < 0) idx = pages.findIndex((p, i) => i >= 2 && p.includes(key));
    if (idx >= 0) from = idx;
    return { ...e, page: idx >= 0 ? idx + 1 : undefined };
  });
}

const safe = (s: string) => s.normalize("NFKD").replace(/[^\w-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "Plan";

export interface GenerateInput {
  format: "docx" | "pdf" | "pptx"; workflow: unknown; utility: unknown; scenario: unknown;
  version: number; author: string; date: string;
}
export function outputFilename(m: Model, kind: "Business_Plan" | "Executive_Deck", ext: string, version: number) {
  const s = m.period.start.match(/^\d{4}$/) ? m.period.start : "TBD", e = m.period.end.match(/^\d{4}$/) ? m.period.end : "TBD";
  return `${safe(m.utility.country)}_${safe(m.utility.short)}_${kind}_${s}-${e}_v${version}.${ext}`;
}

/** Pick the scenario to render: the given one (object or code), else the primary, else the first. */
export function resolveScenario(workflow: unknown, scenario: unknown): Record<string, unknown> {
  const list = (isR(workflow) && Array.isArray(workflow.scenarios) ? workflow.scenarios : []).filter(isR);
  if (isR(scenario)) return scenario;
  if (typeof scenario === "string") { const hit = list.find((s) => s.code === scenario); if (hit) return hit; }
  return list.find((s) => s.is_primary) ?? list[0] ?? { code: "SC-BASE", name: "Base", type: "base", is_primary: true };
}

export async function generateOutput(inp: GenerateInput): Promise<{ buffer: Buffer; mime: string; filename: string; meta: { slideCount?: number; missing: number; overflowMovedToNotes?: number; maxBodyWords?: number; scenarioComputed: boolean } }> {
  const m = buildModel({ workflow: inp.workflow, utility: inp.utility, scenario: resolveScenario(inp.workflow, inp.scenario), version: inp.version, author: inp.author, date: inp.date });
  await normalizeLogo(m);
  if (inp.format === "pptx") {
    const r = await renderPptx(m);
    if (r.slideCount > 14) throw new Error(`Deck has ${r.slideCount} slides; the limit is 14.`);
    return { buffer: r.buffer, mime: MIME.pptx, filename: outputFilename(m, "Executive_Deck", "pptx", inp.version), meta: { slideCount: r.slideCount, missing: m.missing.length, overflowMovedToNotes: r.overflow.length, maxBodyWords: Math.max(0, ...r.bodyWords), scenarioComputed: m.scenarioComputed } };
  }
  if (inp.format === "docx") {
    return { buffer: await renderDocx(m), mime: MIME.docx, filename: outputFilename(m, "Business_Plan", "docx", inp.version), meta: { missing: m.missing.length, scenarioComputed: m.scenarioComputed } };
  }
  const dir = await mkdtemp(path.join(tmpdir(), "bp-pdf-"));
  try {
    // Pass 1 with placeholder TOC (same layout), read heading pages, pass 2 with real page numbers.
    const blank = tocEntries(m);
    let pdf = await toPdf(await renderDocx(m, { toc: blank }), dir, "pass1");
    if (await hasPdftotext()) {
      const numbered = await headingPages(pdf, dir, blank);
      pdf = await toPdf(await renderDocx(m, { toc: numbered }), dir, "pass2");
    }
    return { buffer: pdf, mime: MIME.pdf, filename: outputFilename(m, "Business_Plan", "pdf", inp.version), meta: { missing: m.missing.length, scenarioComputed: m.scenarioComputed } };
  } finally { await rm(dir, { recursive: true, force: true }); }
}

/** PNG/JPEG pass through; SVG is rasterised safely (ImageMagick, no scripts/network in plain SVG render); otherwise an explicit badge replaces it. */
export async function normalizeLogo(m: Model) {
  const l = m.utility.logo;
  if (!l || /png|jpe?g/i.test(l.mime)) return;
  if (/svg/i.test(l.mime)) {
    const svg = l.buffer.toString("utf8");
    const png = /<script|xlink:href=["']https?:|href=["']https?:/i.test(svg) ? null : await svgToPng(svg, 288);
    if (png) { m.utility.logo = { buffer: png, mime: "image/png" }; return; }
  }
  m.utility.logo = undefined;
  m.utility.logoIssue = "Utility logo not shown: format could not be embedded";
}
