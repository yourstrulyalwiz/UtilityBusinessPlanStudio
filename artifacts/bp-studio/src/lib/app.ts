import { createContext, useContext } from "react";
import type { Profile, Person } from "@workspace/api-client-react";

export const ProfileContext = createContext<Profile | null>(null);
export function useProfile(): Profile {
  const p = useContext(ProfileContext);
  if (!p) throw new Error("Profile missing");
  return p;
}
export function useMe(): Person {
  return useProfile().person;
}

export const PHASE_COLORS = ["#1ED3D9", "#127A80", "#D9E950", "#70AD47", "#FF6A0D", "#5A6780", "#1ED3D9", "#D9E950"];
export function phaseColor(code: string, index?: number) {
  const m = code.match(/(\d)/);
  const i = m ? Number(m[1]) - 1 : index ?? 0;
  return PHASE_COLORS[((i % 8) + 8) % 8];
}

export const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  ttl: "Task Team Leader",
  editor: "Editor",
  viewer: "Viewer",
};
export const MEMBER_ROLE_LABEL: Record<string, string> = {
  focal_point: "Utility focal point",
  team: "Team member",
  consultant: "Consultant",
  viewer: "Viewer",
};

export function errMsg(e: unknown, fallback = "Something went wrong.") {
  const anyE = e as { data?: { error?: string }; message?: string } | null;
  return anyE?.data?.error || anyE?.message || fallback;
}

export function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
export function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}
export function humanize(s: string) {
  return s.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
export const appLink = () => window.location.origin + import.meta.env.BASE_URL;
export const logoUrl = (p?: string | null) => (p ? `/api/storage${p}` : null);
