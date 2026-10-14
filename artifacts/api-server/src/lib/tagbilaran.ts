import { db, audit, plans, planActivities, type StudioPerson } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import supplied from "./tagbilaran-option-a.json";
import catalog from "./lgu-indicators.json";
import { createUtilityRecord, writeAudit } from "./studio";
import { activitySeed, progressOf } from "./playbook";
import { activityGuide } from "./activity-guide";

export const tagSource = "tagbilaran_tcws_optionA_1792017376057.json";
const importAction = "Imported Tagbilaran source plan";
export const tagExamples = supplied.activities as Record<string, Record<string, unknown>>;
const required: Record<string, string[]> = {
  "A1.1":["focal_point","team_members"], "A1.2":["annual","narratives"],
  "A1.3":["strengths","weaknesses"], "A1.4":["items"],
  "A1.7":["swot"], "A2.4":["meeting","decision"],
  "A3.2":["horizon","capex","financing","opex_php","required_revenue_php","required_tariff_php_m3"],
  "A3.3":["scenarios","affordability"], "A4.1":["agenda","kpi_monitoring"],
  "A4.2":["team","cadence"], "A4.3":["events"],
};
export function tagGuide(code:string) {
  return {...activityGuide[code], required:required[code]??activityGuide[code].required,
    instructions:`${activityGuide[code].instructions} This imported preliminary plan uses the supplied TCWS structure. Preserve source references and gap notes; missing information is not a verified result.`};
}
export const tagContext = {
  description:supplied._meta.description,
  sources:supplied._meta.sources,
  issues:supplied._meta.open_issues,
  preparation:supplied.preparation,
  plan:supplied.plan,
  utility:supplied.utility,
  catalog,
  catalogSource:"indicator_catalog_lgu_waterworks_1792017376057.json",
};
export async function isTagPlan(planId:string) {
  const rows=await db.select({id:audit.id}).from(audit).where(and(eq(audit.entityId,planId),eq(audit.action,importAction))).limit(1);
  return rows.length>0;
}
export function tagStatus(code:string) {
  const state=supplied.states.midway;
  return state.submitted.includes(code)?"submitted":state.in_progress.includes(code)?"in_progress":"not_started";
}
// One source import, identified by an immutable audit event. Never reset user edits.
export async function ensureTagbilaran(p:StudioPerson) {
  return db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(81260342)`);
    const [existing]=await tx.select({planId:audit.entityId}).from(audit).where(eq(audit.action,importAction)).limit(1);
    if(existing)return existing;
    const u=await createUtilityRecord(tx,p,{
      name:supplied.utility.name,shortName:supplied.utility.short_name,countryIso3:supplied.utility.country_iso3,
      serviceArea:supplied.utility.city_service_area,ttlUserId:p.id,planYear:supplied.plan.plan_year,
      currency:supplied.utility.currency,uofCompletionDate:null,wbProjectId:"",
    });
    const [plan]=await tx.select().from(plans).where(eq(plans.utilityId,u.id));
    for(const a of activitySeed)await tx.update(planActivities).set({
      data:tagExamples[a.code],status:tagStatus(a.code),updatedAt:new Date(),
    }).where(and(eq(planActivities.planId,plan.id),eq(planActivities.activityCode,a.code)));
    await tx.update(plans).set({status:"in_progress",progress:String(progressOf(activitySeed.map(a=>({...a,status:tagStatus(a.code)}))))}).where(eq(plans.id,plan.id));
    await writeAudit(tx,p,importAction,"plan",plan.id,{source:tagSource,catalogSource:tagContext.catalogSource},u.id);
    return {planId:plan.id};
  });
}
