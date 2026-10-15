import { useState } from "react";
import { AlertTriangle, FlaskConical, RotateCcw } from "lucide-react";
import { inputCls } from "@/components/kit";
import { fmtN, fmtPct } from "@/components/plan-data";
import { cn } from "@/lib/utils";

type K = "volume" | "nrw" | "tariff" | "collection" | "opex";
const FIELDS: { k: K; label: string; unit: string; hint: string }[] = [
  { k: "volume", label: "Water produced", unit: "m³/year", hint: "Annual system input volume" },
  { k: "nrw", label: "Non-revenue water", unit: "%", hint: "0 to 100" },
  { k: "tariff", label: "Average tariff", unit: "PHP/m³", hint: "Average billed price" },
  { k: "collection", label: "Collection efficiency", unit: "%", hint: "0 to 100; not assumed" },
  { k: "opex", label: "Operating costs", unit: "PHP/year", hint: "Annual OPEX" },
];

const parse = (s: string): number | null => (s.trim() === "" ? null : Number.isFinite(Number(s)) ? Number(s) : NaN);

/** Temporary what-if sensitivity. Never saved, never written to module data. */
export function WhatIfSimulator() {
  const [v, setV] = useState<Record<K, string>>({ volume: "", nrw: "", tariff: "", collection: "", opex: "" });
  const n = Object.fromEntries(FIELDS.map((f) => [f.k, parse(v[f.k])])) as Record<K, number | null>;
  const warn: string[] = [];
  FIELDS.forEach((f) => { if (Number.isNaN(n[f.k])) warn.push(`${f.label} is not a number.`); });
  if (n.volume !== null && n.volume < 0) warn.push("Water produced cannot be negative.");
  if (n.nrw !== null && (n.nrw < 0 || n.nrw > 100)) warn.push("Non-revenue water must be between 0 and 100%.");
  if (n.collection !== null && (n.collection < 0 || n.collection > 100)) warn.push("Collection efficiency must be between 0 and 100%.");
  if (n.tariff !== null && n.tariff < 0) warn.push("Tariff cannot be negative.");
  if (n.opex !== null && n.opex < 0) warn.push("Operating costs cannot be negative.");
  if (n.opex === 0) warn.push("Operating costs are zero: cost coverage cannot be computed (division by zero).");
  const ok = (k: K) => n[k] !== null && !Number.isNaN(n[k]);
  const invalid = warn.length > 0;
  const billed = !invalid && ok("volume") && ok("nrw") ? n.volume! * (1 - n.nrw! / 100) : null;
  const revenue = billed !== null && ok("tariff") ? billed * n.tariff! : null;
  const collected = revenue !== null && ok("collection") ? revenue * (n.collection! / 100) : null;
  const coverage = collected !== null && ok("opex") && n.opex! > 0 ? collected / n.opex! : null;
  const sliderMax = Math.max(1_000_000, (ok("volume") ? n.volume! : 0) * 2);
  const missing = FIELDS.filter((f) => n[f.k] === null).map((f) => f.label.toLowerCase());

  return (
    <div className="rounded-xl border-2 border-dashed border-[#1ED3D9]/60 bg-[linear-gradient(135deg,#F2FCFC,#FFFFFF)] p-4 md:p-5" data-testid="card-simulator">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#323D4F] text-[#1ED3D9]"><FlaskConical className="h-4.5 w-4.5" /></div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-[15px] font-semibold text-[#323D4F]">What-if sensitivity</h3><span className="rounded-full bg-[#FF6A0D] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#29323F]">Temporary · not saved</span></div>
          <p className="mt-0.5 text-xs text-[#5B6678]">A scratchpad for testing sensitivities from values you type here. Results are not a financial forecast, do not change the supplied projections and disappear when you leave the page.</p>
        </div>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-xs font-medium text-[#323D4F] hover:bg-muted" onClick={() => setV({ volume: "", nrw: "", tariff: "", collection: "", opex: "" })} data-testid="button-sim-reset"><RotateCcw className="h-3.5 w-3.5" />Clear</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {FIELDS.map((f) => (
          <label key={f.k} className="block min-w-0">
            <span className="mb-1 block text-[11px] font-medium text-[#323D4F]">{f.label}</span>
            <div className="relative">
              <input type="number" step="any" inputMode="decimal" className={cn(inputCls, "tnum pr-16", Number.isNaN(n[f.k]) && "border-[#FF6A0D]")} placeholder="Enter value" value={v[f.k]} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} data-testid={`input-sim-${f.k}`} />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#6B7687]">{f.unit}</span>
            </div>
            {f.k === "volume" && <input type="range" min={0} max={sliderMax} step={sliderMax / 200} value={ok("volume") ? n.volume! : 0} onChange={(e) => setV({ ...v, volume: String(Math.round(Number(e.target.value))) })} className="mt-2 w-full accent-[#1ED3D9]" aria-label="Water produced slider" data-testid="slider-sim-volume" />}
            <span className="mt-0.5 block text-[10px] text-[#6B7687]">{f.hint}</span>
          </label>
        ))}
      </div>
      {warn.length > 0 && <ul className="mt-3 space-y-1" data-testid="text-sim-warnings">{warn.map((w, i) => <li key={i} className="flex gap-1.5 rounded-md bg-[#FFF1E8] px-2.5 py-1.5 text-xs text-[#9A3A05]"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{w}</li>)}</ul>}
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {[
          { l: "Billed volume", v: billed === null ? null : `${fmtN(billed)} m³`, f: "produced × (1 − NRW)" },
          { l: "Billed revenue", v: revenue === null ? null : `PHP ${fmtN(revenue)}`, f: "billed volume × tariff" },
          { l: "Collected revenue", v: collected === null ? null : `PHP ${fmtN(collected)}`, f: "billed revenue × collection" },
          { l: "Operating cost coverage", v: coverage === null ? null : fmtPct(coverage), f: "collected ÷ OPEX" },
        ].map((o) => (
          <div key={o.l} className="rounded-lg bg-[#323D4F] p-3 text-[#EEF2F6]" data-testid={`text-sim-${o.l.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="text-[10px] uppercase tracking-wider text-[#AEB8C6]">{o.l}</div>
            <div className={cn("mt-1 text-lg font-semibold tnum", o.v === null && "text-sm font-medium text-[#AEB8C6]")}>{o.v ?? "Needs inputs"}</div>
            <div className="text-[10px] text-[#AEB8C6]">{o.f}</div>
          </div>
        ))}
      </div>
      {missing.length > 0 && !invalid && <p className="mt-2 text-[11px] text-[#5B6678]">Waiting for: {missing.join(", ")}. Empty inputs are never replaced by defaults.</p>}
    </div>
  );
}
