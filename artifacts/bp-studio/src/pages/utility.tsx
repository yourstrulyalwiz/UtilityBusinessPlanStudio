import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetUtility, getGetUtilityQueryKey, useUpdateUtility, useAddMember, useRemoveMember, useListUsers, getListUsersQueryKey,
  useGetPlan, getGetPlanQueryKey, useGetWorkflow, getGetWorkflowQueryKey,
  getListUtilitiesQueryKey, getGetSummaryQueryKey, getListAuditQueryKey, type MemberInputMemberRole, type UtilityUpdate,
} from "@workspace/api-client-react";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Lock, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, Empty, ErrorState, Pill, statusTone, Btn, Field, inputCls, Wave } from "@/components/kit";
import { LogoPicker } from "@/components/utility-form";
import { useMe, errMsg, phaseColor, logoUrl, initials, humanize, fmtDate, fmtDateTime, MEMBER_ROLE_LABEL } from "@/lib/app";
import { useToast } from "@/hooks/use-toast";

export default function UtilityPage() {
  const { id: routeId = "", planId = "" } = useParams<{ id?: string; planId?: string }>();
  const me = useMe();
  const qc = useQueryClient();
  const { toast } = useToast();
  const planQuery = useGetPlan(planId, { query: { enabled: !!planId, queryKey: getGetPlanQueryKey(planId) } });
  const utilityQuery = useGetUtility(routeId, { query: { enabled: !!routeId, queryKey: getGetUtilityQueryKey(routeId) } });
  const q = planId ? planQuery : utilityQuery;
  const id = routeId || q.data?.utility.id || "";
  const canManage = me.role === "admin" || me.role === "ttl";
  const users = useListUsers({ query: { enabled: canManage, queryKey: getListUsersQueryKey() } });
  const wfPlanId = planId || q.data?.utility.planId || "";
  const wf = useGetWorkflow(wfPlanId, { query: { enabled: !!wfPlanId, queryKey: getGetWorkflowQueryKey(wfPlanId) } });
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newMember, setNewMember] = useState<{ userId: string; memberRole: MemberInputMemberRole }>({ userId: "", memberRole: "team" });
  const [form, setForm] = useState<UtilityUpdate>({});

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getGetUtilityQueryKey(id) });
    qc.invalidateQueries({ queryKey: getGetPlanQueryKey(planId || q.data?.utility.planId || "") });
    qc.invalidateQueries({ queryKey: getListUtilitiesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getListAuditQueryKey() });
  };
  const onErr = (title: string) => (e: unknown) => toast({ title, description: errMsg(e), variant: "destructive" });
  const update = useUpdateUtility({ mutation: { onSuccess: () => { refresh(); setEditing(false); toast({ title: "Utility updated" }); }, onError: onErr("Update failed") } });
  const add = useAddMember({ mutation: { onSuccess: () => { refresh(); setAdding(false); setNewMember({ userId: "", memberRole: "team" }); toast({ title: "Team member added" }); }, onError: onErr("Could not add member") } });
  const remove = useRemoveMember({ mutation: { onSuccess: () => { refresh(); toast({ title: "Team member removed" }); }, onError: onErr("Could not remove member") } });

  if (q.isLoading) return <div className="space-y-4"><div className="h-28 animate-pulse rounded-xl border bg-card" /><div className="h-96 animate-pulse rounded-xl border bg-card" /></div>;
  if (q.isError || !q.data) return <Card><ErrorState message={errMsg(q.error, "Utility not found or you do not have access.")} onRetry={() => q.refetch()} /></Card>;
  const { utility: u, activities, members, audit } = q.data;
  const phases = Array.from(new Set(activities.map((a) => a.phaseCode)));
  const memberEmails = new Set(members.map((m) => m.email));
  const candidates = (users.data ?? []).filter((p) => p.isActive && !memberEmails.has(p.email));
  const ttls = (users.data ?? []).filter((p) => (p.role === "ttl" || p.id === "00000000-0000-4000-8000-000000000001") && p.isActive);

  return (
    <div>
      <Link href={me.role === "admin" ? "/admin" : "/"} className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#323D4F]" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Back to registry</Link>
      <Card className="rise mb-6 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white text-lg font-semibold text-[#323D4F]">
            {u.logoPath ? <img src={logoUrl(u.logoPath)!} alt={`${u.name} logo`} className="h-full w-full object-contain p-1.5" /> : initials(u.shortName || u.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[#323D4F]" data-testid="text-utility-name">{u.name}</h1>
              {u.shortName && <Pill tone="navy">{u.shortName}</Pill>}
              <Pill tone={statusTone(u.status)}>{humanize(u.status)}</Pill>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{u.serviceArea} · {u.countryName} · {u.region}</div>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
              {[["TTL", u.ttlName], ["Plan year", String(u.planYear)], ["Currency", u.currency], ["WB project", u.wbProjectId || "—"], ["UoF completion", fmtDate(u.uofCompletionDate)], ["Plan status", humanize(u.planStatus)], ["Current phase", u.currentPhase || "—"], ["Registered", fmtDate(u.createdAt)]].map(([k, v]) => (
                <div key={k}><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium text-[#323D4F]">{v}</dd></div>
              ))}
            </dl>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 md:w-48">
            <div className="rounded-lg border border-[#1ED3D9]/15 bg-[#E4F8F9]/60 p-3">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Progress</span><span className="font-semibold text-[#323D4F] tnum">{Math.round(u.progress)}%</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-gradient-to-r from-[#127A80] to-[#1ED3D9]" style={{ width: `${Math.min(100, u.progress)}%` }} /></div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild><a href={`/api/plans/${u.planId}/deck`} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border bg-white text-sm font-medium text-[#323D4F] hover:bg-muted" data-testid="button-deck"><FileText className="h-4 w-4" /> Download draft deck</a></TooltipTrigger>
              <TooltipContent>Step 0 preview: registry information only. Full business-plan output arrives in Step 4.</TooltipContent>
            </Tooltip>
            {me.role === "admin" && <Btn variant="navy" onClick={() => { setForm({ name: u.name, shortName: u.shortName, serviceArea: u.serviceArea, ttlUserId: u.ttlUserId, wbProjectId: u.wbProjectId, status: u.status === "archived" ? "archived" : "active", logoPath: u.logoPath }); setEditing(true); }} data-testid="button-edit-utility"><Pencil className="h-4 w-4" /> Edit details</Btn>}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          {(() => {
            const w = wf.data; const nxt = w?.activities.find((a) => a.code === w.nextCode);
            if (wf.isLoading) return <div className="mb-6 h-28 animate-pulse rounded-xl border bg-card" />;
            if (!w) return wf.isError ? <Card className="mb-6"><ErrorState message={errMsg(wf.error, "Workflow unavailable.")} onRetry={() => wf.refetch()} /></Card> : null;
            const done = !nxt;
            return (
              <Card className="rise mb-6 overflow-hidden" data-testid="card-continue">
                <div className="navy-depth flex flex-col gap-4 p-5 text-white sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1ED3D9]">{done ? "All steps complete" : `Next up · step ${w.activities.indexOf(nxt) + 1} of ${w.activities.length}`}</div>
                    <div className="mt-1 text-lg font-semibold" data-testid="text-next-activity">{done ? "Every activity is approved." : <><span className="mr-2 font-mono text-sm text-white/60">{nxt.code}</span>{nxt.name}</>}</div>
                    {!done && <div className="mt-1 text-xs text-white/70">{nxt.phaseCode} · {nxt.days} days · {humanize(nxt.status)}{!w.canEdit ? " · read-only for your role" : ""}</div>}
                  </div>
                  {done ? <CheckCircle2 className="h-8 w-8 text-[#1ED3D9]" /> : <Link href={`/plans/${w.planId}/activities/${nxt.code}`} className="inline-flex h-10 items-center gap-2 rounded-lg btn-glow bg-[#1ED3D9] px-4 text-sm font-medium text-[#29323F] hover:bg-[#17BFC5]" data-testid="button-continue">{nxt.status === "not_started" ? "Start step" : "Continue"} <ArrowRight className="h-4 w-4" /></Link>}
                </div>
              </Card>
            );
          })()}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#323D4F]">Business plan activities</h2>
            <span className="text-xs text-muted-foreground">Open any step to work or preview</span>
          </div>
          {activities.length === 0 ? <Card><Empty icon={<FileText className="h-6 w-6" />} title="No activities yet" body="The plan's activities will appear here once the plan is initialised." /></Card> : (
            <div className="space-y-4">
              {phases.map((pc, i) => {
                const acts = activities.filter((a) => a.phaseCode === pc);
                const color = phaseColor(pc, i);
                const done = acts.filter((a) => a.status === "approved").length;
                return (
                  <Card key={pc} className="lift overflow-hidden" data-testid={`phase-${pc}`}>
                    <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderLeft: `4px solid ${color}` }}>
                      <div className="text-sm font-semibold" style={{ color }}>Phase {i + 1} <span className="ml-1 text-xs font-normal text-muted-foreground">{pc}</span></div>
                      <span className="text-xs text-muted-foreground tnum">{done}/{acts.length} complete</span>
                    </div>
                    <ul className="divide-y">
                      {acts.map((a) => (
                        <li key={a.code}><Link href={`/plans/${u.planId}/activities/${a.code}`} className="flex items-start gap-4 px-5 py-3 transition hover:bg-[#1ED3D9]/[.04]" data-testid={`activity-${a.code}`}>
                          <span className="mt-0.5 w-10 shrink-0 font-mono text-[11px] text-muted-foreground">{a.code}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-[#323D4F]">{a.name}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{a.milestone ? `Milestone: ${a.milestone} · ` : ""}{a.days} days{a.ownerName ? ` · ${a.ownerName}` : ""}{a.dueDate ? ` · due ${fmtDate(a.dueDate)}` : ""}</div>
                          </div>
                          {wf.data?.activities.find((x) => x.code === a.code)?.locked && <Lock className="mt-1 h-3.5 w-3.5 text-muted-foreground" />}<Pill tone={statusTone(a.status)}>{humanize(a.status)}</Pill>
                        </Link></li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-sm font-semibold text-[#323D4F]">Team</h2>
              {canManage && <Btn variant="ghost" className="h-8 px-2 text-[#127A80]" onClick={() => setAdding(true)} data-testid="button-add-member"><UserPlus className="h-4 w-4" /> Add</Btn>}
            </div>
            {members.length === 0 ? <Empty icon={<Users className="h-5 w-5" />} title="No team members" body={canManage ? "Add the utility focal point, team members and consultants." : "No one has been assigned yet."} /> : (
              <ul className="divide-y">
                {members.map((m) => (
                  <li key={m.id} className="group flex items-center gap-3 px-5 py-3" data-testid={`member-${m.id}`}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#323D4F]/[.07] text-[11px] font-semibold text-[#323D4F]">{initials(m.fullName)}</div>
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-[#323D4F]">{m.fullName}</div><div className="truncate text-xs text-muted-foreground">{MEMBER_ROLE_LABEL[m.memberRole] ?? humanize(m.memberRole)}</div></div>
                    {canManage && <button disabled={remove.isPending} onClick={() => { if (confirm(`Remove ${m.fullName} from this team?`)) remove.mutate({ id, memberId: m.id }); }} className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100" aria-label="Remove member" data-testid={`button-remove-member-${m.id}`}><Trash2 className="h-4 w-4" /></button>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <div className="border-b px-5 py-3"><h2 className="text-sm font-semibold text-[#323D4F]">Recent history</h2></div>
            {audit.length === 0 ? <div className="px-5 py-8 text-center text-xs text-muted-foreground">No recorded changes yet.</div> : (
              <ol className="relative space-y-4 px-5 py-4">
                {audit.slice(0, 12).map((a) => (
                  <li key={a.id} className="relative pl-5"><span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-[#1ED3D9]" />
                    <div className="text-[13px] text-[#323D4F]"><strong className="font-medium">{a.actor}</strong> {humanize(a.action).toLowerCase()}</div>
                    <div className="text-[11px] text-muted-foreground">{fmtDateTime(a.createdAt)}</div>
                  </li>
                ))}
              </ol>
            )}
            <Wave className="opacity-40" />
          </Card>
        </div>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader><DialogTitle className="text-[#323D4F]">Add team member</DialogTitle><DialogDescription>Only people with Studio access can be assigned. Invite new people from People &amp; roles.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (newMember.userId) add.mutate({ id, data: newMember }); }}>
            <Field label="Person" required>
              <select className={inputCls} value={newMember.userId} onChange={(e) => setNewMember((s) => ({ ...s, userId: e.target.value }))} data-testid="select-member">
                <option value="">{users.isLoading ? "Loading…" : candidates.length ? "Select a person…" : "Everyone is already on this team"}</option>
                {candidates.map((p) => <option key={p.id} value={p.id}>{p.fullName} — {p.email}</option>)}
              </select>
            </Field>
            <Field label="Team role" required>
              <select className={inputCls} value={newMember.memberRole} onChange={(e) => setNewMember((s) => ({ ...s, memberRole: e.target.value as MemberInputMemberRole }))} data-testid="select-member-role">
                {Object.entries(MEMBER_ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <div className="flex justify-end gap-2"><Btn type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Btn><Btn type="submit" disabled={!newMember.userId || add.isPending} data-testid="button-confirm-add-member">{add.isPending ? "Adding…" : "Add to team"}</Btn></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-auto rounded-xl">
          <DialogHeader><DialogTitle className="text-[#323D4F]">Edit utility</DialogTitle><DialogDescription>Country and plan year are fixed once registered.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            if (form.wbProjectId && !/^P\d{6}$/.test(form.wbProjectId)) { toast({ title: "WB project ID must be P followed by 6 digits", variant: "destructive" }); return; }
            update.mutate({ id, data: form });
          }}>
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <Field label="Name" required><input required className={inputCls} value={form.name ?? ""} maxLength={200} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} data-testid="input-edit-name" /></Field>
              <Field label="Short name"><input className={inputCls} value={form.shortName ?? ""} maxLength={12} onChange={(e) => setForm((s) => ({ ...s, shortName: e.target.value }))} data-testid="input-edit-short-name" /></Field>
            </div>
            <Field label="Service area" required><input required className={inputCls} value={form.serviceArea ?? ""} onChange={(e) => setForm((s) => ({ ...s, serviceArea: e.target.value }))} data-testid="input-edit-service-area" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Task Team Leader">
                <select className={inputCls} value={form.ttlUserId ?? ""} disabled={me.role !== "admin"} onChange={(e) => setForm((s) => ({ ...s, ttlUserId: e.target.value }))} data-testid="select-edit-ttl">
                  {!ttls.some((t) => t.id === form.ttlUserId) && <option value={form.ttlUserId}>{u.ttlName}</option>}
                  {ttls.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                </select>
              </Field>
              <Field label="WB project ID"><input className={inputCls} value={form.wbProjectId ?? ""} maxLength={7} onChange={(e) => setForm((s) => ({ ...s, wbProjectId: e.target.value.toUpperCase() }))} data-testid="input-edit-wb-project" /></Field>
            </div>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as "active" | "archived" }))} data-testid="select-edit-status"><option value="active">Active</option><option value="archived">Archived</option></select>
            </Field>
            <Field label="Logo"><LogoPicker value={form.logoPath ?? null} onChange={(p) => setForm((s) => ({ ...s, logoPath: p }))} /></Field>
            <div className="flex justify-end gap-2 border-t pt-4"><Btn type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn><Btn type="submit" disabled={update.isPending} data-testid="button-save-utility">{update.isPending ? "Saving…" : "Save changes"}</Btn></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
