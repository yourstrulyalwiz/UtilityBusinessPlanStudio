import {db,planModules,modulePlans,plans} from "@workspace/db";
import {eq,and,sql} from "drizzle-orm";
import {strategySource} from "./strategy";
import {moduleProgress,sourceNames} from "./module-definitions";
export async function migrateStrategy(){
  await db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(81260346)`);
    const rows=await tx.select({module:planModules,meta:modulePlans}).from(planModules)
      .innerJoin(modulePlans,eq(modulePlans.planId,planModules.planId))
      .where(and(eq(planModules.number,2),eq(modulePlans.kind,"real")));
    for(const {module:m,meta} of rows){
      if(meta.source!==sourceNames.real)continue;
      if(meta.context.strategyWorkbookImported===true)continue;
      // The real supplied case is TCWS. Preserve prior authoring before the explicit replacement.
      await tx.update(modulePlans).set({context:{...meta.context,strategyWorkbookImported:true,
        previousModule2:{data:m.data,status:m.status,savedAt:new Date().toISOString()}}}).where(eq(modulePlans.planId,m.planId));
      await tx.update(planModules).set({data:strategySource,status:"in_progress",updatedAt:new Date()}).where(eq(planModules.id,m.id));
      const states=await tx.select({status:planModules.status}).from(planModules).where(eq(planModules.planId,m.planId));
      await tx.update(plans).set({progress:String(moduleProgress(states)),status:"in_progress"}).where(eq(plans.id,m.planId));
    }
  });
}
