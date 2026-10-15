import {db,planModules,modulePlans,plans} from "@workspace/db";
import {eq,and,sql} from "drizzle-orm";
import {assessmentSource} from "./assessment";
import {moduleProgress,sourceNames} from "./module-definitions";
export async function migrateAssessment(){
  await db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(81260347)`);
    const rows=await tx.select({module:planModules,meta:modulePlans}).from(planModules)
      .innerJoin(modulePlans,eq(modulePlans.planId,planModules.planId))
      .where(and(eq(planModules.number,3),eq(modulePlans.kind,"real")));
    for(const {module:m,meta} of rows){
      if(meta.source!==sourceNames.real||meta.context.assessmentWorkbookImported===true)continue;
      await tx.update(modulePlans).set({context:{...meta.context,assessmentWorkbookImported:true,
        previousModule3:{data:m.data,status:m.status,savedAt:new Date().toISOString()}}}).where(eq(modulePlans.planId,m.planId));
      await tx.update(planModules).set({data:assessmentSource,status:"in_progress",updatedAt:new Date()}).where(eq(planModules.id,m.id));
      const states=await tx.select({status:planModules.status}).from(planModules).where(eq(planModules.planId,m.planId));
      await tx.update(plans).set({progress:String(moduleProgress(states)),status:"in_progress"}).where(eq(plans.id,m.planId));
    }
  });
}
