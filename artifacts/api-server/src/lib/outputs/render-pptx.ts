import pptxgen from "pptxgenjs";
import { APP_LOGO_PNG, BADGE_PNG } from "./assets";
import { NEED, bodyWords, cap, completeChart, type Chart, type Fig, type Model, type Section } from "./model";
import { PHASES, T } from "./theme";

/*
 * 16:9, 13.333 x 7.5 in, 0.5 in margins. Three sizes per slide: title 24, figure 40, body 12.
 * Body cap: at most 25 words of body text per slide (title, phase tag, footer and source are not body;
 * numeric tokens are not words). Anything that does not fit goes to the speaker notes.
 * The cover is exempt. Module slides show 3 headline figures; the plan-on-one-page slide shows 4.
 */
const SW = 13.333, M = 0.5, CW = SW - 2 * M, CAP = 25;
const F = { title: 24, fig: 40, body: 12, small: 9 };
const png = (b64: string) => `image/png;base64,${b64}`;

export function fitText(text: string, w: number, h: number, pt: number): { text: string; overflow: string } {
  const cpl = Math.max(1, Math.floor((w * 72) / (pt * 0.53)));
  const maxLines = Math.max(1, Math.floor((h * 72) / (pt * 1.25)));
  const lines = (t: string) => t.split("\n").reduce((a, p) => a + Math.max(1, Math.ceil(p.length / cpl)), 0);
  if (lines(text) <= maxLines) return { text, overflow: "" };
  const words = text.split(/\s+/);
  while (words.length > 1 && lines(words.join(" ") + "…") > maxLines) words.pop();
  return { text: words.join(" ").replace(/[,;:.]+$/, "") + "…", overflow: text };
}

class Budget {
  used = 0;
  constructor(public max = CAP) {}
  fits(t: string) { return this.used + bodyWords(t) <= this.max; }
  take(t: string) { if (!this.fits(t)) return false; this.used += bodyWords(t); return true; }
  /** Longest word-prefix of t that fits (at least `min` words), or "" */
  prefix(t: string, min = 3) {
    const w = t.split(/\s+/);
    for (let n = w.length; n >= min; n--) { const s = n < w.length ? w.slice(0, n).join(" ").replace(/[,;:.]+$/, "") + "…" : t; if (this.take(s)) return s; }
    return "";
  }
}
type Slide = ReturnType<pptxgen["addSlide"]>;

export async function renderPptx(m: Model): Promise<{ buffer: Buffer; slideCount: number; overflow: string[]; bodyWords: number[] }> {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.author = m.author; pres.company = m.utility.name; pres.title = `${m.utility.name} Executive Deck ${m.period.label}`;
  pres.theme = { headFontFace: T.font, bodyFontFace: T.font };
  const overflowLog: string[] = [], words: number[] = [];
  let n = 0;

  const text = (s: Slide, t: string, o: { x: number; y: number; w: number; h: number; size?: number; bold?: boolean; color?: string; italic?: boolean; notes?: string[]; align?: "left" | "right" | "center" }) => {
    const size = o.size ?? F.body;
    const fit = fitText(t, o.w, o.h, size);
    if (fit.overflow) { overflowLog.push(fit.overflow); o.notes?.push(fit.overflow); }
    const isNeed = fit.text === NEED;
    s.addText(fit.text, { x: o.x, y: o.y, w: o.w, h: o.h, fontFace: T.font, fontSize: isNeed ? F.body : size, bold: o.bold || isNeed, italic: o.italic, color: isNeed ? T.amberText : o.color ?? T.text, valign: "top", margin: 0, align: o.align ?? "left", fit: "none", ...(isNeed ? { fill: { color: T.amberBg } } : {}) });
  };
  const needTag = (s: Slide, x: number, y: number) => s.addText(NEED, { x, y, w: 1.35, h: 0.32, fontFace: T.font, fontSize: F.body, bold: true, color: T.amberText, fill: { color: T.amberBg }, align: "center", valign: "middle", margin: 0 });
  const rule = (s: Slide, y: number, color: string) => s.addShape(pres.ShapeType.rect, { x: M, y, w: CW, h: 0.05, fill: { color }, line: { color, width: 0 } });
  const footer = (s: Slide, sources: string[], dark = false) => {
    const col = dark ? T.onNavy2 : T.muted;
    s.addText(`${m.utility.name} · ${m.period.label} · ${n}`, { x: M, y: 7.0, w: 5.2, h: 0.3, fontFace: T.font, fontSize: F.small, color: col, margin: 0, valign: "middle" });
    if (sources.length) s.addText(fitText(`Source: ${Array.from(new Set(sources)).join("; ")}`, 7.0, 0.3, F.small - 1).text, { x: SW - M - 7.0, y: 7.0, w: 7.0, h: 0.3, fontFace: T.font, fontSize: F.small - 1, color: col, margin: 0, align: "right", valign: "middle" });
  };
  const finish = (s: Slide, b: Budget | null, items: string[]) => {
    words.push(b ? b.used : 0);
    const list = Array.from(new Set(items.filter(Boolean))).slice(0, 5);
    const pad = [`Scenario: ${m.scenario.name}. ${m.scenario.note}`, `Plan period ${m.period.label}; version ${m.version}, ${m.date}.`, `${m.missing.length} data items are still needed across the plan.`];
    for (const p of pad) if (list.length < 3) list.push(p);
    s.addNotes(list.map((x) => `- ${x}`).join("\n"));
  };
  const add = () => { n++; return pres.addSlide(); };
  const title = (s: Slide, t: string, color: string, nts: string[]) => { text(s, t, { x: M, y: 0.45, w: CW, h: 0.95, size: F.title, bold: true, notes: nts }); rule(s, 1.45, color); };

  /** Headline figures: value + label of at most 3 words. Missing value shows the amber tag. */
  const figure = (s: Slide, f: Fig, x: number, y: number, w: number, accent: string, b: Budget, nts: string[]) => {
    s.addShape(pres.ShapeType.rect, { x, y, w: 0.06, h: 1.25, fill: { color: accent }, line: { color: accent, width: 0 } });
    const unit = f.unit && bodyWords(f.unit) <= 1 && f.unit.length <= 8 ? ` ${f.unit}` : "";
    if (f.missing || f.value === NEED) { b.take(NEED); needTag(s, x + 0.2, y + 0.15); }
    else {
      const v = `${f.value}${f.trend === "up" ? " ↑" : f.trend === "down" ? " ↓" : ""}`;
      const u = unit && b.take(unit) ? unit : "";
      s.addText([{ text: v, options: { fontSize: v.length > 9 ? 28 : F.fig, bold: true, color: T.text } }, { text: u, options: { fontSize: F.body, color: T.text2 } }], { x: x + 0.2, y, w: w - 0.2, h: 0.75, fontFace: T.font, margin: 0, valign: "bottom" });
    }
    const lab = cap(f.label, 3);
    if (b.take(lab)) text(s, lab, { x: x + 0.2, y: y + 0.82, w: w - 0.2, h: 0.4, size: F.small + 2, color: T.text2 });
    nts.push(`${f.label}: ${f.missing ? NEED : `${f.value} ${f.unit}`.trim()} (${f.conf}).`);
  };

  /** Native chart. Missing values are never drawn as zero: incomplete categories are dropped (listed in notes); if too little is left the chart is omitted. */
  const chart = (s: Slide, c: Chart, x: number, y: number, w: number, h: number, b: Budget, nts: string[], o: { heading?: string; shortLabels?: boolean } = {}): boolean => {
    const { chart: cc, dropped } = completeChart(c);
    if (dropped.length) nts.push(`${c.title}: not shown because values are missing for ${dropped.join(", ")}.`);
    if (!cc) { needTag(s, x, y + 0.1); b.take(NEED); nts.push(`${c.title}: chart omitted, data needed.`); return false; }
    const labels = o.shortLabels ? cc.labels.map((l) => l.split(/\s+/)[0]) : cc.labels;
    if (o.shortLabels) nts.push(...cc.labels.map((l, i) => `${l}: ${cc.series[0].values[i]?.toLocaleString("en-US")} ${cc.unit}`));
    const maxV = Math.max(...cc.series.flatMap((se) => se.values.map((v) => Math.abs(v as number))));
    const scale = maxV >= 1e6 ? 1e6 : 1;
    const unit = scale > 1 ? `${cc.unit} M` : cc.unit;
    const legend = cc.series.length > 1 || cc.kind === "doughnut";
    // budget: heading, unit, category labels, legend names
    const need = [o.heading ?? "", cc.kind === "doughnut" ? "" : unit, ...labels, ...(legend && cc.kind !== "doughnut" ? cc.series.map((x) => x.name) : [])].join(" ");
    if (!b.fits(need)) { nts.push(`${c.title} (chart moved to notes to keep the slide short).`); return false; }
    b.take(need);
    let yy = y;
    if (o.heading) { text(s, o.heading, { x, y, w, h: 0.35, size: F.body, bold: true }); yy += 0.4; }
    const data = cc.series.map((se) => ({ name: se.name, labels, values: se.values.map((v) => Math.round(((v as number) / scale) * 100) / 100) }));
    const common = {
      x, y: yy, w, h: h - (yy - y), fontFace: T.font, showTitle: false, showValue: true, dataLabelFormatCode: scale > 1 || maxV < 100 ? "#,##0.0" : "#,##0", dataLabelFontSize: 10, dataLabelColor: T.text,
      catAxisLabelFontFace: T.font, catAxisLabelFontSize: 10, catAxisLabelColor: T.text2, valAxisHidden: true, valGridLine: { style: "none" as const }, valAxisLineShow: false,
      chartColors: cc.series.map((se) => se.color), showLegend: legend, legendPos: "b" as const, legendFontFace: T.font, legendFontSize: 10, legendColor: T.text2,
      showValAxisTitle: false,
    };
    if (cc.kind === "doughnut") s.addChart(pres.ChartType.doughnut, [{ name: cc.series[0].name, labels, values: data[0].values }], { ...common, chartColors: [T.cyan, T.slate, T.gray, T.orange], showPercent: false, showValue: true, holeSize: 58, legendPos: "r", dataLabelColor: T.navy });
    else if (cc.kind === "line") s.addChart(pres.ChartType.line, data, { ...common, chartColors: cc.series.map((se) => (se.color === T.cyan ? T.teal : se.color)), lineSize: 2, lineDataSymbol: "circle", lineDataSymbolSize: 7, dataLabelPosition: "t" });
    else s.addChart(pres.ChartType.bar, data, { ...common, barDir: cc.kind === "hbar" ? "bar" : "col", barGrouping: cc.kind === "stacked" ? "stacked" : "clustered", barGapWidthPct: 60, catAxisOrientation: (cc.kind === "hbar" ? "maxMin" : "minMax") as "minMax", dataLabelPosition: cc.kind === "stacked" ? "ctr" : "outEnd" });
    if (cc.kind !== "doughnut") s.addText(unit, { x, y: yy - 0.02, w: 2.5, h: 0.25, fontFace: T.font, fontSize: F.small, color: T.muted, margin: 0, align: "left" });
    return true;
  };

  /* 1 Cover (exempt from body cap) */
  {
    const s = add();
    s.background = { color: T.navy };
    s.addImage({ data: png(APP_LOGO_PNG), x: M, y: 0.5, w: 0.8, h: 0.8 });
    if (m.utility.logo && /png|jpe?g/.test(m.utility.logo.mime)) s.addImage({ data: `${m.utility.logo.mime};base64,${m.utility.logo.buffer.toString("base64")}`, x: SW - M - 1.6, y: 0.5, w: 1.6, h: 0.8, sizing: { type: "contain", w: 1.6, h: 0.8 } });
    else if (m.utility.logoIssue) s.addText(m.utility.logoIssue, { x: SW - M - 3.6, y: 0.7, w: 3.6, h: 0.4, fontFace: T.font, fontSize: F.small, bold: true, color: T.amberText, fill: { color: T.amberBg }, align: "center", valign: "middle", margin: 0 });
    text(s, "Executive Deck", { x: M, y: 2.2, w: 8, h: 0.4, size: F.body + 2, color: T.cyan, bold: true });
    text(s, `Business Plan ${m.period.label}`, { x: M, y: 2.65, w: CW, h: 1.0, size: F.fig, bold: true, color: T.onNavy });
    text(s, m.utility.name, { x: M, y: 3.75, w: CW, h: 0.6, size: F.title, bold: true, color: T.onNavy });
    text(s, [m.utility.city, m.utility.country].filter(Boolean).join(", "), { x: M, y: 4.4, w: CW, h: 0.4, size: F.body + 2, color: T.onNavy2 });
    s.addText(`Scenario ${m.scenario.name}   ·   ${m.date}   ·   v${m.version}`, { x: M, y: 6.1, w: 8, h: 0.35, fontFace: T.font, fontSize: F.body, color: T.onNavy, margin: 0 });
    if (m.draft) s.addText("Draft", { x: SW - M - 1.0, y: 6.1, w: 1.0, h: 0.35, fontFace: T.font, fontSize: F.body, bold: true, color: T.navy, fill: { color: T.lime }, align: "center", margin: 0 });
    footer(s, [], true);
    finish(s, null, [`Prepared by ${m.author}.`, m.scenario.note, m.draft ? "Draft until all eight modules are approved." : "All eight modules are approved."]);
  }

  /* 2 Plan on one page: 4 headline figures (exception), then key messages within the remaining budget */
  {
    const s = add(); const nts: string[] = []; const b = new Budget();
    title(s, "The plan on one page", T.cyan, nts);
    const fw = CW / 4;
    m.summary.headline.slice(0, 4).forEach((f, i) => figure(s, { ...f, label: cap(f.label, 2) }, M + i * fw, 4.85, fw - 0.15, [T.cyan, T.teal, T.limeChart, T.orange][i], b, nts));
    const msgs = m.summary.messages;
    if (!msgs.length) { needTag(s, M, 1.8); b.take(NEED); nts.push("Key messages need an executive summary in Module 8."); }
    msgs.forEach((msg, i) => {
      const remainingMessages = msgs.length - i;
      const remainingBudget = Math.max(0, b.max - b.used);
      const shown = b.prefix(cap(msg, Math.max(1, Math.floor(remainingBudget / remainingMessages))), 1);
      if (shown !== msg) nts.push(msg);
      if (!shown) return;
      s.addText(String(i + 1), { x: M, y: 1.8 + i * 0.95, w: 0.5, h: 0.6, fontFace: T.font, fontSize: F.title, bold: true, color: T.teal, margin: 0 });
      text(s, shown, { x: M + 0.6, y: 1.85 + i * 0.95, w: CW - 0.6, h: 0.8, size: F.body + 6 });
    });
    footer(s, [m.summary.source]);
    finish(s, b, [...nts, m.scenario.note]);
  }

  /* 3 Agenda: phase numbers + module titles only (phase names in notes) */
  {
    const s = add(); const b = new Budget();
    title(s, "Four phases, eight modules", T.cyan, []);
    const colW = CW / 4;
    PHASES.forEach((ph, i) => {
      const x = M + i * colW;
      s.addText(String(ph.n), { x, y: 1.8, w: 0.8, h: 0.8, fontFace: T.font, fontSize: F.fig, bold: true, color: T.teal, margin: 0 });
      ph.modules.forEach((mn, j) => {
        const sec = m.sections[mn - 1];
        s.addImage({ data: png(BADGE_PNG[mn - 1]), x, y: 3.0 + j * 1.3, w: 0.55, h: 0.55 });
        if (b.take(sec.title)) text(s, sec.title, { x: x + 0.7, y: 3.08 + j * 1.3, w: colW - 1.0, h: 0.7, size: F.body + 2 });
      });
    });
    footer(s, ["Module status in Business Plan Studio"]);
    finish(s, b, [...PHASES.map((ph) => `Phase ${ph.n}, ${ph.name}: modules ${ph.modules.join(" and ")}.`), m.sections.some((x) => !x.hasData) ? `Modules without data are skipped: ${m.sections.filter((x) => !x.hasData).map((x) => x.n).join(", ")}.` : ""]);
  }

  /* Module slides (skipped when the module has no data) */
  for (const sec of m.sections) {
    if (!sec.hasData) continue;
    const s = add(); const nts: string[] = []; const b = new Budget();
    moduleHeader(s, sec, nts);
    sec.figures.slice(0, 3).forEach((f, i) => figure(s, f, M, 2.05 + i * 1.6, 3.4, sec.color, b, nts));
    const vx = 4.3, vy = 2.05, vw = SW - M - vx, vh = 4.7, v = sec.visual;
    let drawn = false;
    if (v.deckChart) drawn = chart(s, v.deckChart, vx, vy, vw, vh, b, nts);
    else if (sec.n === 3 && v.charts[0]) drawn = chart(s, v.charts[0], vx, vy, vw, vh, b, nts);
    else if (sec.n === 4 && v.charts[0]) drawn = chart(s, v.charts[0], vx, vy, vw, vh, b, nts, { shortLabels: true });
    else if ((sec.n === 5 || sec.n === 6) && v.charts[0]) drawn = chart(s, v.charts[0], vx, vy, vw, vh, b, nts);
    if (!drawn && v.facts) {
      const cw = vw / 3 - 0.1; let k = 0;
      for (const f of v.facts) {
        if (f.missing || bodyWords(f.value) > 3) { nts.push(`${f.label}: ${f.missing ? NEED : f.value} ${f.unit}`.trim()); continue; }
        const lab = cap(f.label, 2);
        if (!b.take(`${lab} ${f.value}`)) { nts.push(`${f.label}: ${f.value} ${f.unit}`.trim()); continue; }
        const x = vx + (k % 3) * (cw + 0.15), y = vy + Math.floor(k / 3) * 2.2; k++;
        s.addShape(pres.ShapeType.rect, { x, y, w: cw, h: 2.0, fill: { color: T.surface }, line: { color: T.surface, width: 0 } });
        s.addShape(pres.ShapeType.rect, { x, y, w: cw, h: 0.06, fill: { color: sec.color }, line: { color: sec.color, width: 0 } });
        text(s, lab, { x: x + 0.2, y: y + 0.3, w: cw - 0.4, h: 0.3, size: F.small + 2, color: T.text2 });
        text(s, f.value, { x: x + 0.2, y: y + 0.75, w: cw - 0.4, h: 0.9, size: F.title, bold: true });
      }
      drawn = k > 0;
    }
    if (!drawn && v.cards?.length) {
      const cards = v.cards.slice(0, 5); const cw = vw / cards.length - 0.1; let k = 0;
      for (const c of cards) {
        const t = cap(c.title, 3);
        if (!b.take(t)) break;
        const x = vx + k * (cw + 0.12); k++;
        s.addShape(pres.ShapeType.rect, { x, y: vy + 0.6, w: cw, h: 2.2, fill: { color: T.surface }, line: { color: T.surface, width: 0 } });
        s.addShape(pres.ShapeType.rect, { x, y: vy + 0.6, w: cw, h: 0.06, fill: { color: sec.color }, line: { color: sec.color, width: 0 } });
        text(s, t, { x: x + 0.15, y: vy + 0.9, w: cw - 0.3, h: 1.2, size: F.body + 2, bold: true });
      }
      nts.push(...(v.quotes ?? []).map((q) => `${q.label}: ${q.text}`), ...v.cards.map((c) => `${c.code} ${c.title}: ${c.text}`));
      drawn = k > 0;
    }
    if (!drawn && v.swot) {
      const cw = vw / 2 - 0.08, ch = 2.2; let k = 0;
      v.swot.forEach((q, i) => {
        const x = vx + (i % 2) * (cw + 0.16), y = vy + Math.floor(i / 2) * (ch + 0.15);
        s.addShape(pres.ShapeType.rect, { x, y, w: cw, h: ch, fill: { color: i % 2 ? T.amberBg : T.paleCyan }, line: { width: 0, color: T.white } });
        if (b.take(q.label)) text(s, q.label, { x: x + 0.2, y: y + 0.15, w: cw - 0.4, h: 0.32, size: F.body, bold: true, color: i % 2 ? T.amberText : T.teal });
        const first = q.items[0] ? b.prefix(q.items[0], 2) : "";
        if (first) { text(s, first, { x: x + 0.2, y: y + 0.6, w: cw - 0.4, h: 1.4, size: F.body + 2 }); k++; }
        else if (!q.items.length) needTag(s, x + 0.2, y + 0.6);
        nts.push(`${q.label}: ${q.items.join("; ") || NEED}`);
      });
      drawn = true; void k;
    }
    if (!drawn && v.segments) {
      const cw = vw / 8;
      v.segments.forEach((x, i) => {
        s.addShape(pres.ShapeType.rect, { x: vx + i * cw, y: vy + 0.5, w: cw - 0.06, h: 0.9, fill: { color: x.done ? T.green : T.border }, line: { width: 0, color: T.white } });
        s.addText(String(x.n), { x: vx + i * cw, y: vy + 0.5, w: cw - 0.06, h: 0.9, fontFace: T.font, fontSize: F.title, bold: true, color: T.navy, align: "center", valign: "middle", margin: 0 });
      });
      b.take("Green approved");
      text(s, "Green = approved", { x: vx, y: vy + 1.55, w: vw, h: 0.3, size: F.small + 2, color: T.text2 });
      nts.push(...v.segments.map((x) => `Module ${x.n} ${x.title}: ${x.status}.`).slice(0, 2), ...m.decisions.issues);
      drawn = true;
    }
    if (!drawn) { needTag(s, vx, vy); b.take(NEED); }
    if (v.table) nts.push(`${v.table.title}: ${v.table.rows.map((r) => r.filter(Boolean).join(", ")).join(" | ")}`);
    nts.push(...v.charts.filter((c) => c !== v.charts[0] || !drawn).map((c) => `${c.title} (${c.unit}).`));
    footer(s, sec.sources);
    finish(s, b, [...sec.bullets, ...nts, ...sec.notes]);
  }

  function moduleHeader(s: Slide, sec: Section, nts: string[]) {
    s.addImage({ data: png(BADGE_PNG[sec.n - 1]), x: M, y: 0.42, w: 0.8, h: 0.8 });
    s.addText([{ text: `Phase ${sec.phase} · ${sec.phaseName}`, options: { color: T.teal, bold: true } }, { text: `   Module ${sec.n} · ${sec.title}`, options: { color: T.text2 } }],
      { x: 1.5, y: 0.4, w: CW - 1.0, h: 0.3, fontFace: T.font, fontSize: F.small + 1, margin: 0 });
    text(s, sec.keyMessage, { x: 1.5, y: 0.72, w: CW - 1.0, h: 0.95, size: F.title - 2, bold: true, notes: nts });
    rule(s, 1.78, sec.color);
  }

  /* Investment and funding */
  if (m.investment.chart || m.investment.funding) {
    const s = add(); const nts: string[] = []; const b = new Budget();
    title(s, m.investment.chart?.title ?? m.investment.funding!.title, T.orange, nts);
    const half = (CW - 0.4) / 2;
    const cs = [m.investment.chart ? { c: m.investment.chart, h: "Investment by year" } : null, m.investment.funding ? { c: m.investment.funding, h: m.investment.funding.kind === "doughnut" ? "Operating costs" : "Funding by year" } : null].filter(Boolean) as { c: Chart; h: string }[];
    cs.forEach(({ c, h }, i) => chart(s, c, M + i * (half + 0.4), 1.8, cs.length === 1 ? CW : half, 5.0, b, nts, { heading: h }));
    footer(s, cs.map((x) => x.c.source));
    finish(s, b, [...nts, ...m.investment.notes]);
  }
  /* Tariff and affordability */
  if (m.tariff.chart || m.tariff.bills) {
    const s = add(); const nts: string[] = []; const b = new Budget();
    title(s, m.sections[5].keyMessage, T.slate, nts);
    const half = (CW - 0.4) / 2;
    const cs = [m.tariff.chart ? { c: m.tariff.chart, h: "Average tariff" } : null, m.tariff.bills ? { c: m.tariff.bills, h: "Monthly bill" } : null].filter(Boolean) as { c: Chart; h: string }[];
    cs.forEach(({ c, h }, i) => chart(s, c, M + i * (half + 0.4), 1.8, cs.length === 1 ? CW : half, 5.0, b, nts, { heading: h }));
    footer(s, cs.map((x) => x.c.source));
    finish(s, b, [...nts, ...m.tariff.notes]);
  }
  /* Decisions needed and next steps */
  {
    const s = add(); const nts: string[] = []; const b = new Budget();
    title(s, "Decisions needed and next steps", T.cyan, nts);
    b.take("Decide Next steps");
    text(s, "Decide", { x: M, y: 1.75, w: 4.2, h: 0.35, size: F.body, bold: true, color: T.teal });
    const iss = m.decisions.issues.length ? m.decisions.issues : [m.missing.length ? `Provide ${m.missing.length} missing data items` : "No open decisions recorded"];
    let k = 0;
    for (const t of iss.slice(0, 3)) {
      const short = b.prefix(cap(t, 6), 2);
      nts.push(t);
      if (!short) break;
      s.addShape(pres.ShapeType.rect, { x: M, y: 2.2 + k * 1.3, w: 4.2, h: 1.1, fill: { color: T.amberBg }, line: { width: 0, color: T.white } });
      text(s, short, { x: M + 0.2, y: 2.32 + k * 1.3, w: 3.8, h: 0.9, size: F.body + 2, bold: true, color: T.amberText });
      k++;
    }
    const tx = M + 4.7, tw = CW - 4.7;
    text(s, "Next steps", { x: tx, y: 1.75, w: tw, h: 0.35, size: F.body, bold: true, color: T.teal });
    const steps = m.decisions.steps;
    if (!steps.length) { needTag(s, tx, 2.2); b.take(NEED); }
    let r = 0;
    for (const st of steps.slice(0, 5)) {
      nts.push(`${st.what}: ${st.owner}, ${st.date}`);
      const code = st.what.split(/\s+/)[0];
      const owner = st.owner === NEED ? NEED : cap(st.owner, 2);
      if (!b.take(`${code} ${owner} ${st.date}`)) break;
      const y = 2.2 + r * 0.7; r++;
      s.addShape(pres.ShapeType.rect, { x: tx, y: y + 0.6, w: tw, h: 0.01, fill: { color: T.border }, line: { width: 0, color: T.border } });
      text(s, code, { x: tx, y: y + 0.12, w: tw * 0.35, h: 0.4, size: F.body + 2, bold: true });
      text(s, owner, { x: tx + tw * 0.35, y: y + 0.12, w: tw * 0.4, h: 0.4, size: F.body + 2, color: owner === NEED ? T.amberText : T.text });
      text(s, st.date === NEED ? NEED : st.date, { x: tx + tw * 0.75, y: y + 0.12, w: tw * 0.25, h: 0.4, size: F.body + 2, color: T.text2 });
    }
    footer(s, [m.summary.source]);
    finish(s, b, [...nts, ...m.decisions.notes]);
  }

  const buffer = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
  return { buffer, slideCount: n, overflow: overflowLog, bodyWords: words };
}
