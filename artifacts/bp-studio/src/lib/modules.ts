import type { ModuleGuidanceTopic, PlanModule } from "@workspace/api-client-react";

export const MODULE_COLORS = ["#1ED3D9", "#127A80", "#D9E950", "#70AD47", "#FF6A0D", "#5A6780", "#1ED3D9", "#D9E950"];
export const moduleColor = (n: number) => MODULE_COLORS[(((n - 1) % 8) + 8) % 8];

/** Short names used only where module data has not loaded (e.g. sign-in screen). */
export const MODULE_SHORT = [
  "Utility baseline",
  "Vision, mission and objectives",
  "Utility assessment",
  "Goals, strategies and actions",
  "Investment and operating costs",
  "Tariffs and cost recovery",
  "KPIs and monitoring",
  "Review and outputs",
];

export const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  needs_data: "Needs data",
  in_progress: "In progress",
  ready_for_review: "Ready for review",
  approved: "Approved",
};
export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
export function moduleTone(s: string): "neutral" | "blue" | "green" | "amber" | "navy" {
  if (s === "approved") return "green";
  if (s === "ready_for_review") return "navy";
  if (s === "in_progress") return "blue";
  if (s === "needs_data") return "amber";
  return "neutral";
}

export const reviewedCount = (mods: PlanModule[]) => mods.filter((m) => m.status === "approved").length;

export type Topic = {
  id: string; module: number; title: string; definition: string;
  why: string[]; questions: string[];
  example: { utility: string; text: string; source: string };
  tips: { do: string[]; avoid: string[] };
  updatedAt: string; raw: Record<string, unknown>;
};
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") as string[] : []);
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
export function toTopic(t: ModuleGuidanceTopic): Topic {
  const d = (t.data ?? {}) as Record<string, unknown>;
  const ex = (d.example && typeof d.example === "object" ? d.example : {}) as Record<string, unknown>;
  const tips = (d.tips && typeof d.tips === "object" ? d.tips : {}) as Record<string, unknown>;
  return {
    id: t.id, module: t.module, title: str(d.title) || t.id, definition: str(d.definition),
    why: strArr(d.why_it_matters), questions: strArr(d.guiding_questions),
    example: { utility: str(ex.utility), text: str(ex.text), source: str(ex.source) },
    tips: { do: strArr(tips.do), avoid: strArr(tips.avoid) },
    updatedAt: t.updatedAt, raw: d,
  };
}
export function matchTopic(t: Topic, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [t.title, t.definition, ...t.why, ...t.questions, t.example.text, ...t.tips.do, ...t.tips.avoid].join(" ").toLowerCase().includes(s);
}

/** Find a key anywhere in a nested structure (first match). */
export function findKey(o: unknown, key: string, depth = 0): unknown {
  if (!o || typeof o !== "object" || depth > 5) return undefined;
  if (!Array.isArray(o) && key in (o as Record<string, unknown>)) return (o as Record<string, unknown>)[key];
  for (const v of Object.values(o as Record<string, unknown>)) {
    const r = findKey(v, key, depth + 1);
    if (r !== undefined) return r;
  }
  return undefined;
}

export const isConflict = (e: unknown) => (e as { status?: number } | null)?.status === 409;

export const apiHref = (p: string) => p;
