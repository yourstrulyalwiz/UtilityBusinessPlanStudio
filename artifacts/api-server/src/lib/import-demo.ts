import { db, utilities, plans, planActivities, type StudioPerson } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import demo from "./demo-option-a.json";
import { createUtilityRecord, writeAudit } from "./studio";
import { activitySeed, progressOf } from "./playbook";

// Repeated calls open the existing example, never reset a user's edits.
export async function ensureDemo(p:StudioPerson,mode:"complete"|"midway"){
  return db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(81260341)`);
    const name=`${demo.utility.name} — ${mode}`;
    const [existing]=await tx.select({planId:plans.id}).from(utilities).innerJoin(plans,eq(plans.utilityId,utilities.id))
      .where(and(eq(utilities.name,name),eq(utilities.countryIso3,demo.utility.country_iso3)));
    if(existing)return existing;
    const utility=await createUtilityRecord(tx,p,{
      name,shortName:demo.utility.short_name,countryIso3:demo.utility.country_iso3,serviceArea:demo.utility.city_service_area,
      ttlUserId:p.id,planYear:demo.plan.plan_year,currency:demo.plan.currency,uofCompletionDate:demo.plan.uof_completion_date,
      wbProjectId:demo.utility.wb_project_id,
    });
    const [plan]=await tx.select().from(plans).where(eq(plans.utilityId,utility.id));
    const statuses=activitySeed.map(a=>({...a,status:mode==="complete"||a.phaseCode==="P1"?"approved":
      ["A2.1","A2.2","A2.3"].includes(a.code)?"submitted":a.code==="A2.4"?"in_progress":"not_started"}));
    for(const a of statuses){
      await tx.update(planActivities).set({
        status:a.status,data:demo.activities[a.code as keyof typeof demo.activities],approvedBy:a.status==="approved"?p.id:null,
        completedAt:a.status==="approved"?new Date():null,updatedAt:new Date(),
      }).where(and(eq(planActivities.planId,plan.id),eq(planActivities.activityCode,a.code)));
    }
    await tx.update(plans).set({status:mode==="complete"?"completed":"in_progress",progress:String(progressOf(statuses)),
      startDate:demo.plan.start_date,targetEndDate:demo.plan.target_end_date}).where(eq(plans.id,plan.id));
    await writeAudit(tx,p,"Imported supplied fictional demo","plan",plan.id,{mode,source:"demo_utility_valle_verde_optionA_1791921768661.json"},utility.id);
    return {planId:plan.id};
  });
}
