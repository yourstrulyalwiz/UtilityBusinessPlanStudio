import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useDeleteUtility, getListUtilitiesQueryKey, getGetSummaryQueryKey, getGetPlanQueryKey, getGetModulePlanQueryKey, getListAuditQueryKey } from "@workspace/api-client-react";
import { FileX2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Btn, Field, inputCls } from "@/components/kit";
import { useToast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/app";
import { apiHref } from "@/lib/modules";

type Target = { kind: "utility" | "plan"; utilityId: string; planId: string; name: string };

/** Admin-only delete actions for the portfolio: utility (all plans) or a single business plan. Exact-name confirmation. */
export function DeleteActions({ utilityId, planId, name }: { utilityId: string; planId: string; name: string }) {
  const [target, setTarget] = useState<Target | null>(null);
  return (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      {planId && <button className="rounded-md p-1.5 text-[#6B7687] hover:bg-[#FFF1E8] hover:text-[#9A3A05]" title="Delete business plan" aria-label={`Delete business plan for ${name}`} onClick={() => setTarget({ kind: "plan", utilityId, planId, name })} data-testid={`button-delete-plan-${utilityId}`}><FileX2 className="h-4 w-4" /></button>}
      <button className="rounded-md p-1.5 text-[#6B7687] hover:bg-[#FFF1E8] hover:text-[#9A3A05]" title="Delete utility and all plans" aria-label={`Delete utility ${name}`} onClick={() => setTarget({ kind: "utility", utilityId, planId, name })} data-testid={`button-delete-utility-${utilityId}`}><Trash2 className="h-4 w-4" /></button>
      {target && <DeleteDialog target={target} onClose={() => setTarget(null)} />}
    </div>
  );
}

function DeleteDialog({ target, onClose }: { target: Target; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();
  const done = (title: string) => {
    qc.removeQueries({ queryKey: getGetPlanQueryKey(target.planId) });
    qc.removeQueries({ queryKey: getGetModulePlanQueryKey(target.planId) });
    qc.invalidateQueries({ queryKey: getListUtilitiesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getListAuditQueryKey() });
    toast({ title }); onClose();
  };
  const delUtility = useDeleteUtility({ mutation: { onSuccess: () => done("Utility deleted"), onError: (e) => toast({ title: "Could not delete utility", description: errMsg(e), variant: "destructive" }) } });
  const delPlan = useMutation({
    mutationFn: async () => {
      const r = await fetch(apiHref(`/api/plans/${target.planId}`), { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmName: typed }) });
      if (!r.ok) { const j = await r.json().catch(() => null); throw new Error((j && (j.error || j.message)) || `Request failed (${r.status})`); }
    },
    onSuccess: () => done("Business plan deleted"),
    onError: (e) => toast({ title: "Could not delete business plan", description: errMsg(e), variant: "destructive" }),
  });
  const pending = delUtility.isPending || delPlan.isPending;
  const match = typed === target.name;
  const submit = () => { if (!match || pending) return; if (target.kind === "utility") delUtility.mutate({ id: target.utilityId, data: { confirmationName: typed } }); else delPlan.mutate(); };
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !pending) onClose(); }}>
      <DialogContent className="max-w-md rounded-xl" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-[#323D4F]">{target.kind === "utility" ? `Delete ${target.name} and all its plans?` : `Delete the business plan for ${target.name}?`}</DialogTitle>
          <DialogDescription>{target.kind === "utility"
            ? "This cannot be undone in the app. All annual plans, modules, comments, team assignments and backups are deleted. User accounts and audit history remain."
            : "This cannot be undone in the app. The plan, its eight modules and backups are deleted. The utility record and its team are kept."}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Field label={`Type the exact utility name: ${target.name}`} required><input className={inputCls} autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={pending} data-testid="input-delete-confirm-name" /></Field>
          <div className="flex justify-end gap-2">
            <Btn type="button" variant="ghost" disabled={pending} onClick={onClose}>Cancel</Btn>
            <Btn type="submit" variant="danger" disabled={!match || pending} data-testid="button-confirm-delete">{pending ? "Deleting…" : "Permanently delete"}</Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
