import { db, modulePlans, plans, planModules, audit, type StudioPerson } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { createUtilityRecord, writeAudit } from "./studio";
import { demo, real, exampleFor, sourceNames, moduleDefinitions } from "./module-definitions";

export async function seedSuppliedModulePlans(p:StudioPerson) {
  for(const kind of ["fictional","real"] as const)await db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(81260344)`);
    const [existing]=await tx.select().from(modulePlans).where(eq(modulePlans.kind,kind)).limit(1);
    if(existing)return;
    const [deleted]=await tx.select({id:audit.id}).from(audit).where(and(eq(audit.action,"Deleted utility"),sql`${audit.diff}->'deletedSourceKinds' @> ${JSON.stringify([kind])}::jsonb`)).limit(1);
    if(deleted)return; // An intentionally deleted example must not reappear on restart.
    const supplied=kind==="real"?real:demo;
    const u=await createUtilityRecord(tx,p,{name:supplied.utility.name,shortName:supplied.utility.short_name,countryIso3:supplied.utility.country_iso3,
      serviceArea:supplied.utility.city_service_area,ttlUserId:p.id,planYear:supplied.plan.plan_year,currency:supplied.plan.currency});
    const [plan]=await tx.select().from(plans).where(eq(plans.utilityId,u.id));
    await tx.update(modulePlans).set({kind,source:sourceNames[kind],context:{meta:supplied._meta,plan:supplied.plan,utility:supplied.utility},scenarios:supplied.scenarios}).where(eq(modulePlans.planId,plan.id));
    for(const m of moduleDefinitions)await tx.update(planModules).set({data:exampleFor(kind,m.number),
      status:kind==="real"?(real.load_state.module_status as Record<string,string>)[String(m.number)]:"in_progress",
    }).where(and(eq(planModules.planId,plan.id),eq(planModules.number,m.number)));
    await tx.update(plans).set({status:"in_progress"}).where(eq(plans.id,plan.id));
    await writeAudit(tx,p,"Imported supplied eight-module plan","plan",plan.id,{source:sourceNames[kind]},u.id);
  });
}
