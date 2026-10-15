/**
 * Brand tokens for generated documents. Copied verbatim from the Studio theme
 * (bp-studio/src/index.css brand pass, lib/modules.ts MODULE_COLORS, plan-data.tsx C).
 * Do not add colors here that are not used in the app.
 */
export const T = {
  navy: "323D4F", navyDeep: "29323F", cyan: "1ED3D9", teal: "127A80", lime: "D9E950", limeChart: "C9DA3A",
  orange: "FF6A0D", slate: "5A6780", green: "70AD47", gray: "9AA4B2",
  text: "323D4F", text2: "5B6678", muted: "6B7687", border: "E3E8EE", surface: "F7F9FB", paleCyan: "E4F8F9",
  onNavy: "EEF2F6", onNavy2: "AEB8C6",
  amberText: "9A3A05", amberBg: "FFF1E8", red: "B8321E", greenText: "3F6E22", white: "FFFFFF",
  font: "Inter", mono: "JetBrains Mono",
};
export const MODULE_COLORS = ["1ED3D9", "127A80", "D9E950", "70AD47", "FF6A0D", "5A6780", "1ED3D9", "D9E950"];
/** Text color that passes WCAG AA on each module color. */
export const MODULE_ON = ["323D4F", "FFFFFF", "323D4F", "323D4F", "323D4F", "FFFFFF", "323D4F", "323D4F"];
export const PHASES = [
  { n: 1, name: "Who we are and where we want to go", modules: [1, 2] },
  { n: 2, name: "Where we stand and what we will do", modules: [3, 4] },
  { n: 3, name: "What it costs and who pays", modules: [5, 6] },
  { n: 4, name: "How we follow up", modules: [7, 8] },
];
export const phaseOf = (m: number) => PHASES.find((p) => p.modules.includes(m))!;
export const STATUS = {
  on: { label: "On track", color: T.green, text: T.greenText, bg: "EEF5E8", mark: "OK" },
  risk: { label: "At risk", color: T.orange, text: T.amberText, bg: T.amberBg, mark: "!" },
  off: { label: "Off track", color: T.red, text: T.red, bg: "FBEAE7", mark: "X" },
  need: { label: "Data needed", color: T.orange, text: T.amberText, bg: T.amberBg, mark: "?" },
} as const;
export type StatusKey = keyof typeof STATUS;
