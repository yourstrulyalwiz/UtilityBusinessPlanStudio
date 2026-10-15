import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSummary, getGetSummaryQueryKey, useListUtilities, getListUtilitiesQueryKey, useGetMetadata, useListUsers, getListUsersQueryKey,
  useListViews, getListViewsQueryKey, useSaveView, useDeleteView, useCreateUtility, useLoadDemoPlan, type ListUtilitiesParams, type Bucket,
} from "@workspace/api-client-react";
import { ArrowDown, ArrowUp, BookOpen, Bookmark, PlayCircle, ChevronLeft, ChevronRight, Download, Droplets, Plus, Search, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, PageHeader, Empty, ErrorState, SkeletonRows, Pill, statusTone, inputCls, Btn } from "@/components/kit";
import { UtilityForm, PLAN_YEARS } from "@/components/utility-form";
import { useMe, errMsg, phaseColor, logoUrl, initials, humanize } from "@/lib/app";
import { useToast } from "@/hooks/use-toast";
import { useTestMode } from "@/lib/test-mode";
import { cn } from "@/lib/utils";

type Filters = { q: string; country: string; region: string; ttl: string; year: string; status: string; sort: string; direction: string };
const EMPTY: Filters = { q: "", country: "", region: "", ttl: "", year: "", status: "", sort: "name", direction: "asc" };
const PAGE = 25;

function toParams(f: Filters, page: number): ListUtilitiesParams {
  const p: ListUtilitiesParams = { page: String(page), sort: f.sort, direction: f.direction };
  (["q", "country", "region", "ttl", "year", "status"] as const).forEach((k) => { if (f[k]) p[k] = f[k]; });
  return p;
}

function Tile({ label, value, sub, onClick, accent, testid }: { label: string; value: string; sub: string; onClick: () => void; accent: string; testid: string }) {
  return (
    <button onClick={onClick} data-testid={testid} className="glass-metric lift group rise relative overflow-hidden rounded-xl border p-5 text-left hover:border-[#1ED3D9]/50">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#AEB8C6]">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />{label}
      </div>
      <div className="mt-3 text-[32px] font-semibold leading-none tracking-tight text-[#EEF2F6] tnum">{value}</div>
      <div className="mt-2 text-xs text-[#AEB8C6] group-hover:text-[#1ED3D9]">{sub}</div>
    </button>
  );
}

function Bars({ title, data, colorFor, onPick, empty }: { title: string; data: Bucket[]; colorFor: (b: Bucket, i: number) => string; onPick?: (b: Bucket) => void; empty: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <Card className="p-5">
      <div className="mb-4 text-sm font-semibold text-[#323D4F]">{title}</div>
      {data.length === 0 || data.every((d) => d.value === 0) ? (
        <div className="py-6 text-center text-xs text-muted-foreground">{empty}</div>
      ) : (
        <div className="space-y-3">
          {data.map((b, i) => (
            <button key={b.label} disabled={!onPick} onClick={() => onPick?.(b)} className="block w-full text-left disabled:cursor-default" data-testid={`bar-${b.label}`}>
              <div className="mb-1 flex justify-between text-xs"><span className="text-[#323D4F]">{b.label}</span><span className="font-medium text-[#323D4F] tnum">{b.value}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="bar-fill h-full origin-left rounded-full transition-transform duration-700" style={{ width: `${(b.value / max) * 100}%`, background: colorFor(b, i) }} />
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Portfolio({ admin }: { admin: boolean }) {
  const [, navigate] = useLocation();
  const me = useMe();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [f, setF] = useState<Filters>(EMPTY);
  const [qInput, setQInput] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [viewName, setViewName] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const tableRef = useRef<HTMLDivElement>(null);

  const params = useMemo(() => toParams(f, page), [f, page]);
  const summary = useGetSummary({ query: { enabled: admin, queryKey: getGetSummaryQueryKey() } });
  const list = useListUtilities(params, { query: { queryKey: getListUtilitiesQueryKey(params), placeholderData: (prev) => prev } });
  const meta = useGetMetadata();
  const users = useListUsers({ query: { enabled: admin || me.role === "ttl", queryKey: getListUsersQueryKey() } });
  const views = useListViews();
  const saveView = useSaveView({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListViewsQueryKey() }); setViewName(""); toast({ title: "View saved" }); }, onError: (e) => toast({ title: "Could not save view", description: errMsg(e), variant: "destructive" }) } });
  const delView = useDeleteView({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListViewsQueryKey() }) } });
  const create = useCreateUtility({
    mutation: {
      onSuccess: (u) => {
        qc.invalidateQueries({ queryKey: getListUtilitiesQueryKey() }); qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        setCreating(false); toast({ title: "Utility registered", description: u.name });
      },
      onError: (e) => toast({ title: "Could not register utility", description: errMsg(e), variant: "destructive" }),
    },
  });

  const openAccess = !!useTestMode().data?.openAccess;
  const demo = useLoadDemoPlan({ mutation: {
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: getListUtilitiesQueryKey() }); qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() }); navigate(`/plans/${r.planId}`); },
    onError: (e) => toast({ title: "Could not open example plan", description: errMsg(e), variant: "destructive" }),
  } });
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const update = (patch: Partial<Filters>) => { setF((s) => ({ ...s, ...patch })); setPage(1); };
  const onSearch = (v: string) => { setQInput(v); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => update({ q: v.trim() }), 300); };
  const toTable = () => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const regions = useMemo(() => Array.from(new Set((meta.data?.countries ?? []).map((c) => c.region))).sort(), [meta.data]);
  const ttls = (users.data ?? []).filter((u) => u.role === "ttl" || u.role === "admin");
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const items = list.data?.items ?? [];
  const activeFilters = (["q", "country", "region", "ttl", "year", "status"] as const).filter((k) => f[k]);
  const exportHref = useMemo(() => {
    const p = new URLSearchParams(); Object.entries(toParams(f, 1)).forEach(([k, v]) => { if (v && k !== "page") p.set(k, String(v)); });
    return `/api/utilities/export.csv?${p.toString()}`;
  }, [f]);

  const sortBy = (col: string) => update(f.sort === col ? { direction: f.direction === "asc" ? "desc" : "asc" } : { sort: col, direction: col === "progress" ? "desc" : "asc" });
  const SortH = ({ col, children, className }: { col: string; children: string; className?: string }) => (
    <th className={cn("px-4 py-3 text-left font-medium", className)}>
      <button onClick={() => sortBy(col)} className="inline-flex items-center gap-1 hover:text-[#323D4F]" data-testid={`sort-${col}`}>
        {children}{f.sort === col && (f.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );
  const s = summary.data;

  return (
    <div>
      <PageHeader eyebrow={admin ? "Portfolio administration" : me.role === "ttl" ? "Task Team Leader" : "Workspace"} title={admin ? "Global team workspace" : "My utility plans"}
        description={admin ? "Provision people and utilities, follow every plan's progress and review modules submitted for review." : me.role === "viewer" ? "Plans you can read. Editing is not available for your role." : "The utility business plans you lead or contribute to."}
        actions={admin && <div className="flex flex-wrap gap-2">
          {openAccess && <>
            <Btn variant="outline" disabled={demo.isPending} onClick={() => demo.mutate({ data: { mode: "complete" } })} data-testid="button-demo-complete"><BookOpen className="h-4 w-4" /> Open Valle Verde example</Btn>
            <Btn variant="outline" disabled={demo.isPending} onClick={() => demo.mutate({ data: { mode: "midway" } })} data-testid="button-demo-midway"><PlayCircle className="h-4 w-4" /> Open second example</Btn>
          </>}
          <Btn onClick={() => setCreating(true)} data-testid="button-new-utility"><Plus className="h-4 w-4" /> New utility</Btn>
        </div>} />

      {admin ? (
        <Card className="rise mb-6 overflow-hidden" data-testid="card-admin-onboarding">
          <div className="grid gap-0 md:grid-cols-[1.1fr_2fr]">
            <div className="navy-depth p-5 text-white">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1ED3D9]">Your role</div>
              <p className="mt-2 text-sm leading-relaxed text-white/85">The global team sets up the Studio: people, utilities and teams. TTLs then populate each plan across eight modules, in any order, and you review what they submit.</p>
              <Link href="/help" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#1ED3D9] hover:underline" data-testid="link-admin-help">Read the global team guide <ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="grid gap-px bg-[#323D4F]/[.07] sm:grid-cols-2">
              {[
                { n: "1", t: "Manage people", d: "Invite TTLs, editors and viewers and set roles.", el: <Link href="/users" className="text-[#127A80] hover:underline" data-testid="link-onboard-people">Open People & roles</Link> },
                { n: "2", t: "Create a utility", d: "Registers the utility and a plan with eight blank modules.", el: <button type="button" onClick={() => setCreating(true)} className="text-[#127A80] hover:underline" data-testid="button-onboard-create">Register utility</button> },
                { n: "3", t: "View progress", d: "Tiles and the registry show every plan's status.", el: <button type="button" onClick={toTable} className="text-[#127A80] hover:underline" data-testid="button-onboard-progress">Go to registry</button> },
                openAccess
                  ? { n: "4", t: "See a fictional example", d: "The Valle Verde illustrative plan.", el: <button type="button" disabled={demo.isPending} onClick={() => demo.mutate({ data: { mode: "complete" } })} className="text-[#127A80] hover:underline" data-testid="button-onboard-example">Open Valle Verde example</button> }
                  : { n: "4", t: "Review utility requests", d: "Approve or decline requests to register utilities.", el: <Link href="/requests" className="text-[#127A80] hover:underline" data-testid="link-onboard-requests">Utility requests</Link> },
              ].map((x) => (
                <div key={x.n} className="bg-white/90 p-4 transition-colors hover:bg-[#E4F8F9]/70">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#323D4F]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E4F8F9] text-[11px] text-[#127A80]">{x.n}</span>{x.t}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{x.d}</p>
                  <div className="mt-2 text-xs font-medium">{x.el}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="rise mb-6 p-5" data-testid="card-getting-started">
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#127A80]">Getting started</div>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[#323D4F]">
                <li>Open a plan and choose any of its eight modules. There is no fixed order.</li>
                {me.role === "viewer" ? <li>Read each module and its guidance; ask your TTL for changes.</li> : <>
                  <li>Save draft stores your edits; Submit sends the module for review.</li>
                  <li>Returned modules show the reviewer's comment. Revise and submit again.</li>
                  <li>Examples are illustrative. Replace them with your utility's data.</li>
                </>}
              </ol>
              <Link href="/help" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#127A80] hover:underline" data-testid="link-ttl-help">Full guide <ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="w-full space-y-2 md:w-72">
              {list.isLoading ? <div className="h-10 animate-pulse rounded-lg bg-muted" /> : items.length === 0 ? <p className="text-xs text-muted-foreground">No plans assigned yet. A TTL or administrator can add you to a team.</p> :
                items.slice(0, 3).map((u) => (
                  <Link key={u.id} href={`/plans/${u.planId}`} className="flex items-center justify-between gap-2 navy-depth rounded-lg px-3 py-2.5 text-sm text-white transition hover:brightness-125" data-testid={`link-continue-plan-${u.id}`}>
                    <span className="min-w-0 truncate">{me.role === "viewer" ? "Open" : "Continue my plan"}: {u.shortName || u.name}</span><ChevronRight className="h-4 w-4 shrink-0" />
                  </Link>
                ))}
            </div>
          </div>
        </Card>
      )}

      {admin && (
        <section className="mb-8">
          {summary.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[124px] animate-pulse rounded-xl border bg-card" />)}</div>
          ) : summary.isError ? (
            <Card><ErrorState message={errMsg(summary.error)} onRetry={() => summary.refetch()} /></Card>
          ) : s && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Tile testid="tile-utilities" label="Total utilities" value={String(s.utilities)} sub="Show all in registry" accent="#323D4F" onClick={() => { setQInput(""); setF(EMPTY); setPage(1); toTable(); }} />
                <Tile testid="tile-countries" label="Distinct countries" value={String(s.countries)} sub="Sort registry by country" accent="#1ED3D9" onClick={() => { update({ sort: "country", direction: "asc" }); toTable(); }} />
                <Tile testid="tile-progress" label="Average reviewed modules" value={`${Math.round(s.averageProgress * 10) / 10}%`} sub="Sort by progress" accent="#127A80" onClick={() => { update({ sort: "progress", direction: "desc" }); toTable(); }} />
                <Tile testid="tile-completed" label="Completed plans" value={String(s.completed)} sub="Filter to completed" accent="#70AD47" onClick={() => { update({ status: "completed" }); toTable(); }} />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Bars title="Utilities by current module" data={s.phases} colorFor={(b, i) => phaseColor(b.label, i)} empty="Module counts appear once utilities are registered." />
                <Bars title="Utilities by region" data={s.regions} colorFor={() => "#1ED3D9"} onPick={(b) => { update({ region: b.label }); toTable(); }} empty="Regional distribution appears once utilities are registered." />
              </div>
              {s.pendingRequests > 0 && (
                <Link href="/requests" className="mt-4 flex items-center justify-between rounded-xl border border-[#1ED3D9]/30 bg-[#1ED3D9]/[.06] px-5 py-3 text-sm text-[#323D4F] hover:bg-[#1ED3D9]/10" data-testid="link-pending-requests">
                  <span><strong className="tnum">{s.pendingRequests}</strong> utility request{s.pendingRequests === 1 ? "" : "s"} awaiting your decision</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
              <div className="mt-3 text-[11px] text-muted-foreground">Source: Utility registry (user-entered data)</div>
            </>
          )}
        </section>
      )}

      <div ref={tableRef} className="scroll-mt-20" />
      <Card className="overflow-hidden">
        <div className="space-y-3 border-b bg-white/40 p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className={inputCls + " pl-9"} placeholder="Search utilities, service areas, TTLs, project IDs…" value={qInput} onChange={(e) => onSearch(e.target.value)} data-testid="input-search" />
            </div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild><Btn variant="outline" data-testid="button-views"><Bookmark className="h-4 w-4" /> Saved views</Btn></PopoverTrigger>
                <PopoverContent align="end" className="w-72 rounded-xl p-3">
                  <div className="mb-2 text-xs font-semibold text-[#323D4F]">Saved views</div>
                  {(views.data ?? []).length === 0 ? <div className="py-3 text-xs text-muted-foreground">No saved views yet. Set filters, name the view and save.</div> : (
                    <div className="mb-3 max-h-48 space-y-0.5 overflow-auto">
                      {(views.data ?? []).map((v) => (
                        <div key={v.id} className="group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted">
                          <button className="flex-1 truncate text-left text-sm text-[#323D4F]" data-testid={`view-${v.id}`} onClick={() => { const nf = { ...EMPTY, ...v.filters }; setF(nf); setQInput(nf.q); setPage(1); }}>{v.name}</button>
                          <button className="opacity-0 group-hover:opacity-100" onClick={() => delView.mutate({ id: v.id })} aria-label="Delete view" data-testid={`button-delete-view-${v.id}`}><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <form className="flex gap-2 border-t pt-3" onSubmit={(e) => { e.preventDefault(); if (viewName.trim()) saveView.mutate({ data: { name: viewName.trim(), filters: { ...f } } }); }}>
                    <input className={inputCls} placeholder="Name current view" maxLength={60} value={viewName} onChange={(e) => setViewName(e.target.value)} data-testid="input-view-name" />
                    <Btn type="submit" disabled={!viewName.trim() || saveView.isPending} data-testid="button-save-view">Save</Btn>
                  </form>
                </PopoverContent>
              </Popover>
              <a href={exportHref} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-white px-3.5 text-sm font-medium text-[#323D4F] hover:bg-muted" data-testid="link-export-csv"><Download className="h-4 w-4" /> CSV</a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <select className={inputCls} value={f.country} onChange={(e) => update({ country: e.target.value })} data-testid="filter-country">
              <option value="">All countries</option>{(meta.data?.countries ?? []).map((c) => <option key={c.iso3} value={c.iso3}>{c.name}</option>)}
            </select>
            <select className={inputCls} value={f.region} onChange={(e) => update({ region: e.target.value })} data-testid="filter-region">
              <option value="">All regions</option>{regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select className={inputCls} value={f.ttl} onChange={(e) => update({ ttl: e.target.value })} disabled={!ttls.length} data-testid="filter-ttl">
              <option value="">All TTLs</option>{ttls.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
            <select className={inputCls} value={f.year} onChange={(e) => update({ year: e.target.value })} data-testid="filter-year">
              <option value="">All plan years</option>{PLAN_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className={inputCls} value={f.status} onChange={(e) => update({ status: e.target.value })} data-testid="filter-status">
              <option value="">Any active plan status</option><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="under_review">Under review</option><option value="completed">Completed</option><option value="archived">Archived</option>
            </select>
          </div>
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFilters.map((k) => (
                <button key={k} onClick={() => { update({ [k]: "" }); if (k === "q") setQInput(""); }} className="inline-flex items-center gap-1 rounded-full bg-[#323D4F]/[.06] px-2.5 py-1 text-xs text-[#323D4F] hover:bg-[#323D4F]/10" data-testid={`chip-${k}`}>
                  {k === "q" ? `“${f.q}”` : k === "ttl" ? ttls.find((u) => u.id === f.ttl)?.fullName ?? "TTL" : k === "country" ? meta.data?.countries.find((c) => c.iso3 === f.country)?.name ?? f.country : humanize(f[k])}
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button className="text-xs text-muted-foreground hover:text-[#323D4F]" onClick={() => { setQInput(""); setF((s) => ({ ...EMPTY, sort: s.sort, direction: s.direction })); setPage(1); }} data-testid="button-clear-filters">Clear all</button>
            </div>
          )}
        </div>

        {list.isLoading ? <SkeletonRows /> : list.isError ? <ErrorState message={errMsg(list.error)} onRetry={() => list.refetch()} /> : items.length === 0 ? (
          activeFilters.length ? (
            <Empty icon={<Search className="h-6 w-6" />} title="No utilities match these filters" body="Try a broader search or clear one of the filters above." />
          ) : (
            <Empty icon={<Droplets className="h-6 w-6" />} title="The registry is empty" body={admin ? "Register the first utility, or approve a request from a Task Team Leader, to start the portfolio." : "You have not been assigned to any utility yet. A TTL or administrator can add you to a team."}
              action={admin ? <Btn onClick={() => setCreating(true)} data-testid="button-new-utility-empty"><Plus className="h-4 w-4" /> Register utility</Btn> : me.role === "ttl" ? <Link href="/requests" className="text-sm font-medium text-[#127A80] hover:underline">Request a utility</Link> : undefined} />
          )
        ) : (
          <div className={cn("overflow-x-auto transition-opacity", list.isFetching && "opacity-60")}>
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-[#323D4F]/[.035] text-xs uppercase tracking-wide text-muted-foreground">
                <tr><SortH col="name">Utility</SortH><SortH col="country">Country</SortH><SortH col="ttl">TTL</SortH><SortH col="year">Year</SortH><th className="px-4 py-3 text-left font-medium">Module</th><SortH col="progress" className="w-44">Reviewed</SortH><SortH col="status">Status</SortH></tr>
              </thead>
              <tbody className="divide-y">
                {items.map((u) => (
                  <tr key={u.id} className="group cursor-pointer hover:bg-[#1ED3D9]/[.035] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1ED3D9]" tabIndex={0} aria-label={`Open plan for ${u.name}`} onClick={() => navigate(`/plans/${u.planId}`)} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==="Enter"||e.key===" ")){e.preventDefault();navigate(`/plans/${u.planId}`);}}} data-testid={`row-utility-${u.id}`}>
                    <td className="px-4 py-3">
                      <Link href={`/plans/${u.planId}`} onClick={e=>e.stopPropagation()} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white text-[10px] font-semibold text-[#323D4F]">
                          {u.logoPath ? <img src={logoUrl(u.logoPath)!} alt="" className="h-full w-full object-contain p-0.5" /> : initials(u.shortName || u.name)}
                        </div>
                        <div className="min-w-0"><div className="truncate font-medium text-[#323D4F] group-hover:text-[#127A80]">{u.name}</div><div className="truncate text-xs text-muted-foreground">{u.serviceArea}</div></div>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><div className="text-[#323D4F]">{u.countryName}</div><div className="text-xs text-muted-foreground">{u.region}</div></td>
                    <td className="px-4 py-3 text-[#323D4F]">{u.ttlName}</td>
                    <td className="px-4 py-3 tnum">{u.planYear}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs"><span className="h-2 w-2 rounded-full" style={{ background: phaseColor(u.currentPhase) }} />{u.currentPhase || "—"}</span></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-[#127A80] to-[#1ED3D9]" style={{ width: `${Math.min(100, u.progress)}%` }} /></div><span className="w-9 text-right text-xs tnum">{Math.round(u.progress)}%</span></div></td>
                    <td className="px-4 py-3"><Pill tone={statusTone(u.status === "archived" ? u.status : u.planStatus)}>{humanize(u.status === "archived" ? u.status : u.planStatus)}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <span className="tnum" data-testid="text-pagination">{(page - 1) * PAGE + 1}–{Math.min(page * PAGE, total)} of {total}</span>
            <div className="flex items-center gap-1">
              <Btn variant="ghost" className="h-8 px-2" disabled={page <= 1} onClick={() => setPage(page - 1)} data-testid="button-prev-page"><ChevronLeft className="h-4 w-4" /></Btn>
              <span className="px-2 tnum">Page {page} / {pages}</span>
              <Btn variant="ghost" className="h-8 px-2" disabled={page >= pages} onClick={() => setPage(page + 1)} data-testid="button-next-page"><ChevronRight className="h-4 w-4" /></Btn>
            </div>
          </div>
        )}
      </Card>
      {!admin && <div className="mt-3 text-[11px] text-muted-foreground">Source: Utility registry (user-entered data)</div>}

      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="mb-6"><SheetTitle className="text-[#323D4F]">Create utility</SheetTitle><SheetDescription>Creates the utility and its business plan with eight blank modules.</SheetDescription></SheetHeader>
          {creating && <UtilityForm submitLabel="Register utility" pending={create.isPending} onCancel={() => setCreating(false)} onSubmit={(data) => create.mutate({ data })} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
