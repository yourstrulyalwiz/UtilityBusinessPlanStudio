import { db, plans, modulePlans, planModules, legacyPlanCopies, guidanceTopics, type StudioPerson } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { accessibleUtility, HttpError } from "./studio";
import { moduleDefinitions, exampleFor, moduleProgress, catalog, sourceNames } from "./module-definitions";
import {isBaseline,englishSourceText} from "@workspace/baseline";

function translatedData(data:Record<string,unknown>) {
  if(!isBaseline(data))return data;
  return {...data,variableNotes:Object.fromEntries(Object.entries(data.variableNotes??{}).map(([k,v])=>[k,englishSourceText(v)])),
    indicatorNotes:Object.fromEntries(Object.entries(data.indicatorNotes??{}).map(([k,v])=>[k,englishSourceText(v)]))};
}

export async function moduleWorkflow(p:StudioPerson,planId:string) {
  const [plan]=await db.select().from(plans).where(eq(plans.id,planId));
  if(!plan)throw new HttpError(404,"Plan not found.");
  const utility=await accessibleUtility(p,plan.utilityId);
  const [record]=await db.select().from(modulePlans).where(eq(modulePlans.planId,planId));
  if(!record)throw new HttpError(409,"The module conversion has not completed. Contact an administrator.");
  const rows=await db.select().from(planModules).where(eq(planModules.planId,planId)).orderBy(asc(planModules.number));
  if(rows.length!==8)throw new HttpError(409,"This plan must have eight modules.");
  const [copy]=await db.select({id:legacyPlanCopies.planId}).from(legacyPlanCopies).where(eq(legacyPlanCopies.planId,planId));
  const topics=await db.select().from(guidanceTopics).orderBy(asc(guidanceTopics.module));
  return {
    planId,utilityName:utility.name,source:`Source: ${record.source}`,exampleSource:`Source: ${record.kind==="real"?sourceNames.real:sourceNames.fictional}`,
    kind:record.kind,context:record.context,scenarios:record.scenarios,
    modules:rows.map(row=>({...moduleDefinitions[row.number-1],status:row.status,data:translatedData(row.data),example:exampleFor(record.kind,row.number),feedback:row.feedback,updatedAt:row.updatedAt.toISOString()})),
    progress:moduleProgress(rows),canEdit:utility.status!=="archived"&&["admin","ttl","editor"].includes(p.role),
    canReview:utility.status!=="archived"&&["admin","ttl"].includes(p.role),
    hasLegacyCopy:!!copy,guidance:topics.map(t=>({...t,updatedAt:t.updatedAt.toISOString()})),
    catalog,catalogSource:`Source: ${sourceNames.catalog}`,
    nextModule:rows.find(r=>!["approved","ready_for_review"].includes(r.status))?.number??rows.find(r=>r.status!=="approved")?.number??8,
  };
}
