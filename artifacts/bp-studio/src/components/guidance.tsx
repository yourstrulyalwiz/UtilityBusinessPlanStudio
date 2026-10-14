import { useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { CheckCircle2, CircleHelp, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { GUIDANCE, ILLUSTRATIVE, PHASE_NAMES, SECTORS, sectorLens, type GuidanceTopic, type Sector } from "@/lib/guidance";
import { phaseColor } from "@/lib/app";
import { cn } from "@/lib/utils";

const TABS = ["definition", "why", "examples", "recommendations"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { definition: "Definition", why: "Why it matters", examples: "Examples", recommendations: "Recommendations" };

export function SectorPicker({ value, onChange }: { value: Sector; onChange: (s: Sector) => void }) {
  return (
    <div role="radiogroup" aria-label="Sector examples" className="flex flex-wrap gap-1.5"
      onKeyDown={e=>{
        const direction=["ArrowRight","ArrowDown"].includes(e.key)?1:["ArrowLeft","ArrowUp"].includes(e.key)?-1:0;
        if(!direction)return;
        e.preventDefault();
        const next=SECTORS[(SECTORS.findIndex(s=>s.id===value)+direction+SECTORS.length)%SECTORS.length].id;
        onChange(next);
        e.currentTarget.querySelector<HTMLButtonElement>(`[data-testid="sector-${next}"]`)?.focus();
      }}>
      {SECTORS.map((s) => (
        <button key={s.id} type="button" role="radio" tabIndex={value===s.id?0:-1} aria-checked={value === s.id} onClick={() => onChange(s.id)} data-testid={`sector-${s.id}`}
          className={cn("rounded-full border px-3 py-1 text-xs transition", value === s.id ? "border-[#323D4F] bg-[#323D4F] text-white" : "bg-white text-[#323D4F] hover:border-[#1ED3D9]")}>{s.label}</button>
      ))}
    </div>
  );
}

export function TopicBody({ topic, initialTab = "definition", hint }: { topic: GuidanceTopic; initialTab?: Tab; hint?: string }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sector, setSector] = useState<Sector>("water");
  const id = `t-${topic.id}`;
  return (
    <div className="min-w-0 [overflow-wrap:anywhere]">
      {hint && <div className="mb-3 rounded-lg border-l-4 border-[#1ED3D9] bg-[#E4F8F9] px-3 py-2 text-sm text-[#323D4F]" data-testid="text-field-hint"><strong>Field hint:</strong> {hint}</div>}
      <div role="tablist" aria-label={`${topic.title} guidance`} className="grid min-w-0 grid-cols-2 gap-0.5 rounded-lg bg-muted p-0.5 sm:grid-cols-4"
        onKeyDown={(e) => {
          const i=TABS.indexOf(tab);
          const next=e.key==="ArrowRight"?TABS[(i+1)%4]:e.key==="ArrowLeft"?TABS[(i+3)%4]:e.key==="Home"?TABS[0]:e.key==="End"?TABS[3]:undefined;
          if(next){e.preventDefault();setTab(next);e.currentTarget.querySelector<HTMLButtonElement>(`[data-testid="tab-guide-${next}"]`)?.focus();}
        }}>
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" id={`${id}-${t}`} aria-selected={tab === t} aria-controls={`${id}-panel`} tabIndex={tab === t ? 0 : -1} onClick={() => setTab(t)} data-testid={`tab-guide-${t}`}
            className={cn("shrink-0 rounded-md px-3 py-1.5 text-xs", tab === t ? "bg-white font-medium text-[#323D4F] shadow-sm" : "text-muted-foreground hover:text-[#323D4F]")}>{TAB_LABEL[t]}</button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`} className="mt-4 space-y-3 text-sm leading-relaxed text-[#323D4F]" data-testid={`panel-guide-${tab}`}>
        {tab === "definition" && topic.definition.map((p, i) => <p key={i}>{p}</p>)}
        {tab === "why" && <ul className="space-y-1.5">{topic.whyItMatters.map((w) => <li key={w} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1ED3D9]" />{w}</li>)}</ul>}
        {tab === "examples" && <>
          {topic.examples.map((ex, i) => (
            <figure key={i} className="rounded-lg bg-[#E4F8F9] p-3">
              <figcaption className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#323D4F]/70">Example · {ex.label}</figcaption>
              {ex.text && <blockquote className="border-l-2 border-[#1ED3D9] pl-3">{ex.text}</blockquote>}
              {ex.table && <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-xs"><thead><tr>{ex.table.headers.map((h) => <th key={h} className="border-b border-[#323D4F]/15 px-2 py-1 text-left font-semibold">{h}</th>)}</tr></thead>
                <tbody>{ex.table.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k} className="border-b border-[#323D4F]/5 px-2 py-1 align-top">{c}</td>)}</tr>)}</tbody></table></div>}
            </figure>
          ))}
          <p className="text-[11px] text-muted-foreground" data-testid="text-guide-source">Source: {topic.source}. Examples from the supplied document; not independently verified as current.</p>
        </>}
        {tab === "recommendations" && <>
          <ul className="space-y-1.5">{topic.tips.do.map((d) => <li key={d} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#3F6E22]" />{d}</li>)}</ul>
          <ul className="space-y-1.5">{topic.tips.avoid.map((d) => <li key={d} className="flex gap-2"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />Avoid: {d}</li>)}</ul>
          {topic.guidingQuestions && <div className="rounded-lg border p-3"><div className="mb-1 text-[11px] font-semibold uppercase tracking-wider">Guiding questions</div><ul className="list-disc space-y-1 pl-5">{topic.guidingQuestions.map((q) => <li key={q}>{q}</li>)}</ul></div>}
          <p className="text-[11px] text-muted-foreground">Source: {topic.source}</p>
          <div className="rounded-lg border border-dashed p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider">Across sectors</div>
            <SectorPicker value={sector} onChange={setSector} />
            <p className="mt-2" data-testid="text-sector-lens">{sectorLens(sector, topic.phase)}</p>
            <p className="mt-1 text-[11px] font-medium text-amber-800">{ILLUSTRATIVE}</p>
          </div>
        </>}
      </div>
    </div>
  );
}

export function TopicHeader({ topic }: { topic: GuidanceTopic }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: phaseColor(topic.phase) }}>
      <span className="rounded px-1.5 py-0.5 font-semibold text-[#29323F]" style={{ background: phaseColor(topic.phase) }}>{topic.phase}</span>{PHASE_NAMES[topic.phase]}
    </span>
  );
}

/** Dialog with optional topic switcher. Radix handles Escape, focus trap and focus return. */
export function GuidanceDialog({ open, onOpenChange, topics, title, intro, hint, initialTab }: { open: boolean; onOpenChange: (o: boolean) => void; topics: GuidanceTopic[]; title: string; intro?: ReactNode; hint?: string; initialTab?: Tab }) {
  const [active, setActive] = useState(0);
  const returnFocus=useRef<HTMLElement|null>(null);
  const topic = topics[Math.min(active, topics.length - 1)];
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setActive(0); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] min-w-0 max-w-2xl overflow-x-hidden overflow-y-auto rounded-xl [overflow-wrap:anywhere] [&>*]:min-w-0" data-testid="dialog-guidance"
        onOpenAutoFocus={()=>{returnFocus.current=document.activeElement as HTMLElement;}}
        onCloseAutoFocus={e=>{if(returnFocus.current?.isConnected){e.preventDefault();returnFocus.current.focus();}}}>
        <DialogHeader>
          {topic && <TopicHeader topic={topic} />}
          <DialogTitle className="text-[#323D4F]">{title}</DialogTitle>
          <DialogDescription>Guidance for this step. Examples are references, not your utility's data.</DialogDescription>
        </DialogHeader>
        {intro}
        {topics.length > 1 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Topics">
            {topics.map((t, i) => <button key={t.id} type="button" aria-pressed={i === active} onClick={() => setActive(i)} data-testid={`button-topic-${t.id}`}
              className={cn("rounded-md border px-2.5 py-1 text-xs", i === active ? "border-[#1ED3D9] bg-[#E4F8F9] font-medium text-[#323D4F]" : "text-muted-foreground")}>{t.title}</button>)}
          </div>
        )}
        {topic ? <TopicBody key={topic.id} topic={topic} hint={hint} initialTab={initialTab} /> : <p className="text-sm text-muted-foreground">No guidance topic is mapped to this item yet.</p>}
        {topic && <Link href={`/help/${topic.id}`} onClick={() => onOpenChange(false)} className="text-xs font-medium text-[#127A80] hover:underline" data-testid="link-full-guide">Open full guide in Help center</Link>}
      </DialogContent>
    </Dialog>
  );
}

/** Small accessible "?" trigger. Not rendered inside a <label>. */
export function HelpDot({ topicId, label, hint, testid }: { topicId: string; label: string; hint?: string; testid?: string }) {
  const [open, setOpen] = useState(false);
  const topic = GUIDANCE[topicId];
  if (!topic) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Help: ${label}`} data-testid={testid ?? `button-help-${topicId}`}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#323D4F]/50 hover:bg-[#E4F8F9] hover:text-[#127A80] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1ED3D9]">
        <CircleHelp className="h-4 w-4" />
      </button>
      <GuidanceDialog open={open} onOpenChange={setOpen} topics={[topic]} title={`${label}: ${topic.title}`} hint={hint} initialTab={hint ? "examples" : "definition"} />
    </>
  );
}
