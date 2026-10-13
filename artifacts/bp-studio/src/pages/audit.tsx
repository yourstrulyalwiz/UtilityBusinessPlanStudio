import { useState } from "react";
import { Link } from "wouter";
import { useListAudit } from "@workspace/api-client-react";
import { History, Search } from "lucide-react";
import { Card, PageHeader, Empty, ErrorState, SkeletonRows, inputCls, Pill } from "@/components/kit";
import { errMsg, fmtDateTime, humanize } from "@/lib/app";

export default function AuditPage() {
  const list = useListAudit();
  const [q, setQ] = useState("");
  const rows = (list.data ?? []).filter((a) => !q || `${a.actor} ${a.action} ${a.entity}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader eyebrow="Accountability" title="Audit history" description="Every registration, decision, team and access change, newest first." />
      <Card className="overflow-hidden">
        <div className="border-b p-4"><div className="relative max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className={inputCls + " pl-9"} placeholder="Filter by person, action or entity" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search-audit" /></div></div>
        {list.isLoading ? <SkeletonRows /> : list.isError ? <ErrorState message={errMsg(list.error)} onRetry={() => list.refetch()} /> : rows.length === 0 ? (
          <Empty icon={<History className="h-6 w-6" />} title={q ? "No matching entries" : "No history recorded yet"} body={q ? "Try a different filter." : "Actions taken in the Studio will be logged here automatically."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3 text-left font-medium">When</th><th className="px-4 py-3 text-left font-medium">Who</th><th className="px-4 py-3 text-left font-medium">Action</th><th className="px-4 py-3 text-left font-medium">Entity</th></tr></thead>
              <tbody className="divide-y">
                {rows.map((a) => (
                  <tr key={a.id} data-testid={`row-audit-${a.id}`}>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground tnum">{fmtDateTime(a.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-[#002244]">{a.actor}</td>
                    <td className="px-4 py-3 text-[#002244]">{humanize(a.action)}</td>
                    <td className="px-4 py-3">{a.entity === "utility" ? <Link href={`/utilities/${a.entityId}`} className="text-[#009FDA] hover:underline">Utility</Link> : <Pill>{humanize(a.entity)}</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
