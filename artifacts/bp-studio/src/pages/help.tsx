import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { Card, Empty, PageHeader, inputCls } from "@/components/kit";
import { SectorPicker, TopicBody, TopicHeader } from "@/components/guidance";
import { ACTIVITY_GUIDANCE, GUIDANCE, ILLUSTRATIVE, PHASE_NAMES, SOURCE_DOC, searchTopics, sectorLens, type Phase, type Sector } from "@/lib/guidance";
import { useMe, phaseColor } from "@/lib/app";
import { cn } from "@/lib/utils";

const ROLE_GUIDES: { id: string; title: string; who: string; steps: string[] }[] = [
  { id: "admin", title: "Global team: provisioning, review and progress", who: "Administrators", steps: [
    "Invite people from People & roles and give each the right role: TTL, editor or viewer.",
    "Register a utility (or approve a TTL request). This creates its business plan with the 20 standard activities.",
    "Add the TTL and team members on the utility page so they can see and edit the plan.",
    "Use the Portfolio tiles and table to follow progress; open any plan to see which step is next.",
    "Submitted steps wait for review. Approve them, or return them with a comment that says what to change.",
  ] },
  { id: "ttl", title: "Task Team Leader: working through the plan", who: "TTLs and editors", steps: [
    "Open your plan and use Continue to go to the next step. Read the instructions and the How to complete this step guide first.",
    "Fill the form. Use the ? buttons next to fields for definitions, examples and recommendations.",
    "Save draft keeps your work without sending it. Submit sends the step for review and makes it read-only.",
    "If a step is returned, read the review comment at the top, change the form and submit again.",
    "Fill with example inserts a fictional dataset. Treat it as a draft only and replace every value with your utility's own data.",
  ] },
  { id: "viewer", title: "Viewers", who: "Read-only roles", steps: [
    "You can open every plan you are assigned to and read each step and its guidance.",
    "Editing, submitting and reviewing are not available for your role; ask the TTL if something needs to change.",
  ] },
];

function RoleGuides() {
  const me = useMe();
  const order = me.role === "admin" ? ["admin", "ttl", "viewer"] : me.role === "viewer" ? ["viewer", "ttl", "admin"] : ["ttl", "admin", "viewer"];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {order.map((id, i) => { const g = ROLE_GUIDES.find((r) => r.id === id)!; return (
        <Card key={id} className={cn("p-5", i === 0 && "border-[#1ED3D9]/50 ring-1 ring-[#1ED3D9]/20")} data-testid={`card-role-guide-${id}`}>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.who}{i === 0 && " · your role"}</div>
          <h3 className="mt-1 font-semibold text-[#323D4F]">{g.title}</h3>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-[#323D4F]">{g.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        </Card>
      ); })}
    </div>
  );
}

export function HelpCenter() {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState<Sector>("water");
  const results = useMemo(() => searchTopics(q), [q]);
  const phases: Phase[] = ["P1", "P2", "P3", "P4"];
  return (
    <div>
      <PageHeader eyebrow="Help center" title="How to build a business plan" description="Role guides, the 21 guidance topics behind the 20 activities, and sector perspectives." />
      <section className="mb-8"><h2 className="mb-3 text-sm font-semibold text-[#323D4F]">Getting started by role</h2><RoleGuides /></section>

      <section className="mb-8">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-[#323D4F]">Across sectors</h2>
          <p className="mt-1 text-xs text-muted-foreground">The same planning logic applies beyond water. Choose a sector to read each phase through that lens.</p>
          <div className="mt-3"><SectorPicker value={sector} onChange={setSector} /></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {phases.map((p) => <div key={p} className="rounded-lg border p-3" style={{ borderLeft: `3px solid ${phaseColor(p)}` }}><div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: phaseColor(p) }}>{p} · {PHASE_NAMES[p]}</div><p className="mt-1 text-sm text-[#323D4F]" data-testid={`text-help-lens-${p}`}>{sectorLens(sector, p)}</p></div>)}
          </div>
          <p className="mt-3 text-[11px] font-medium text-amber-800">{ILLUSTRATIVE}</p>
        </Card>
      </section>

      <section>
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className={inputCls + " pl-9"} placeholder="Search topics, e.g. DSCR, SWOT, mission" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search guidance" data-testid="input-help-search" />
        </div>
        {results.length === 0 ? <Card><Empty icon={<Search className="h-6 w-6" />} title="No topics match" body="Try a broader word such as objective, KPI or charter." /></Card> : (
          <div className="space-y-5">
            {phases.map((p) => { const ts = results.filter((t) => t.phase === p); if (!ts.length) return null; return (
              <div key={p}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: phaseColor(p) }}>{p} · {PHASE_NAMES[p]}</div>
                <Card className="divide-y overflow-hidden">
                  {ts.map((t) => { const codes = Object.entries(ACTIVITY_GUIDANCE).filter(([, ids]) => ids.includes(t.id)).map(([c]) => c); return (
                    <Link key={t.id} href={`/help/${t.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[#E4F8F9]/60" data-testid={`link-topic-${t.id}`}>
                      <div className="min-w-0 flex-1"><div className="text-sm font-medium text-[#323D4F]">{t.title}</div><div className="truncate text-xs text-muted-foreground">{t.definition[0]}</div></div>
                      <span className="hidden font-mono text-[11px] text-muted-foreground sm:block">{codes.join(" · ")}</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ); })}
                </Card>
              </div>
            ); })}
          </div>
        )}
        <p className="mt-4 text-[11px] text-muted-foreground">Topic content source: {SOURCE_DOC}</p>
      </section>
    </div>
  );
}

export function HelpTopic() {
  const { topicId = "" } = useParams<{ topicId: string }>();
  const t = GUIDANCE[topicId];
  if (!t) return <Card><Empty icon={<Search className="h-6 w-6" />} title="Topic not found" body={<Link href="/help" className="text-[#127A80] hover:underline">Back to Help center</Link>} /></Card>;
  const codes = Object.entries(ACTIVITY_GUIDANCE).filter(([, ids]) => ids.includes(t.id)).map(([c]) => c);
  return (
    <div className="max-w-3xl">
      <Link href="/help" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#323D4F]" data-testid="link-back-help"><ArrowLeft className="h-4 w-4" /> Help center</Link>
      <Card className="p-6">
        <TopicHeader topic={t} />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#323D4F]" data-testid="text-topic-title">{t.title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">Used in activities {codes.join(", ")}</p>
        <div className="mt-5"><TopicBody topic={t} /></div>
      </Card>
    </div>
  );
}
