import { Card } from "@/components/kit";
import { FieldEditor, type Json } from "./field-editor";

/** Read-only provenance is separate from the user's editable activity data. */
export function ImportContext({context,source}:{context:Record<string,unknown>;source:string}) {
  const issues=Array.isArray(context.issues)?context.issues as string[]:[];
  return <Card className="mb-5 min-w-0 p-5 text-sm">
    <h2 className="font-semibold text-[#323D4F]">Imported TCWS preliminary plan</h2>
    <p className="mt-1 text-muted-foreground">Real utility data supplied by the user, not the fictional Valle Verde example. Null values mean information is missing. Source figures and indicative tariffs have not been independently verified or recalculated.</p>
    <p className="mt-2 break-words text-xs">{source}</p>
    <details className="mt-3 rounded border border-amber-200 bg-amber-50 p-3">
      <summary className="cursor-pointer font-medium text-amber-900">Data gaps and cautions ({issues.length})</summary>
      <ul className="mt-2 list-disc space-y-2 pl-5">{issues.map(x=><li key={x}>{x}</li>)}</ul>
    </details>
    <details className="mt-3 rounded border p-3">
      <summary className="cursor-pointer font-medium">LGU waterworks indicator catalog — 19 indicators / 12 KPIs</summary>
      <p className="my-3 break-words text-xs">Source: {String(context.catalogSource)}. Draft JMC alignment as supplied, not independently verified. Optional indicators are disabled by default; formulas are definitions, not an automatic calculation engine.</p>
      <FieldEditor value={context.catalog as Json} example={context.catalog} path="catalog" readOnly />
    </details>
    <details className="mt-3 rounded border p-3">
      <summary className="cursor-pointer font-medium">Source documents, planning horizon and preparation</summary>
      <p className="my-3 text-xs">The seven original documents are referenced by the uploaded JSON; they were not separately supplied for verification.</p>
      <FieldEditor value={{sources:context.sources,utility:context.utility,plan:context.plan,preparation:context.preparation} as Json}
        example={{sources:context.sources,utility:context.utility,plan:context.plan,preparation:context.preparation}} path="provenance" readOnly />
    </details>
  </Card>;
}
