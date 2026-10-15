import {db,plans,planModules,modulePlans,audit} from "@workspace/db";
import {and,eq,sql} from "drizzle-orm";
import {createBaseline,isBaseline} from "@workspace/baseline";
import {moduleProgress} from "./module-definitions";

/** Replace only M1 once, retaining the complete old payload for recovery/export. */
export async function migrateBaseline() {
  await db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(81260345)`);
    const rows=await tx.select({m:planModules,meta:modulePlans}).from(planModules)
      .innerJoin(modulePlans,eq(modulePlans.planId,planModules.planId)).where(eq(planModules.number,1));
    for(const {m,meta} of rows){
      if(isBaseline(m.data))continue;
      const data=createBaseline(meta.kind==="real");
      await tx.update(modulePlans).set({context:{...meta.context,baselineMigration:{previousModule1:m.data,previousStatus:m.status,savedAt:new Date().toISOString()}}}).where(eq(modulePlans.planId,m.planId));
      await tx.update(planModules).set({data:{...data},status:meta.kind==="real"?"in_progress":"not_started",updatedAt:new Date()}).where(eq(planModules.id,m.id));
      const states=await tx.select({status:planModules.status}).from(planModules).where(eq(planModules.planId,m.planId));
      await tx.update(plans).set({progress:String(moduleProgress(states)),status:"in_progress"}).where(eq(plans.id,m.planId));
    }
  });
}
