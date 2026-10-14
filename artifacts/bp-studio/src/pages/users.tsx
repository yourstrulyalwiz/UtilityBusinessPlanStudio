import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListUsers, getListUsersQueryKey, useInviteUser, useUpdateUser, getListAuditQueryKey, type PersonInput, type PersonUpdateRole, type Person } from "@workspace/api-client-react";
import { Copy, Info, Search, UserPlus, Users as UsersIcon, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, PageHeader, Empty, ErrorState, SkeletonRows, Pill, Btn, Field, inputCls } from "@/components/kit";
import { useMe, errMsg, ROLE_LABEL, initials, appLink } from "@/lib/app";
import { useToast } from "@/hooks/use-toast";

const BLANK: PersonInput = { fullName: "", email: "", role: "viewer", organization: "" };

export default function UsersPage() {
  const me = useMe();
  const admin = me.role === "admin";
  const qc = useQueryClient();
  const { toast } = useToast();
  const list = useListUsers();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PersonInput>(BLANK);
  const [invited, setInvited] = useState<Person | null>(null);
  const [q, setQ] = useState("");
  const refresh = () => { qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); qc.invalidateQueries({ queryKey: getListAuditQueryKey() }); };
  const invite = useInviteUser({ mutation: { onSuccess: (p) => { refresh(); setInvited(p); }, onError: (e) => toast({ title: "Invitation failed", description: errMsg(e), variant: "destructive" }) } });
  const upd = useUpdateUser({ mutation: { onSuccess: () => { refresh(); toast({ title: "Access updated" }); }, onError: (e) => toast({ title: "Update failed", description: errMsg(e), variant: "destructive" }) } });

  const roles = admin ? (["admin", "ttl", "editor", "viewer"] as const) : (["editor", "viewer"] as const);
  const people = (list.data ?? []).filter((p) => !q || `${p.fullName} ${p.email} ${p.organization}`.toLowerCase().includes(q.toLowerCase()));
  const close = () => { setOpen(false); setInvited(null); setForm(BLANK); };
  const copy = () => navigator.clipboard.writeText(appLink()).then(() => toast({ title: "Link copied" }));

  return (
    <div>
      <PageHeader eyebrow="Access" title="People & roles" description={admin ? "Provision access, assign roles and deactivate accounts." : "Invite editors and viewers to work on your utilities' teams."}
        actions={<Btn onClick={() => setOpen(true)} data-testid="button-invite"><UserPlus className="h-4 w-4" /> Invite person</Btn>} />
      <Card className="overflow-hidden">
        <div className="border-b p-4"><div className="relative max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className={inputCls + " pl-9"} placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search-people" /></div></div>
        {list.isLoading ? <SkeletonRows /> : list.isError ? <ErrorState message={errMsg(list.error)} onRetry={() => list.refetch()} /> : people.length === 0 ? (
          <Empty icon={<UsersIcon className="h-6 w-6" />} title={q ? "No one matches" : "Only you so far"} body={q ? "Try another name or email." : "Invite colleagues to give them access to the Studio."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3 text-left font-medium">Person</th><th className="px-4 py-3 text-left font-medium">Organization</th><th className="px-4 py-3 text-left font-medium">Role</th><th className="px-4 py-3 text-left font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Active</th></tr></thead>
              <tbody className="divide-y">
                {people.map((p) => {
                  const self = p.id === me.id;
                  return (
                    <tr key={p.id} className={p.isActive ? "" : "opacity-60"} data-testid={`row-user-${p.id}`}>
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#323D4F]/[.07] text-[11px] font-semibold text-[#323D4F]">{initials(p.fullName)}</div><div><div className="font-medium text-[#323D4F]">{p.fullName}{self && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}</div><div className="text-xs text-muted-foreground">{p.email}</div></div></div></td>
                      <td className="px-4 py-3 text-[#323D4F]">{p.organization || "—"}</td>
                      <td className="px-4 py-3">
                        {admin && !self ? (
                          <select className={inputCls + " h-8 w-40"} value={p.role} onChange={(e) => upd.mutate({ id: p.id, data: { role: e.target.value as PersonUpdateRole } })} data-testid={`select-role-${p.id}`}>
                            {(["admin", "ttl", "editor", "viewer"] as const).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                          </select>
                        ) : <Pill tone="navy">{ROLE_LABEL[p.role]}</Pill>}
                      </td>
                      <td className="px-4 py-3">{p.invited ? <Pill tone="blue">Invited · not yet signed in</Pill> : <Pill tone="green">Signed in</Pill>}</td>
                      <td className="px-4 py-3 text-right"><Switch checked={p.isActive} disabled={!admin || self || upd.isPending} onCheckedChange={(c) => upd.mutate({ id: p.id, data: { isActive: c } })} data-testid={`switch-active-${p.id}`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="max-w-md rounded-xl">
          {invited ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[#3F6E22]" />
              <DialogTitle className="text-[#323D4F]">Access provisioned for {invited.fullName}</DialogTitle>
              <DialogDescription className="mt-2">They can sign in as <strong>{invited.email}</strong> with the role {ROLE_LABEL[invited.role]}.</DialogDescription>
              <div className="mt-5 flex items-center gap-2 rounded-lg border bg-muted/50 p-2 text-left"><code className="flex-1 truncate px-1 text-xs text-[#323D4F]" data-testid="text-app-link">{appLink()}</code><Btn variant="outline" className="h-8" onClick={copy} data-testid="button-copy-link"><Copy className="h-3.5 w-3.5" /> Copy</Btn></div>
              <div className="mt-4 flex gap-2 rounded-lg bg-[#FF6A0D]/10 p-3 text-left text-xs text-[#9A3A05]"><Info className="h-4 w-4 shrink-0" />Email delivery is not configured. No message has been sent — share this link with them yourself.</div>
              <Btn className="mt-5 w-full" onClick={close} data-testid="button-done">Done</Btn>
            </div>
          ) : (
            <>
              <DialogHeader><DialogTitle className="text-[#323D4F]">Invite a person</DialogTitle><DialogDescription>Creates provisioned access tied to their sign-in email. No email is sent.</DialogDescription></DialogHeader>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); invite.mutate({ data: { ...form, fullName: form.fullName.trim(), email: form.email.trim(), organization: form.organization?.trim() || undefined } }); }}>
                <Field label="Full name" required><input required maxLength={120} className={inputCls} value={form.fullName} onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))} data-testid="input-invite-name" /></Field>
                <Field label="Email" required><input required type="email" className={inputCls} value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} data-testid="input-invite-email" /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Role" required hint={admin ? undefined : "TTLs can invite editors and viewers"}>
                    <select className={inputCls} value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as PersonInput["role"] }))} data-testid="select-invite-role">{roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
                  </Field>
                  <Field label="Organization"><input className={inputCls} value={form.organization ?? ""} onChange={(e) => setForm((s) => ({ ...s, organization: e.target.value }))} data-testid="input-invite-org" /></Field>
                </div>
                <div className="flex justify-end gap-2"><Btn type="button" variant="ghost" onClick={close}>Cancel</Btn><Btn type="submit" disabled={invite.isPending} data-testid="button-submit-invite">{invite.isPending ? "Provisioning…" : "Provision access"}</Btn></div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
