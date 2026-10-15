import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, HeightRule, ImageRun, Packer, PageNumber, Paragraph,
  ShadingType, Table, TableCell, TableOfContents, TableRow, TextRun, VerticalAlign, WidthType, TabStopType, LeaderType,
  type ParagraphChild,
} from "docx";
import { APP_LOGO_PNG, BADGE_PNG } from "./assets";
import { chartSvg, svgToPng, BLANK_PNG } from "./charts-svg";
import { NEED, completeChart, type Chart, type Fig, type Model, type Section, type Tbl } from "./model";
import { MODULE_COLORS, PHASES, STATUS, T, type StatusKey } from "./theme";

/** A4 with 2.5 cm margins. */
const PAGE_W = 11906, PAGE_H = 16838, MARGIN = 1417, W = PAGE_W - 2 * MARGIN;
/* Three type sizes per page (half-points): title, key message/subtitle, body. Captions use body-small for sources only. */
const SZ = { title: 32, sub: 24, body: 19, small: 15, figure: 40 };
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOB = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const fill = (c: string) => ({ type: ShadingType.CLEAR, color: "auto", fill: c });

export interface TocEntry { text: string; level: 1 | 2; page?: number }

const run = (text: string, o: { size?: number; bold?: boolean; color?: string; font?: string; italics?: boolean } = {}) =>
  new TextRun({ text, size: o.size ?? SZ.body, bold: o.bold, color: o.color ?? T.text, font: o.font ?? T.font, italics: o.italics });
const needTag = () => new TextRun({ text: ` ${NEED} `, size: SZ.small, bold: true, color: T.amberText, font: T.font, shading: fill(T.amberBg) });
/** Text runs; any "Data needed" fragment becomes an amber tag. */
function rich(text: string, o: Parameters<typeof run>[1] = {}): ParagraphChild[] {
  if (!text.includes(NEED)) return [run(text, o)];
  const parts = text.split(NEED);
  return parts.flatMap((p, i) => [...(p ? [run(p, o)] : []), ...(i < parts.length - 1 ? [needTag()] : [])]);
}
const para = (children: ParagraphChild[], o: { after?: number; before?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; keepNext?: boolean } = {}) =>
  new Paragraph({ children, spacing: { after: o.after ?? 80, before: o.before ?? 0 }, alignment: o.align, keepNext: o.keepNext });
const cell = (children: (Paragraph | Table)[], o: { w: number; shade?: string; pad?: number; vAlign?: never; borders?: Record<string, unknown>; span?: number } = { w: 1000 }) =>
  new TableCell({ children, width: { size: o.w, type: WidthType.DXA }, shading: o.shade ? fill(o.shade) : undefined, verticalAlign: o.vAlign ?? (VerticalAlign.TOP as never), columnSpan: o.span,
    margins: { top: o.pad ?? 80, bottom: o.pad ?? 80, left: o.pad ?? 100, right: o.pad ?? 100 }, borders: (o.borders as never) ?? NOB });
const table = (rows: TableRow[], widths: number[], borders: Record<string, unknown> = NOB) =>
  new Table({ rows, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, borders: borders as never });

function sourceLine(src: string) { return para([run(`Source: ${src}`, { size: SZ.small, color: T.muted })], { after: 160 }); }

/* ---------- charts as native tables (editable, render identically in Word and LibreOffice) ---------- */
function fmtV(v: number | null, c: Chart) {
  if (v === null) return NEED;
  const a = Math.abs(v);
  if (c.valueFmt === "money" || a >= 1e6) return a >= 1e9 ? `${(v / 1e9).toFixed(1)} B` : a >= 1e6 ? `${(v / 1e6).toFixed(1)} M` : a >= 1e3 ? `${(v / 1e3).toFixed(0)} k` : v.toFixed(a < 10 ? 2 : 0);
  return a < 10 ? v.toFixed(2) : a < 100 ? v.toFixed(1) : Math.round(v).toLocaleString("en-US");
}
/* ---------- charts as images (SVG + PNG); missing values are never drawn ---------- */
type Img = { svg: Buffer; png: Buffer; w: number; h: number; chart: Chart | null; dropped: string[] };
const IMGS = new WeakMap<Chart, Img>();
async function prepareChart(c: Chart) {
  if (IMGS.has(c)) return;
  const { chart, dropped } = completeChart(c);
  if (!chart) { IMGS.set(c, { svg: Buffer.alloc(0), png: BLANK_PNG, w: 0, h: 0, chart: null, dropped }); return; }
  const w = 600, h = chart.kind === "hbar" ? Math.max(120, chart.labels.length * 34 + (chart.series.length > 1 ? 22 : 0)) : chart.kind === "doughnut" ? 220 : 250;
  const svg = chartSvg(chart, w, h);
  const png = await svgToPng(svg);
  if (!png) throw new Error("Chart rendering failed. ImageMagick must be available before generating this document.");
  IMGS.set(c, { svg: Buffer.from(svg), png, w, h, chart, dropped });
}
export function chartTable(c: Chart): (Paragraph | Table)[] {
  const im = IMGS.get(c);
  const head = [para([run(c.title, { size: SZ.body, bold: true })], { after: 40, keepNext: true }), para([run(`Unit: ${c.unit}`, { size: SZ.small, color: T.muted })], { after: 60, keepNext: true })];
  if (!im || !im.chart) return [...head, para([needTag(), run(`  Chart not drawn: values missing${im?.dropped.length ? ` for ${im.dropped.join(", ")}` : ""}.`, { size: SZ.small, color: T.text2 })]), sourceLine(c.source)];
  return [
    ...head,
    para([new ImageRun({ type: "svg", data: im.svg, fallback: { type: "png", data: im.png }, transformation: { width: im.w, height: im.h }, altText: { name: c.title, title: c.title, description: c.title } })], { after: 40 }),
    ...(im.dropped.length ? [para([needTag(), run(`  Not shown, values missing: ${im.dropped.join(", ")}.`, { size: SZ.small, color: T.text2 })], { after: 40 })] : []),
    sourceLine(c.source),
  ];
}

export function dataTable(t: Tbl, width = W, maxRows = 1e9): (Paragraph | Table)[] {
  const n = t.head.length;
  const first = Math.round(width * (n > 4 ? 0.3 : 0.4));
  const other = Math.floor((width - first) / Math.max(1, n - 1));
  const widths = [first, ...Array(n - 1).fill(other)];
  const line = { style: BorderStyle.SINGLE, size: 4, color: T.border };
  const hdr = new TableRow({ tableHeader: true, children: t.head.map((h, i) => cell([para([run(h, { size: SZ.small, bold: true, color: T.text2 })], { after: 0 })], { w: widths[i], pad: 60, borders: { ...NOB, bottom: { style: BorderStyle.SINGLE, size: 12, color: T.navy } } })) });
  const body = t.rows.slice(0, maxRows).map((r, ri) => new TableRow({ cantSplit: true, children: r.map((v, i) => {
    const st = t.status?.[ri];
    if (i === n - 1 && st && t.head[i] === "Status") {
      const s = STATUS[st as StatusKey];
      return cell([para([run(`${s.mark}  ${s.label}`, { size: SZ.small, bold: true, color: s.text })], { after: 0 })], { w: widths[i], pad: 60, shade: s.bg, borders: { ...NOB, bottom: line } });
    }
    return cell([para(rich(v, { size: SZ.small }), { after: 0 })], { w: widths[i], pad: 60, borders: { ...NOB, bottom: line } });
  }) }));
  return [
    para([run(t.title, { size: SZ.body, bold: true })], { after: 60, keepNext: true }),
    table([hdr, ...body], widths),
    ...(t.note ? [para([run(t.note, { size: SZ.small, color: T.muted })], { after: 20, before: 40 })] : []),
    sourceLine(t.source),
  ];
}

function figuresBand(figs: Fig[], accent: string, width = W): Table {
  const w = Math.floor(width / figs.length);
  const arrow = (t?: string) => (t === "up" ? " ↑" : t === "down" ? " ↓" : t === "flat" ? " →" : "");
  return table([new TableRow({ children: figs.map((f) => cell([
    f.missing ? para([needTag()], { after: 40 }) : para([run(f.value, { size: SZ.figure, bold: true }), run(arrow(f.trend), { size: SZ.sub, color: T.text2 })], { after: 0 }),
    para([run(f.unit || " ", { size: SZ.small, color: T.text2 })], { after: 20 }),
    para([run(f.label, { size: SZ.small, color: T.muted })], { after: 0 }),
  ], { w, pad: 120, borders: { ...NOB, left: { style: BorderStyle.SINGLE, size: 24, color: accent } } })) })], figs.map(() => w));
}

function bullets(items: string[]) {
  return items.map((b) => new Paragraph({ children: rich(b), bullet: { level: 0 }, spacing: { after: 60 } }));
}

function confRow(s: Section) {
  const col: Record<string, [string, string]> = { Measured: [T.paleCyan, T.teal], Calculated: [T.surface, T.text2], Estimated: [T.surface, T.slate], "Data needed": [T.amberBg, T.amberText] };
  return para([run("Confidence: ", { size: SZ.small, color: T.muted }), ...s.conf.flatMap((c) => [new TextRun({ text: ` ${c} `, size: SZ.small, bold: true, color: col[c][1], shading: fill(col[c][0]), font: T.font }), run("  ", { size: SZ.small })])], { after: 40 });
}

function headerBand(s: Section): Table {
  const badge = new ImageRun({ type: "png", data: Buffer.from(BADGE_PNG[s.n - 1], "base64"), transformation: { width: 54, height: 54 } });
  return table([new TableRow({ children: [
    cell([para([badge], { after: 0 })], { w: 1100, pad: 60, vAlign: VerticalAlign.CENTER as never }),
    cell([
      para([new TextRun({ text: ` Phase ${s.phase} · ${s.phaseName} `, size: SZ.small, bold: true, color: T.navy, shading: fill(T.surface), font: T.font })], { after: 60 }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(`Module ${s.n} · ${s.title}`, { size: SZ.title, bold: true })], spacing: { after: 0 } }),
    ], { w: W - 1100, pad: 60, vAlign: VerticalAlign.CENTER as never }),
  ] })], [1100, W - 1100], { ...NOB, bottom: { style: BorderStyle.SINGLE, size: 18, color: s.color } });
}

function moduleVisual(s: Section): (Paragraph | Table)[] {
  const v = s.visual, out: (Paragraph | Table)[] = [];
  if (v.facts) {
    const w = Math.floor(W / 5);
    out.push(table([new TableRow({ children: v.facts.map((f) => cell([
      para([run(f.label, { size: SZ.small, color: T.muted })], { after: 40 }),
      f.missing ? para([needTag()], { after: 0 }) : para([run(f.value, { size: SZ.sub, bold: true })], { after: 0 }),
      para([run(f.unit || " ", { size: SZ.small, color: T.text2 })], { after: 0 }),
    ], { w, pad: 120, shade: T.surface, borders: { ...NOB, top: { style: BorderStyle.SINGLE, size: 18, color: s.color }, right: { style: BorderStyle.SINGLE, size: 24, color: T.white } } })) })], v.facts.map(() => w)), sourceLine(s.sources[0]));
  }
  if (v.quotes) {
    for (const q of v.quotes) out.push(table([new TableRow({ children: [cell([
      para([run(q.label, { size: SZ.small, bold: true, color: T.teal })], { after: 40 }),
      para(rich(q.text === NEED ? NEED : `“${q.text}”`, { size: SZ.sub, italics: true }), { after: 0 }),
    ], { w: W, pad: 160, borders: { ...NOB, left: { style: BorderStyle.SINGLE, size: 36, color: s.color } } })] })], [W]), para([run("")], { after: 80 }));
  }
  if (v.cards?.length) {
    const per = 3, w = Math.floor(W / per);
    for (let i = 0; i < v.cards.length; i += per) {
      const chunk = v.cards.slice(i, i + per);
      out.push(table([new TableRow({ children: [...chunk, ...Array(per - chunk.length).fill(null)].map((c) => c ? cell([
        para([run(c.code, { size: SZ.small, bold: true, color: T.teal, font: T.mono })], { after: 20 }),
        para([run(c.title, { size: SZ.body, bold: true })], { after: 20 }),
        para(rich(c.text || NEED, { size: SZ.small, color: T.text2 }), { after: 0 }),
      ], { w, pad: 120, shade: T.surface, borders: { ...NOB, right: { style: BorderStyle.SINGLE, size: 24, color: T.white }, bottom: { style: BorderStyle.SINGLE, size: 24, color: T.white } } }) : cell([para([run("")])], { w })) })], Array(per).fill(w)));
    }
    out.push(sourceLine(s.sources[0]));
  }
  if (v.swot) {
    const w = Math.floor(W / 2);
    const q = (i: number) => {
      const x = v.swot![i];
      return cell([para([run(x.label, { size: SZ.body, bold: true, color: i % 2 ? T.amberText : T.teal })], { after: 40 }), ...(x.items.length ? x.items.map((t) => new Paragraph({ children: [run(t, { size: SZ.small })], bullet: { level: 0 }, spacing: { after: 20 } })) : [para([needTag()])])],
        { w, pad: 140, shade: i % 2 ? T.amberBg : T.paleCyan, borders: { ...NOB, right: { style: BorderStyle.SINGLE, size: 24, color: T.white }, bottom: { style: BorderStyle.SINGLE, size: 24, color: T.white } } });
    };
    out.push(para([run("SWOT: top three items per quadrant", { size: SZ.body, bold: true })], { after: 60 }),
      table([new TableRow({ children: [q(0), q(1)] }), new TableRow({ children: [q(2), q(3)] })], [w, w]), sourceLine(s.sources[0]));
  }
  if (v.cascade) {
    const w = Math.floor(W / 4);
    out.push(para([run("From objective to action", { size: SZ.body, bold: true })], { after: 60 }),
      table([new TableRow({ children: v.cascade.map((c, i) => cell([
        para([run(`${c.count || 0}`, { size: SZ.sub, bold: true }), run(`  ${c.label}${c.count === 1 ? "" : "s"}`, { size: SZ.small, color: T.text2 }), run(i < 3 ? "  →" : "", { size: SZ.body, color: s.color, bold: true })], { after: 20 }),
        para(c.example ? [run(c.example, { size: SZ.small, color: T.muted })] : [needTag()], { after: 0 }),
      ], { w, pad: 120, shade: T.surface, borders: { ...NOB, top: { style: BorderStyle.SINGLE, size: 18 + i * 6, color: s.color }, right: { style: BorderStyle.SINGLE, size: 24, color: T.white } } })) })], v.cascade.map(() => w)), sourceLine(s.sources[0]));
  }
  if (v.segments) {
    const w = Math.floor(W / 8);
    out.push(para([run(`Completeness by module: ${v.segments.filter((x) => x.done).length} of 8 approved`, { size: SZ.body, bold: true })], { after: 60 }),
      table([new TableRow({ children: v.segments.map((x) => cell([
        para([run(`M${x.n}`, { size: SZ.small, bold: true, color: x.done ? T.navy : T.text2 })], { after: 0 }),
        para([run(x.done ? "OK Approved" : x.status, { size: SZ.small - 2, color: x.done ? T.greenText : T.text2 })], { after: 0 }),
      ], { w, pad: 80, shade: x.done ? "EEF5E8" : T.surface, borders: { ...NOB, top: { style: BorderStyle.SINGLE, size: 30, color: x.done ? T.green : T.border }, right: { style: BorderStyle.SINGLE, size: 24, color: T.white } } })) })], v.segments.map(() => w)),
      sourceLine("Module review status in Business Plan Studio"));
  }
  for (const c of v.charts) out.push(...chartTable(c));
  if (v.table) out.push(...dataTable(v.table, W, 6));
  if (!out.length) out.push(para([needTag(), run("  No visual can be drawn until this module has data.", { color: T.text2 })]));
  return out;
}

function moduleSection(s: Section, firstInPhase: boolean): (Paragraph | Table)[] {
  const ph = PHASES[s.phase - 1];
  return [
    ...(firstInPhase
      ? [new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [run(`Phase ${ph.n} — ${ph.name}`, { size: SZ.sub, bold: true, color: T.teal })], spacing: { after: 120 } })]
      : [new Paragraph({ pageBreakBefore: true, children: [] })]),
    headerBand(s),
    para([run("")], { after: 60 }),
    para(rich(s.keyMessage, { size: SZ.sub, bold: true }), { after: 160 }),
    figuresBand(s.figures, s.color),
    para([run("")], { after: 120 }),
    ...moduleVisual(s),
    ...bullets(s.bullets),
    para([run("")], { after: 40 }),
    table([new TableRow({ children: [cell([
      para([run(`Sources: ${s.sources.join("; ")}`, { size: SZ.small, color: T.muted })], { after: 40 }),
      confRow(s),
    ], { w: W, pad: 80, borders: { ...NOB, top: { style: BorderStyle.SINGLE, size: 6, color: T.border } } })] })], [W]),
  ];
}

function cover(m: Model, logoPng: Buffer): Table {
  const content: Paragraph[] = [];
  const logos: ParagraphChild[] = [new ImageRun({ type: "png", data: logoPng, transformation: { width: 64, height: 64 } })];
  if (m.utility.logo) {
    const type = /png/.test(m.utility.logo.mime) ? "png" : /jpe?g/.test(m.utility.logo.mime) ? "jpg" : null;
    if (type) logos.unshift(new ImageRun({ type, data: m.utility.logo.buffer, transformation: { width: 96, height: 64 } }), new TextRun({ text: "     " }));
  }
  content.push(para(logos, { after: m.utility.logoIssue ? 120 : 3200 }));
  if (m.utility.logoIssue) content.push(para([new TextRun({ text: ` ${m.utility.logoIssue} `, size: SZ.small, bold: true, color: T.amberText, shading: fill(T.amberBg), font: T.font })], { after: 2900 }));
  content.push(para([run("Business Plan", { size: SZ.sub, color: T.cyan, bold: true })], { after: 60 }));
  content.push(para([run(`${m.period.start}–${m.period.end}`, { size: 72, bold: true, color: T.onNavy })], { after: 240 }));
  content.push(para([run(m.utility.name, { size: SZ.title + 8, bold: true, color: T.onNavy })], { after: 80 }));
  content.push(para([run([m.utility.city, m.utility.country].filter(Boolean).join(", "), { size: SZ.sub, color: T.onNavy2 })], { after: 2400 }));
  const meta: [string, string][] = [["Scenario", m.scenario.name], ["Date", m.date], ["Version", `v${m.version}`]];
  content.push(para(meta.flatMap(([k, v]) => [run(`${k}  `, { size: SZ.small, color: T.onNavy2 }), run(`${v}        `, { size: SZ.body, bold: true, color: T.onNavy })]), { after: 200 }));
  if (m.draft) content.push(para([new TextRun({ text: " Draft ", size: SZ.body, bold: true, color: T.navy, shading: fill(T.lime), font: T.font })]));
  return table([new TableRow({ height: { value: PAGE_H - 40, rule: HeightRule.EXACT }, children: [cell(content, { w: PAGE_W, shade: T.navy, pad: 1300, vAlign: VerticalAlign.TOP as never })] })], [PAGE_W]);
}

function staticToc(entries: TocEntry[]): Paragraph[] {
  return entries.map((e) => new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: W, leader: LeaderType.DOT }],
    spacing: { after: e.level === 1 ? 60 : 30, before: e.level === 1 ? 140 : 0 }, indent: { left: e.level === 2 ? 360 : 0 },
    children: [run(e.text, { size: e.level === 1 ? SZ.body : SZ.small + 2, bold: e.level === 1 }), new TextRun({ text: `\t${e.page ?? ""}`, size: SZ.small + 2, font: T.font, color: T.text2 })],
  }));
}

export function tocEntries(m: Model): TocEntry[] {
  const e: TocEntry[] = [{ text: "Executive summary", level: 1 }];
  for (const ph of PHASES) {
    e.push({ text: `Phase ${ph.n} — ${ph.name}`, level: 1 });
    for (const n of ph.modules) { const s = m.sections[n - 1]; e.push({ text: `Module ${s.n} · ${s.title}`, level: 2 }); }
  }
  e.push({ text: "Annexes", level: 1 });
  for (const a of m.annexes) e.push({ text: `Annex ${a.id} · ${a.title}`, level: 2 });
  return e;
}

/** Builds the DOCX. With `toc` given, a static TOC with page numbers is written (used for the PDF pass); otherwise a Word TOC field that updates on open. */
export async function renderDocx(m: Model, opts: { toc?: TocEntry[] } = {}): Promise<Buffer> {
  const logo = Buffer.from(APP_LOGO_PNG, "base64");
  for (const c of [m.summary.progress, ...m.sections.flatMap((x) => x.visual.charts)]) if (c) await prepareChart(c);
  const footer = new Footer({ children: [new Paragraph({ children: [
    new TextRun({ children: [`${m.utility.name} · Business Plan ${m.period.label} · Page `, PageNumber.CURRENT], size: SZ.small, color: T.muted, font: T.font }),
  ] })] });
  const s = m.summary;
  const body: (Paragraph | Table)[] = [];
  // TOC
  body.push(para([run("Contents", { size: SZ.title, bold: true })], { after: 200 }));
  if (opts.toc) body.push(...staticToc(opts.toc));
  else body.push(new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }) as unknown as Paragraph,
    para([run("Right-click the table and choose Update field if page numbers are missing.", { size: SZ.small, color: T.muted })]));
  // Executive summary
  body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [run("Executive summary", { size: SZ.title, bold: true })], spacing: { after: 200 } }));
  body.push(para([run(`Scenario: ${m.scenario.name}. ${m.scenario.note}`, { size: SZ.small, color: T.text2 })], { after: 200 }));
  if (s.messages.length) s.messages.forEach((msg, i) => body.push(table([new TableRow({ children: [
    cell([para([run(String(i + 1), { size: SZ.sub, bold: true, color: T.teal })], { after: 0 })], { w: 600, pad: 80 }),
    cell([para([run(msg, { size: SZ.sub })], { after: 0 })], { w: W - 600, pad: 80 }),
  ] })], [600, W - 600]), para([run("")], { after: 40 })));
  else body.push(para([needTag(), run("  Key messages need an executive summary in Module 8.", { color: T.text2 })], { after: 200 }));
  body.push(para([run("")], { after: 120 }), figuresBand(s.headline, T.cyan), para([run("")], { after: 200 }));
  if (s.progress) body.push(...chartTable(s.progress));
  else body.push(para([needTag(), run("  Progress toward targets needs KPI baselines and targets (Module 7).", { color: T.text2 })]));
  // Modules
  let lastPhase = 0;
  for (const sec of m.sections) { body.push(...moduleSection(sec, sec.phase !== lastPhase)); lastPhase = sec.phase; }
  // Annexes
  body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [run("Annexes", { size: SZ.title, bold: true })], spacing: { after: 200 } }));
  m.annexes.forEach((a, i) => {
    body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, pageBreakBefore: i > 0, children: [run(`Annex ${a.id} · ${a.title}`, { size: SZ.sub, bold: true })], spacing: { after: 160, before: 120 } }));
    for (const t of a.tables) body.push(...dataTable(t));
    for (const l of a.lines ?? []) body.push(para(rich(l)));
    if (!a.tables.length && !(a.lines ?? []).length) body.push(para([run("Nothing recorded.", { color: T.text2 })]));
  });

  const doc = new Document({
    creator: m.author, title: `${m.utility.name} Business Plan ${m.period.label}`, description: `Scenario ${m.scenario.name}, version ${m.version}`,
    features: { updateFields: !opts.toc },
    styles: {
      default: { document: { run: { font: T.font, size: SZ.body, color: T.text } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: T.font, bold: true, color: T.text }, paragraph: { spacing: { after: 120 } } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: T.font, bold: true, color: T.text } },
      ],
    },
    sections: [
      { properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: 0, right: 0, bottom: 0, left: 0, header: 0, footer: 0 } } }, children: [cover(m, logo)] },
      { properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } }, footers: { default: footer }, children: body },
    ],
  });
  return Packer.toBuffer(doc);
}
export { MODULE_COLORS };
