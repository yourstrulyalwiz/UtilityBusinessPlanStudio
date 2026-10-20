import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateUtility, useLoadDemoPlan, getListUtilitiesQueryKey, getGetSummaryQueryKey } from "@workspace/api-client-react";
import { BookOpen, ChevronRight, PlayCircle, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, PageHeader, Btn } from "@/components/kit";
import { UtilityForm } from "@/components/utility-form";
import { useMe, errMsg } from "@/lib/app";
import { useToast } from "@/hooks/use-toast";
import { useTestMode } from "@/lib/test-mode";

export default function ManagerRole() {
  const me = useMe();
  const admin = me.role === "admin";
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const openAccess = !!useTestMode().data?.openAccess;
  const refresh = () => { qc.invalidateQueries({ queryKey: getListUtilitiesQueryKey() }); qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() }); };
  const create = useCreateUtility({ mutation: {
    onSuccess: (u) => { refresh(); setCreating(false); toast({ title: "Utility registered", description: u.name }); },
    onError: (e) => toast({ title: "Could not register utility", description: errMsg(e), variant: "destructive" }),
  } });
  const demo = useLoadDemoPlan({ mutation: {
    onSuccess: (r) => { refresh(); navigate(`/plans/${r.planId}`); },
    onError: (e) => toast({ title: "Could not open example plan", description: errMsg(e), variant: "destructive" }),
  } });
  const link = "inline-flex items-center gap-1 text-xs font-medium text-[#127A80] hover:underline";

  const steps = admin ? [
    { t: "Manage people", d: "Invite TTLs, editors and viewers and set their roles.", el: <Link href="/users" className={link} data-testid="link-onboard-people">Open People & roles <ChevronRight className="h-3.5 w-3.5" /></Link> },
    { t: "Create a utility", d: "Registers the utility and a plan with eight blank modules.", el: <button type="button" onClick={() => setCreating(true)} className={link} data-testid="button-onboard-create">Register utility <ChevronRight className="h-3.5 w-3.5" /></button> },
    { t: "Follow progress", d: "The portfolio registry shows every plan, newest activity first.", el: <Link href="/admin" className={link} data-testid="button-onboard-progress">Go to portfolio <ChevronRight className="h-3.5 w-3.5" /></Link> },
    { t: "Review utility requests", d: "Approve or decline TTL requests to register utilities.", el: <Link href="/requests" className={link} data-testid="link-onboard-requests">Utility requests <ChevronRight className="h-3.5 w-3.5" /></Link> },
  ] : [
    { t: "Open a plan", d: "Choose any of its eight modules. There is no fixed order.", el: <Link href="/" className={link}>Go to utilities <ChevronRight className="h-3.5 w-3.5" /></Link> },
    ...(me.role === "viewer" ? [{ t: "Read and comment", d: "Read each module and its guidance; ask your TTL for changes.", el: null }] : [
      { t: "Save and submit", d: "Save draft stores your edits; Submit sends the module for review.", el: null },
      { t: "Respond to returns", d: "Returned modules show the reviewer's comment. Revise and submit again.", el: null },
      { t: "Use your own data", d: "Examples are illustrative. Replace them with your utility's data.", el: null },
    ]),
  ];

  return (
    <div>
      <PageHeader eyebrow="Manager role" title={admin ? "Running the Studio" : "How to work on a plan"}
        description={admin ? "The global team sets up the Studio: people, utilities and teams. TTLs then populate each plan across eight modules, in any order, and you review what they submit." : "Each business plan has eight independent modules. Work through them in whatever order your data allows."} />
      <Card className="rise overflow-hidden" data-testid={admin ? "card-admin-onboarding" : "card-getting-started"}>
        <ol className="divide-y divide-[#323D4F]/[.07]">
          {steps.map((x, i) => (
            <li key={x.t} className="flex gap-4 p-5 transition-colors hover:bg-[#E4F8F9]/50">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4F8F9] text-sm font-semibold text-[#127A80] tnum">{i + 1}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#323D4F]">{x.t}</div>
                <p className="mt-0.5 text-sm text-muted-foreground">{x.d}</p>
                {x.el && <div className="mt-2">{x.el}</div>}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {admin && openAccess && (
        <Card className="rise mt-6 p-5" data-testid="card-examples">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#127A80]">Illustrative examples</div>
          <p className="mt-1 text-sm text-muted-foreground">Explore the fictional Valle Verde plan or the supplied preliminary Tagbilaran case. Supplied data is not independently verified.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn variant="outline" disabled={demo.isPending} onClick={() => demo.mutate({ data: { mode: "complete" } })} data-testid="button-demo-complete"><BookOpen className="h-4 w-4" /> Open Valle Verde example</Btn>
            <Btn variant="outline" disabled={demo.isPending} onClick={() => demo.mutate({ data: { mode: "midway" } })} data-testid="button-demo-midway"><PlayCircle className="h-4 w-4" /> Open second example</Btn>
            <Btn onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New utility</Btn>
          </div>
        </Card>
      )}

      <Link href="/help" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-[#127A80] hover:underline" data-testid={admin ? "link-admin-help" : "link-ttl-help"}>Read the full guide in the Help center <ChevronRight className="h-4 w-4" /></Link>

      {admin && (
        <Sheet open={creating} onOpenChange={setCreating}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
            <SheetHeader className="mb-6"><SheetTitle className="text-[#323D4F]">Create utility</SheetTitle><SheetDescription>Creates the utility and its business plan with eight blank modules.</SheetDescription></SheetHeader>
            {creating && <UtilityForm submitLabel="Register utility" pending={create.isPending} onCancel={() => setCreating(false)} onSubmit={(data) => create.mutate({ data })} />}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
