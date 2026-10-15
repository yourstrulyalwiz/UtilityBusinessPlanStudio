import { Plus, Trash2 } from "lucide-react";
import { inputCls } from "@/components/kit";
import { cn } from "@/lib/utils";

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export const isObj = (v: unknown): v is Record<string, Json> => !!v && typeof v === "object" && !Array.isArray(v);

/** Blank value mirroring the example's shape and primitive types. Arrays start empty. */
export function blankFrom(ex: unknown): Json {
  if (Array.isArray(ex)) return [];
  if (isObj(ex)) return Object.fromEntries(Object.entries(ex).map(([k, v]) => [k, blankFrom(v)]));
  if (typeof ex === "number") return null;
  if (typeof ex === "boolean") return false;
  return "";
}

/** Merge saved data over blank example shape so every original key is present. */
export function mergeShape(ex: unknown, data: unknown): Json {
  if (data === null) return null;
  if (isObj(ex)) {
    const d = isObj(data) ? data : {};
    const out: Record<string, Json> = {};
    for (const k of Object.keys(ex)) out[k] = mergeShape(ex[k], d[k]);
    for (const k of Object.keys(d)) if (!(k in out)) out[k] = d[k];
    return out;
  }
  if (Array.isArray(ex)) return Array.isArray(data) ? (data as Json[]) : [];
  if (data === undefined) return blankFrom(ex);
  return data as Json;
}

export function meaningful(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (isObj(v) && "value" in v && "gap_note" in v) return meaningful(v.value);
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "boolean") return true;
  if (Array.isArray(v)) return v.some(meaningful);
  if (isObj(v)) return Object.values(v).some(meaningful);
  return false;
}

const NEUTRAL: Record<string, string> = { uof_element: "Functional area", uof_elements: "Functional areas", uof_maturity: "Maturity assessment", uof_maturity_assessment: "Maturity assessment", uof: "Historical framework reference" };
export const label = (k: string) => NEUTRAL[k] ?? k.replace(/^_+/, "").replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

const HIDDEN = /^(source|loc|file|citation|sources|source_file|source_loc|source_ref)$|_(source|loc|file|citation)$/i;
export const hiddenKey = (k: string) => HIDDEN.test(k);

type Props = { value: Json; example: unknown; onChange?: (v: Json) => void; readOnly?: boolean; path: string; depth?: number };

export function FieldEditor({ value, example, onChange, readOnly, path, depth = 0 }: Props) {
  const tid = path.replace(/[^a-zA-Z0-9]+/g, "-");
  // Object
  if (isObj(example) || (isObj(value) && example === undefined)) {
    const ex = isObj(example) ? example : {};
    const v = isObj(value) ? value : {};
    const keys = Array.from(new Set([...Object.keys(ex), ...Object.keys(v)])).filter((k) => !hiddenKey(k));
    return (
      <div className={cn("grid gap-4", depth > 0 && "sm:grid-cols-2")}>
        {keys.map((k) => {
          const child = ex[k] ?? v[k];
          const complex = isObj(child) || Array.isArray(child);
          const node = <FieldEditor value={v[k] === undefined ? blankFrom(child) : v[k]} example={child} readOnly={readOnly} path={`${path}.${k}`} depth={depth + 1} onChange={(nv) => onChange?.({ ...v, [k]: nv })} />;
          const help = null;
          return complex ? (
            <fieldset key={k} className="col-span-full min-w-0 rounded-lg border border-[#323D4F]/10 bg-[#323D4F]/[.015] p-4" style={{ borderLeft: `3px solid ${depth % 2 ? "#127A80" : "#1ED3D9"}` }}>
              <legend className="flex items-center gap-1 px-1.5 text-[12px] font-semibold uppercase tracking-wider text-[#323D4F]">{label(k)}{help}</legend>
              {node}
            </fieldset>
          ) : (
            <div key={k} className="min-w-0">
              <div className="mb-1 flex min-h-6 items-center gap-1"><span className="text-xs font-medium text-[#323D4F]/80">{label(k)}</span>{help}</div>
              {node}
            </div>
          );
        })}
      </div>
    );
  }
  // Array
  if (Array.isArray(example) || Array.isArray(value)) {
    const exArr = Array.isArray(example) ? example : [];
    const itemEx = exArr[0] ?? (Array.isArray(value) ? value[0] : "") ?? "";
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        {arr.length === 0 && <div className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">{readOnly ? "No entries." : "No entries yet. Add a row to begin."}</div>}
        {arr.map((item, i) => (
          <div key={i} className="flex items-start gap-2 rounded-md bg-white/70 p-2 ring-1 ring-[#323D4F]/[.06]">
            <span className="mt-2 w-6 shrink-0 text-right font-mono text-[10px] text-muted-foreground">{i + 1}</span>
            <div className="min-w-0 flex-1"><FieldEditor value={item} example={itemEx} readOnly={readOnly} path={`${path}.${i}`} depth={depth + 1} onChange={(nv) => onChange?.(arr.map((x, j) => (j === i ? nv : x)))} /></div>
            {!readOnly && <button type="button" onClick={() => onChange?.(arr.filter((_, j) => j !== i))} className="mt-1.5 rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove row" data-testid={`button-remove-${tid}-${i}`}><Trash2 className="h-4 w-4" /></button>}
          </div>
        ))}
        {!readOnly && <button type="button" onClick={() => onChange?.([...arr, blankFrom(itemEx)])} className="inline-flex items-center gap-1 text-xs font-medium text-[#127A80] hover:underline" data-testid={`button-add-${tid}`}><Plus className="h-3.5 w-3.5" /> Add row</button>}
      </div>
    );
  }
  // Primitives
  if (typeof example === "boolean" || typeof value === "boolean") {
    return (
      <span className="inline-flex h-9 items-center gap-2 text-sm text-[#323D4F]">
        <input type="checkbox" className="h-4 w-4 accent-[#1ED3D9]" disabled={readOnly} checked={value === true} onChange={(e) => onChange?.(e.target.checked)} aria-label={label(path.split(".").pop() ?? "")} data-testid={`input-${tid}`} />
        {value === true ? "Yes" : "No"}
      </span>
    );
  }
  if (typeof example === "number" || typeof value === "number") {
    return <input type="number" step="any" className={cn(inputCls, "tnum")} disabled={readOnly} value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => onChange?.(e.target.value === "" ? null : Number(e.target.value))} aria-label={label(path.split(".").pop() ?? "")} data-testid={`input-${tid}`} />;
  }
  const s = value === null || value === undefined ? "" : String(value);
  const long = s.length > 80 || (typeof example === "string" && example.length > 80);
  return long
    ? <textarea rows={3} className={cn(inputCls, "h-auto py-2")} disabled={readOnly} value={s} onChange={(e) => onChange?.(e.target.value)} aria-label={label(path.split(".").pop() ?? "")} data-testid={`input-${tid}`} />
    : <input className={inputCls} disabled={readOnly} value={s} onChange={(e) => onChange?.(e.target.value)} aria-label={label(path.split(".").pop() ?? "")} data-testid={`input-${tid}`} />;
}
