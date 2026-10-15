import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, CircleHelp, ExternalLink, Lightbulb, MessageCircleQuestion, ThumbsDown, ThumbsUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { type Topic, moduleColor } from "@/lib/modules";
import { cn } from "@/lib/utils";

export function TopicView({ topic, compact }: { topic: Topic; compact?: boolean }) {
  return (
    <div className="space-y-4 text-sm text-[#323D4F]" data-testid={`topic-${topic.id}`}>
      <p className="leading-relaxed">{topic.definition || "No definition supplied."}</p>
      {topic.why.length > 0 && <section>
        <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#127A80]"><Lightbulb className="h-3.5 w-3.5" /> Why it matters</h4>
        <ul className="space-y-1">{topic.why.map((w) => <li key={w} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#1ED3D9]" />{w}</li>)}</ul>
      </section>}
      {topic.questions.length > 0 && <section>
        <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#127A80]"><MessageCircleQuestion className="h-3.5 w-3.5" /> Guiding questions</h4>
        <ol className="list-decimal space-y-1 pl-5">{topic.questions.map((q) => <li key={q}>{q}</li>)}</ol>
      </section>}
      {topic.example.text && <section className="rounded-lg border border-[#323D4F]/10 bg-[#F7F9FB] p-3">
        <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#5B6678]">Illustrative example{topic.example.utility ? ` · ${topic.example.utility}` : ""}</h4>
        <p className="leading-relaxed">{topic.example.text}</p>
        {topic.example.source && <p className="mt-1.5 font-mono text-[11px] text-[#5B6678]">Source reference: {topic.example.source}</p>}
        <p className="mt-1 text-[11px] text-[#5B6678]">Quoted for illustration only. Replace with your own utility's information.</p>
      </section>}
      {(topic.tips.do.length > 0 || topic.tips.avoid.length > 0) && <div className={cn("grid gap-3", !compact && "sm:grid-cols-2")}>
        <div className="rounded-lg border-l-4 border-[#70AD47] bg-[#70AD47]/[.06] p-3"><h4 className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"><ThumbsUp className="h-3.5 w-3.5" /> Do</h4><ul className="space-y-1">{topic.tips.do.map((t) => <li key={t}>{t}</li>)}</ul></div>
        <div className="rounded-lg border-l-4 border-[#FF6A0D] bg-[#FFF1E8] p-3"><h4 className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9A3A05]"><ThumbsDown className="h-3.5 w-3.5" /> Avoid</h4><ul className="space-y-1">{topic.tips.avoid.map((t) => <li key={t}>{t}</li>)}</ul></div>
      </div>}
    </div>
  );
}

export function ModuleHelpButton({ topics, moduleNumber, moduleTitle }: { topics: Topic[]; moduleNumber: number; moduleTitle: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const t = topics[active];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#1ED3D9]/40 bg-[#E4F8F9] px-3 py-1.5 text-sm font-medium text-[#323D4F] hover:border-[#1ED3D9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1ED3D9]" data-testid="button-module-help">
        <CircleHelp className="h-4 w-4 text-[#127A80]" /> Module {moduleNumber} guidance{topics.length ? ` (${topics.length})` : ""}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#323D4F]">Module {moduleNumber}: {moduleTitle}</DialogTitle>
            <DialogDescription>Guidance from the module guidance library. Examples are illustrative.</DialogDescription>
          </DialogHeader>
          {topics.length === 0 ? <p className="text-sm text-muted-foreground">No guidance topics for this module yet.</p> : <>
            <div className="flex flex-wrap gap-1.5" role="tablist">
              {topics.map((x, i) => (
                <button key={x.id} role="tab" aria-selected={i === active} onClick={() => setActive(i)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", i === active ? "border-[#323D4F] bg-[#323D4F] text-[#EEF2F6]" : "text-[#323D4F] hover:bg-muted")} data-testid={`tab-help-${x.id}`}>{x.title}</button>
              ))}
            </div>
            {t && <TopicView topic={t} />}
            {t && <Link href={`/help/${t.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-[#127A80] hover:underline" data-testid="link-help-full"><ExternalLink className="h-3.5 w-3.5" /> Open in help center</Link>}
          </>}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function HelpRail({ topics, moduleNumber }: { topics: Topic[]; moduleNumber: number }) {
  const [open, setOpen] = useState<string | null>(topics[0]?.id ?? null);
  return (
    <div className="space-y-2" data-testid="panel-help-rail">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#323D4F]"><BookOpen className="h-3.5 w-3.5" style={{ color: moduleColor(moduleNumber) === "#D9E950" ? "#127A80" : moduleColor(moduleNumber) }} /> Module guidance</div>
      {topics.length === 0 && <p className="text-xs text-muted-foreground">No guidance topics for this module.</p>}
      {topics.map((t) => (
        <div key={t.id} className="rounded-lg border bg-white/80">
          <button type="button" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-[#323D4F]" data-testid={`button-rail-${t.id}`}>{t.title}<span className="text-xs text-muted-foreground">{open === t.id ? "Hide" : "Show"}</span></button>
          {open === t.id && <div className="border-t px-3 py-3"><TopicView topic={t} compact /></div>}
        </div>
      ))}
    </div>
  );
}
