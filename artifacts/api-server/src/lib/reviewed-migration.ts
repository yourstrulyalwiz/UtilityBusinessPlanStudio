import {db,modulePlans,planModules,plans} from "@workspace/db";
import {eq,sql} from "drizzle-orm";
import reviewed from "./tcws-reviewed.json";
import {sourceNames} from "./module-definitions";
export async function migrateReviewed(){
 await db.transaction(async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(81260348)`);
  const metas=await tx.select().from(modulePlans);
  for(const meta of metas){
   if(meta.kind!=="real"||meta.source!==sourceNames.real||meta.context.reviewedWorkbookImported==="validated-baseline")continue;
   const old=await tx.select().from(planModules).where(eq(planModules.planId,meta.planId));
   await tx.update(modulePlans).set({scenarios:reviewed.scenarios,context:{...meta.context,reviewedWorkbookImported:"validated-baseline",previousReviewedImport:meta.context.previousReviewedImport??{modules:old,scenarios:meta.scenarios}}}).where(eq(modulePlans.planId,meta.planId));
   for(const m of old)await tx.update(planModules).set({data:(reviewed as Record<string,unknown>)[`module${m.number}`] as Record<string,unknown>,status:"in_progress",updatedAt:new Date()}).where(eq(planModules.id,m.id));
   await tx.update(plans).set({progress:"0",status:"in_progress"}).where(eq(plans.id,meta.planId));
  }
 });
}
