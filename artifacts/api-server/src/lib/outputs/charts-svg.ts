/**
 * Chart graphics for the DOCX/PDF: SVG drawn from the (already complete) chart data, rasterised to PNG
 * with ImageMagick when present. Word gets the SVG with the PNG as fallback.
 * Inputs must have passed completeChart(): no null values are drawn.
 */
import { execFile } from "node:child_process";
import { T } from "./theme";
import type { Chart } from "./model";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const F = `font-family="Inter, sans-serif"`;
export function fmtNum(v: number, money: boolean) {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1)} B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)} M`;
  if (money && a >= 1e4) return `${(v / 1e3).toFixed(0)} k`;
  return a < 10 ? v.toFixed(2) : a < 100 ? v.toFixed(1) : Math.round(v).toLocaleString("en-US");
}
const DONUT = [T.cyan, T.slate, T.gray, T.orange];

export function chartSvg(c: Chart, W = 640, H = 280): string {
  const money = c.valueFmt === "money";
  const txt = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean } = {}) =>
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" ${F} font-size="${o.size ?? 11}" fill="#${o.color ?? T.text2}" text-anchor="${o.anchor ?? "start"}"${o.bold ? ' font-weight="700"' : ""}>${esc(s)}</text>`;
  const parts: string[] = [];
  const multi = c.series.length > 1 && c.kind !== "doughnut";
  let top = 8;
  if (multi) {
    let x = 0;
    c.series.forEach((s) => { parts.push(`<rect x="${x}" y="${top}" width="10" height="10" fill="#${s.color}"/>`, txt(x + 14, top + 9, s.name, { size: 11 })); x += 24 + s.name.length * 6.5; });
    top += 22;
  }
  if (c.kind === "doughnut") {
    const vals = c.series[0].values as number[], tot = vals.reduce((a, b) => a + b, 0) || 1;
    const cx = H / 2, cy = H / 2, r = H / 2 - 10, ri = r * 0.6;
    let a0 = -Math.PI / 2;
    vals.forEach((v, i) => {
      const a1 = a0 + (v / tot) * Math.PI * 2 - (vals.length > 1 ? 0.01 : 0);
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (rr: number, a: number) => `${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
      if (v > 0) parts.push(v >= tot ? `<circle cx="${cx}" cy="${cy}" r="${(r + ri) / 2}" fill="none" stroke="#${DONUT[i % 4]}" stroke-width="${r - ri}"/>`
        : `<path d="M ${p(r, a0)} A ${r} ${r} 0 ${large} 1 ${p(r, a1)} L ${p(ri, a1)} A ${ri} ${ri} 0 ${large} 0 ${p(ri, a0)} Z" fill="#${DONUT[i % 4]}"/>`);
      a0 = a1 + (vals.length > 1 ? 0.01 : 0);
    });
    c.labels.forEach((l, i) => {
      const y = 40 + i * 34;
      parts.push(`<rect x="${H + 30}" y="${y - 11}" width="12" height="12" fill="#${DONUT[i % 4]}"/>`, txt(H + 50, y, l, { size: 13, color: T.text }),
        txt(W - 4, y, `${fmtNum(vals[i], money)}  (${((vals[i] / tot) * 100).toFixed(1)}%)`, { size: 13, anchor: "end", bold: true, color: T.text }));
    });
  } else if (c.kind === "hbar") {
    const vals = c.series[0].values as number[], max = Math.max(...vals, 1e-9);
    const labW = W * 0.38, valW = 70, rowH = Math.min(36, (H - top) / c.labels.length);
    c.labels.forEach((l, i) => {
      const y = top + i * rowH, bw = Math.max(2, (vals[i] / max) * (W - labW - valW - 10));
      const lab = l.length > 44 ? l.slice(0, 43) + "…" : l;
      parts.push(txt(labW - 8, y + rowH / 2 + 4, lab, { anchor: "end" }), `<rect x="${labW}" y="${y + rowH * 0.2}" width="${bw.toFixed(1)}" height="${(rowH * 0.6).toFixed(1)}" fill="#${c.series[0].color}"/>`,
        txt(labW + bw + 6, y + rowH / 2 + 4, fmtNum(vals[i], money), { bold: true, color: T.text }));
    });
  } else {
    const n = c.labels.length, left = 8, bottom = H - 24, plotH = bottom - top - 18;
    const totals = c.labels.map((_, i) => (c.kind === "stacked" ? c.series.reduce((a, s) => a + (s.values[i] as number), 0) : Math.max(...c.series.map((s) => s.values[i] as number))));
    const all = c.series.flatMap((s) => s.values as number[]);
    parts.push(`<line x1="${left}" y1="${bottom}" x2="${W}" y2="${bottom}" stroke="#${T.border}" stroke-width="1"/>`);
    const slot = (W - left) / n;
    if (c.kind === "line") {
      const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo || Math.abs(hi) || 1) * 0.25;
      const y = (v: number) => bottom - 6 - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * (plotH - 6);
      c.series.forEach((s) => {
        const pts = (s.values as number[]).map((v, i) => [left + slot * (i + 0.5), y(v)]);
        parts.push(`<polyline points="${pts.map((p) => p.map((q) => q.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="#${s.color === T.cyan ? T.teal : s.color}" stroke-width="2.5"/>`);
        pts.forEach(([px, py], i) => parts.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="#${s.color}"/>`, txt(px, py - 9, fmtNum(s.values[i] as number, money), { anchor: "middle", bold: i === pts.length - 1, color: T.text })));
      });
    } else {
      const max = Math.max(...totals, 1e-9);
      const groups = c.kind === "stacked" ? 1 : c.series.length, bw = Math.min(56, (slot * 0.7) / groups);
      c.labels.forEach((_, i) => {
        const x0 = left + slot * i + (slot - bw * groups) / 2;
        let acc = 0;
        c.series.forEach((s, si) => {
          const v = s.values[i] as number, h = (Math.max(0, v) / max) * plotH;
          const x = c.kind === "stacked" ? x0 : x0 + si * bw, y = bottom - (c.kind === "stacked" ? acc : 0) - h;
          parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" fill="#${s.color}"/>`);
          if (c.kind !== "stacked") parts.push(txt(x + bw / 2 - 1, y - 4, fmtNum(v, money), { anchor: "middle", size: 10, color: T.text, bold: true }));
          acc += h;
        });
        if (c.kind === "stacked") parts.push(txt(x0 + bw / 2, bottom - acc - 4, fmtNum(totals[i], money), { anchor: "middle", size: 10, color: T.text, bold: true }));
      });
    }
    c.labels.forEach((l, i) => parts.push(txt(left + slot * (i + 0.5), H - 8, l, { anchor: "middle", size: 11 })));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#FFFFFF"/>${parts.join("")}</svg>`;
}

/** 1x1 white PNG, used only as the Word fallback when ImageMagick is not installed (Word renders the SVG). */
export const BLANK_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4//8/AwAI/AL+XJ/PZwAAAABJRU5ErkJggg==", "base64");

let magick: boolean | undefined;
export function svgToPng(svg: string, density = 192): Promise<Buffer | null> {
  if (magick === false) return Promise.resolve(null);
  return new Promise((resolve) => {
    const p = execFile("magick", ["-density", String(density), "-background", "white", "svg:-", "png:-"], { encoding: "buffer", maxBuffer: 32 * 1024 * 1024, timeout: 30000 }, (err, out) => {
      if (err || !out?.length) { if ((err as NodeJS.ErrnoException | null)?.code === "ENOENT") magick = false; resolve(null); } else { magick = true; resolve(out as Buffer); }
    });
    p.stdin?.end(svg);
  });
}
