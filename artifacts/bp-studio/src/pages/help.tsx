import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetGuidanceLibrary, getGetGuidanceLibraryQueryKey, useUpdateGuidanceTopic, type ModuleGuidanceLibrary } from "@workspace/api-client-react";
import { ArrowLeft, BookOpen, ChevronRight, Pencil, Search, X } from "lucide-react";
import { Card, PageHeader, Empty, ErrorState, Btn, Field, inputCls } from "@/components/kit";
import { TopicView } from "@/components/module-help";
import { useMe, errMsg, fmtDateTime } from "@/lib/app";
import { toTopic, matchTopic, moduleColor, MODULE_SHORT, isConflict, type Topic } from "@/lib/modules";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function useLibrary() {
  const q = useGetGuidanceLibrary();
  const topics = useMemo(() => (q.data?.topics ?? []).map(toTopic).sort((a, b) => a.module - b.module), [q.data]);
  return { q, topics };
}

export function HelpCenter() {
  const { q, topics } = useLibrary();
  const [search, setSearch] = useState("");
  const results = topics.filter((t) => matchTopic(t, search));
  return (
    <div>
      <PageHeader eyebrow="Help center" title="Module guidance library" description="Definitions, guiding questions, tips and illustrative examples for each of the eight business-plan modules." />
      <div className="relative mb-6 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input className={inputCls + " pl-9 pr-9"} placeholder="Search guidance, e.g. tariff, NRW, SWOT" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search guidance" data-testid="input-help-search" />
        {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-[#323D4F]" aria-label="Clear search" data-testid="button-clear-help-search"><X className="h-4 w-4" /></button>}
      </div>
      {q.isLoading ? <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl border bg-card" />)}</div>
        : q.isError ? <Card><ErrorState message={errMsg(q.error, "Guidance library unavailable.")} onRetry={() => q.refetch()} /></Card>
        : results.length === 0 ? <Card><Empty icon={<Search className="h-6 w-6" />} title="No guidance matches" body="Try another word or clear the search." /></Card>
        : <div className="space-y-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
            const ts = results.filter((t) => t.module === n);
            if (!ts.length) return null;
            return (
              <section key={n} data-testid={`help-module-${n}`}>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#323D4F]"><span className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold text-[#29323F]" style={{ background: moduleColor(n) }}>{n}</span>Module {n} · <span className="font-normal text-[#5B6678]">{MODULE_SHORT[n - 1]}</span></div>
                <div className="grid gap-3 md:grid-cols-2">
                  {ts.map((t) => (
                    <Link key={t.id} href={`/help/${t.id}`} className="lift group rounded-xl border bg-card p-4 hover:border-[#1ED3D9]/60" data-testid={`link-topic-${t.id}`}>
                      <div className="flex items-center justify-between font-medium text-[#323D4F] group-hover:text-[#127A80]">{t.title}<ChevronRight className="h-4 w-4" /></div>
                      <p className="mt-1 line-clamp-2 text-xs text-[#5B6678]">{t.definition}</p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>}
      {q.data?.source && <p className="mt-6 text-[11px] text-muted-foreground">Source: {q.data.source}. Edits by administrators may differ from the source.</p>}
    </div>
  );
}

const lines = (a: string[]) => a.join("\n");
const unlines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function TopicEditor({ topic, onDone }: { topic: Topic; onDone: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [f, setF] = useState({ title: topic.title, definition: topic.definition, why: lines(topic.why), questions: lines(topic.questions), exText: topic.example.text, exUtility: topic.example.utility, exSource: topic.example.source, doT: lines(topic.tips.do), avoidT: lines(topic.tips.avoid) });
  const [conflict, setConflict] = useState(false);
  const save = useUpdateGuidanceTopic({ mutation: {
    onSuccess: (t) => {
      qc.setQueryData<ModuleGuidanceLibrary>(getGetGuidanceLibraryQueryKey(), (old) => old ? { ...old, topics: old.topics.map((x) => (x.id === t.id ? t : x)) } : old);
      toast({ title: "Guidance saved" }); onDone();
    },
    onError: (e) => { if (isConflict(e)) setConflict(true); toast({ title: "Could not save guidance - your edits are kept", description: errMsg(e), variant: "destructive" }); },
  } });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const raw = topic.raw;
  const rawEx = (raw.example && typeof raw.example === "object" ? raw.example : {}) as Record<string, unknown>;
  const rawTips = (raw.tips && typeof raw.tips === "object" ? raw.tips : {}) as Record<string, unknown>;
  const submit = () => save.mutate({ id: topic.id, data: { updatedAt: topic.updatedAt, data: {
    ...raw, title: f.title, definition: f.definition, why_it_matters: unlines(f.why), guiding_questions: unlines(f.questions),
    example: { ...rawEx, text: f.exText, utility: f.exUtility, source: f.exSource }, tips: { ...rawTips, do: unlines(f.doT), avoid: unlines(f.avoidT) },
  } } });
  const ta = cn(inputCls, "h-auto py-2");
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }} data-testid="form-topic-edit">
      <p className="rounded-md bg-[#FFF1E8] px-3 py-2 text-xs text-[#9A3A05]">Edits replace the guidance shown to every user and may differ from the supplied source.</p>
      {conflict && <p className="rounded-md border border-[#FF6A0D]/50 bg-[#FFF1E8] px-3 py-2 text-xs text-[#9A3A05]" data-testid="text-topic-conflict">Another administrator changed this topic. Your edits are kept here; copy them, cancel, and reopen the editor to load the latest version.</p>}
      <Field label="Title" required><input required className={inputCls} value={f.title} onChange={set("title")} data-testid="input-topic-title" /></Field>
      <Field label="Definition"><textarea rows={3} className={ta} value={f.definition} onChange={set("definition")} data-testid="input-topic-definition" /></Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Why it matters" hint="One item per line"><textarea rows={4} className={ta} value={f.why} onChange={set("why")} data-testid="input-topic-why" /></Field>
        <Field label="Guiding questions" hint="One question per line"><textarea rows={4} className={ta} value={f.questions} onChange={set("questions")} data-testid="input-topic-questions" /></Field>
      </div>
      <fieldset className="space-y-3 rounded-lg border p-4"><legend className="px-1 text-xs font-semibold uppercase tracking-wider text-[#323D4F]">Illustrative example</legend>
        <Field label="Example text"><textarea rows={3} className={ta} value={f.exText} onChange={set("exText")} data-testid="input-topic-example" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Utility"><input className={inputCls} value={f.exUtility} onChange={set("exUtility")} data-testid="input-topic-example-utility" /></Field>
          <Field label="Source reference"><input className={inputCls} value={f.exSource} onChange={set("exSource")} data-testid="input-topic-example-source" /></Field>
        </div>
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Tips: do" hint="One per line"><textarea rows={3} className={ta} value={f.doT} onChange={set("doT")} data-testid="input-topic-do" /></Field>
        <Field label="Tips: avoid" hint="One per line"><textarea rows={3} className={ta} value={f.avoidT} onChange={set("avoidT")} data-testid="input-topic-avoid" /></Field>
      </div>
      <div className="flex justify-end gap-2 border-t pt-4"><Btn type="button" variant="ghost" onClick={onDone} disabled={save.isPending} data-testid="button-cancel-topic">Cancel</Btn><Btn type="submit" disabled={save.isPending} data-testid="button-save-topic">{save.isPending ? "Saving..." : "Save guidance"}</Btn></div>
    </form>
  );
}

export function HelpTopic() {
  const { topicId = "" } = useParams<{ topicId: string }>();
  const me = useMe();
  const { q, topics } = useLibrary();
  const [editing, setEditing] = useState(false);
  const t = topics.find((x) => x.id === topicId);
  const canManage = !!q.data?.canManage && me.role === "admin";
  const siblings = t ? topics.filter((x) => x.module === t.module && x.id !== t.id) : [];
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/help" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#323D4F]" data-testid="link-back-help"><ArrowLeft className="h-4 w-4" /> Help center</Link>
      {q.isLoading ? <div className="h-96 animate-pulse rounded-xl border bg-card" />
        : q.isError ? <Card><ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /></Card>
        : !t ? <Card><Empty icon={<BookOpen className="h-6 w-6" />} title="Guidance topic not found" body="This topic is not in the module guidance library. Earlier guidance pages have been retired." action={<Link href="/help" className="text-sm font-medium text-[#127A80] hover:underline">Browse module guidance</Link>} /></Card>
        : <Card className="rise overflow-hidden">
          <div className="h-1.5" style={{ background: moduleColor(t.module) }} />
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#127A80]">Module {t.module} · {MODULE_SHORT[t.module - 1]}</span>
              {canManage && !editing && <Btn variant="outline" className="ml-auto h-8" onClick={() => setEditing(true)} data-testid="button-edit-topic"><Pencil className="h-3.5 w-3.5" /> Edit topic</Btn>}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#323D4F]" data-testid="text-topic-title">{t.title}</h1>
            <div className="mt-5">{editing ? <TopicEditor key={t.updatedAt} topic={t} onDone={() => setEditing(false)} /> : <TopicView topic={t} />}</div>
            <p className="mt-6 border-t pt-3 text-[11px] text-muted-foreground">Source: {q.data?.source}. Last updated {fmtDateTime(t.updatedAt)}. Edits may differ from the source.</p>
          </div>
        </Card>}
      {siblings.length > 0 && <div className="mt-5"><div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#5B6678]">Also in this module</div><div className="flex flex-wrap gap-2">{siblings.map((s) => <Link key={s.id} href={`/help/${s.id}`} className="rounded-full border bg-card px-3 py-1 text-sm text-[#323D4F] hover:border-[#1ED3D9]" data-testid={`link-sibling-${s.id}`}>{s.title}</Link>)}</div></div>}
    </div>
  );
}
