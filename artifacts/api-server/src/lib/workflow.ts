import { db, plans, planActivities, comments, type StudioPerson } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { accessibleUtility, HttpError } from "./studio";
import { activitySeed, progressOf } from "./playbook";
import { activityGuide } from "./activity-guide";
import demo from "./demo-option-a.json";
import { isTagPlan, tagExamples, tagGuide, tagSource, tagContext } from "./tagbilaran";

export const examples=demo.activities as Record<string,Record<string,unknown>>;
export const exampleSource="Source: demo_utility_valle_verde_optionA_1791921768661.json";
export const passed=(status:string)=>status==="submitted"||status==="approved";
export function blockedReason(code:string,rows:{activityCode:string;status:string}[]){
  const index=activitySeed.findIndex(a=>a.code===code);
  if(index<=0)return "";
  const previous=activitySeed[index-1];
  const before=rows.find(r=>r.activityCode===previous.code);
  if(!before||!passed(before.status))return `Submit ${previous.code} ${previous.name} to unlock this step.`;
  const earlierPhases=activitySeed.slice(0,index).filter(a=>a.phaseCode!==activitySeed[index].phaseCode);
  const blocked=earlierPhases.find(a=>!passed(rows.find(r=>r.activityCode===a.code)?.status??""));
  return blocked?`Submit ${blocked.code} to complete the earlier phase before editing this step.`:"";
}
export async function workflow(p:StudioPerson,planId:string){
  const [plan]=await db.select().from(plans).where(eq(plans.id,planId));
  if(!plan)throw new HttpError(404,"Plan not found.");
  const utility=await accessibleUtility(p,plan.utilityId);
  const imported=await isTagPlan(planId);
  const rows=await db.select().from(planActivities).where(eq(planActivities.planId,plan.id));
  const notes=await db.select().from(comments).where(eq(comments.planId,plan.id)).orderBy(desc(comments.createdAt));
  const list=activitySeed.map(def=>{
    const row=rows.find(r=>r.activityCode===def.code);
    if(!row)throw new HttpError(409,"This plan is missing an activity. Contact an administrator.");
    const reason=blockedReason(def.code,rows);
    return {...def,status:row.status,data:row.data as Record<string,unknown>,example:imported?tagExamples[def.code]:examples[def.code],
      ...(imported?tagGuide(def.code):activityGuide[def.code]),feedback:notes.find(n=>n.activityCode===def.code)?.body??"",locked:!!reason,lockReason:reason,updatedAt:row.updatedAt.toISOString()};
  });
  return {planId,utilityName:utility.name,progress:progressOf(list),status:plan.status,source:imported?`Source: ${tagSource}`:exampleSource,
    ...(imported?{importContext:tagContext}:{}),
    activities:list,nextCode:list.find(a=>!passed(a.status))?.code??list.find(a=>a.status!=="approved")?.code??"",
    canEdit:["admin","ttl","editor"].includes(p.role),canReview:["admin","ttl"].includes(p.role)};
}
