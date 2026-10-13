import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListRequests, getListRequestsQueryKey, useCreateRequest, useDecideRequest, useGetMetadata,
  getListUtilitiesQueryKey, getGetSummaryQueryKey, getListNotificationsQueryKey, getListAuditQueryKey, type UtilityRequest, type RequestInput,
} from "@workspace/api-client-react";
import { Check, Inbox, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, PageHeader, Empty, ErrorState, SkeletonRows, Pill, statusTone, Btn, Field, inputCls } from "@/components/kit";
import { UtilityForm, PLAN_YEARS } from "@/components/utility-form";
import { useMe, errMsg, fmtDate, humanize } from "@/lib/app";
import { useToast } from "@/hooks/use-toast";

const YEAR = new Date().getFullYear();

export default function Requests() {
  const me = useMe();
  const admin = me.role === "admin";
  const qc = useQueryClient();
  const { toast } = useToast();
  const list = useListRequests();
  const meta = useGetMetadata();
  const [creating, setCreating] = useState(false);
  const [deciding, setDeciding] = useState<{ r: UtilityRequest; mode: "approve" | "decline" } | null>(null);
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [form, setForm] = useState<RequestInput>({ utilityName: "", countryIso3: "", serviceArea: "", planYear: YEAR, justification: "" });

  const refresh = () => [getListRequestsQueryKey(), getListUtilitiesQueryKey(), getGetSummaryQueryKey(), getListNotificationsQueryKey(), getListAuditQueryKey()].forEach((k) => qc.invalidateQueries({ queryKey: k }));
  const create = useCreateRequest({ mutation: {
    onSuccess: () => { refresh(); setCreating(false); setForm({ utilityName: "", countryIso3: "", serviceArea: "", planYear: YEAR, justification: "" }); toast({ title: "Request submitted", description: "Administrators have been notified in-app." }); },
    onError: (e) => toast({ title: "Could not submit request", description: errMsg(e), variant: "destructive" }) } });
  const decide = useDecideRequest({ mutation: {
    onSuccess: (_d, v) => { refresh(); setDeciding(null); setNote(""); toast({ title: v.data.decision === "approve" ? "Request approved — utility registered" : "Request declined", description: "The requester has been notified in-app." }); },
    onError: (e) => toast({ title: "Decision failed", description: errMsg(e), variant: "destructive" }) } });

  const items = list.data ?? [];
  const shown = tab === "pending" ? items.filter((r) => r.status === "pending") : items;
  const currency = (iso: string) => meta.data?.countries.find((c) => c.iso3 === iso)?.currencyCode ?? "USD";

  return (
    <div>
      <PageHeader eyebrow="Registration" title="Utility requests"
        description={admin ? "Review requests from Task Team Leaders. Approving registers the utility; every decision notifies the requester in-app." : "Ask an administrator to register a utility you will lead."}
        actions={me.role === "ttl" && <Btn onClick={() => setCreating(true)} data-testid="button-new-request"><Plus className="h-4 w-4" /> Request a utility</Btn>} />
      <div className="mb-4 inline-flex rounded-lg border bg-card p-1">
        {(["pending", "all"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} data-testid={`tab-${t}`} className={"rounded-md px-3 py-1.5 text-sm transition " + (tab === t ? "bg-[#002244] text-white" : "text-muted-foreground hover:text-[#002244]")}>
            {t === "pending" ? `Pending (${items.filter((r) => r.status === "pending").length})` : `All (${items.length})`}
          </button>
        ))}
      </div>
      <Card className="overflow-hidden">
        {list.isLoading ? <SkeletonRows rows={4} /> : list.isError ? <ErrorState message={errMsg(list.error)} onRetry={() => list.refetch()} /> : shown.length === 0 ? (
          <Empty icon={<Inbox className="h-6 w-6" />} title={tab === "pending" ? "Nothing waiting for a decision" : "No requests yet"}
            body={me.role === "ttl" ? "When you need a utility registered, submit a request with a short justification." : "Requests submitted by Task Team Leaders will appear here."}
            action={me.role === "ttl" ? <Btn onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Request a utility</Btn> : undefined} />
        ) : (
          <ul className="divide-y">
            {shown.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start" data-testid={`row-request-${r.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-[#002244]">{r.utilityName}</span><Pill tone={statusTone(r.status)}>{humanize(r.status)}</Pill></div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{r.serviceArea} · {r.countryName} · plan {r.planYear} · by {r.ttlName} on {fmtDate(r.createdAt)}</div>
                  <p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-[#002244]/85">{r.justification}</p>
                  {r.decisionNote && <p className="mt-2 rounded-md bg-muted/70 px-3 py-2 text-xs text-muted-foreground">Decision note: {r.decisionNote}</p>}
                </div>
                {admin && r.status === "pending" && (
                  <div className="flex gap-2">
                    <Btn variant="outline" onClick={() => { setNote(""); setDeciding({ r, mode: "decline" }); }} data-testid={`button-decline-${r.id}`}><X className="h-4 w-4" /> Decline</Btn>
                    <Btn onClick={() => { setNote(""); setDeciding({ r, mode: "approve" }); }} data-testid={`button-approve-${r.id}`}><Check className="h-4 w-4" /> Approve</Btn>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader><DialogTitle className="text-[#002244]">Request a utility</DialogTitle><DialogDescription>An administrator reviews the request. You will be notified in-app of the decision.</DialogDescription></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate({ data: { ...form, utilityName: form.utilityName.trim(), serviceArea: form.serviceArea.trim(), justification: form.justification.trim() } }); }}>
            <Field label="Utility name" required><input required maxLength={200} className={inputCls} value={form.utilityName} onChange={(e) => setForm((s) => ({ ...s, utilityName: e.target.value }))} data-testid="input-request-name" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Country" required hint={meta.data?.countrySource ? `Source: ${meta.data.countrySource}` : undefined}>
                <select required className={inputCls} value={form.countryIso3} onChange={(e) => setForm((s) => ({ ...s, countryIso3: e.target.value }))} data-testid="select-request-country">
                  <option value="">Select country…</option>{(meta.data?.countries ?? []).map((c) => <option key={c.iso3} value={c.iso3}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Plan year" required>
                <select className={inputCls} value={form.planYear} onChange={(e) => setForm((s) => ({ ...s, planYear: Number(e.target.value) }))} data-testid="select-request-year">{PLAN_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
              </Field>
            </div>
            <Field label="Service area" required><input required className={inputCls} value={form.serviceArea} onChange={(e) => setForm((s) => ({ ...s, serviceArea: e.target.value }))} data-testid="input-request-service-area" /></Field>
            <Field label="Justification" required hint={`${form.justification.length}/2000`}><textarea required maxLength={2000} rows={4} className={inputCls + " h-auto py-2"} value={form.justification} onChange={(e) => setForm((s) => ({ ...s, justification: e.target.value }))} data-testid="input-request-justification" /></Field>
            <div className="flex justify-end gap-2"><Btn type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Btn><Btn type="submit" disabled={create.isPending} data-testid="button-submit-request">{create.isPending ? "Submitting…" : "Submit request"}</Btn></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deciding} onOpenChange={(o) => !o && setDeciding(null)}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-auto rounded-xl">
          {deciding && (deciding.mode === "decline" ? (
            <>
              <DialogHeader><DialogTitle className="text-[#002244]">Decline “{deciding.r.utilityName}”</DialogTitle><DialogDescription>{deciding.r.ttlName} will see this note in their notifications.</DialogDescription></DialogHeader>
              <Field label="Reason"><textarea rows={4} className={inputCls + " h-auto py-2"} value={note} onChange={(e) => setNote(e.target.value)} data-testid="input-decline-note" /></Field>
              <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setDeciding(null)}>Cancel</Btn><Btn variant="danger" disabled={decide.isPending} onClick={() => decide.mutate({ id: deciding.r.id, data: { decision: "decline", note: note.trim() || undefined } })} data-testid="button-confirm-decline">{decide.isPending ? "Declining…" : "Decline request"}</Btn></div>
            </>
          ) : (
            <>
              <DialogHeader><DialogTitle className="text-[#002244]">Approve and register</DialogTitle><DialogDescription>Confirm the registry details. The requester is notified in-app once saved.</DialogDescription></DialogHeader>
              <Field label="Note to requester (optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} data-testid="input-approve-note" /></Field>
              <div className="mt-2" />
              <UtilityForm submitLabel="Approve & register" pending={decide.isPending} onCancel={() => setDeciding(null)}
                initial={{ name: deciding.r.utilityName, countryIso3: deciding.r.countryIso3, serviceArea: deciding.r.serviceArea, planYear: deciding.r.planYear, ttlUserId: deciding.r.requestedBy, currency: currency(deciding.r.countryIso3) }}
                onSubmit={(utility) => decide.mutate({ id: deciding.r.id, data: { decision: "approve", note: note.trim() || undefined, utility } })} />
            </>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
