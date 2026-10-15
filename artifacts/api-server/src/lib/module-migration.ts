import { db, plans, utilities, planActivities, comments, members, audit, activities, modulePlans, planModules, legacyPlanCopies, guidanceTopics } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import type { Tx } from "./studio";
import {createBaseline} from "@workspace/baseline";
import { demo, real, guidance, sourceNames, exampleFor, blankValue, moduleDefinitions } from "./module-definitions";

export async function createBlankModulePlan(tx:Tx,planId:string) {
  await tx.insert(modulePlans).values({planId,kind:"user",source:"User-entered plan",context:{migrationNote:"Independent eight-module business planning. Examples are fictional and are never filled automatically."}});
  await tx.insert(planModules).values(moduleDefinitions.map(m=>({planId,number:m.number,data:m.number===1?{...createBaseline()}:blankValue(exampleFor("user",m.number)) as Record<string,unknown>})));
}

/** Atomic, additive conversion. Capture every old record before changing active status/progress. */
export async function migrateModulePlans() {
  await db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(81260343)`);
    for(const topic of guidance.topics)
      await tx.insert(guidanceTopics).values({id:topic.id,module:topic.module,data:topic}).onConflictDoNothing();
    const rows=await tx.select({plan:plans,utility:utilities}).from(plans).innerJoin(utilities,eq(plans.utilityId,utilities.id));
    for(const {plan,utility} of rows){
      const [exists]=await tx.select().from(modulePlans).where(eq(modulePlans.planId,plan.id));
      if(exists)continue;
      const oldActivities=await tx.select().from(planActivities).where(eq(planActivities.planId,plan.id));
      const oldComments=await tx.select().from(comments).where(eq(comments.planId,plan.id));
      const team=await tx.select().from(members).where(eq(members.utilityId,utility.id));
      const events=await tx.select().from(audit).where(eq(audit.utilityId,utility.id));
      const defs=await tx.select().from(activities);
      await tx.insert(legacyPlanCopies).values({planId:plan.id,snapshot:{
        utility,plan,activities:oldActivities,comments:oldComments,members:team,audit:events,activityDefinitions:defs,
        description:"Immutable complete pre-conversion copy. Original Option A tables are also retained.",
      }}).onConflictDoNothing();
      const kind=events.some(e=>e.action==="Imported Tagbilaran source plan")?"real":
        events.some(e=>e.action==="Imported supplied fictional demo")?"fictional":"user";
      const supplied=kind==="real"?real:demo;
      await tx.insert(modulePlans).values({
        planId:plan.id,kind,source:kind==="user"?"User-entered plan migrated from the archived copy":sourceNames[kind],
        scenarios:kind==="user"?[]:supplied.scenarios,
        context:{...(kind==="user"?{}:{meta:supplied._meta,plan:supplied.plan,utility:supplied.utility}),
          migrationNote:kind==="user"?"Existing activity content was mapped to the related modules for review. An immutable copy preserves every original field and review event. No previous approval carries forward.":
          "The newly supplied Option B dataset initializes this plan. Previous Option A data and any edits remain in the immutable legacy copy; approvals do not carry forward."},
      });
      const byCode=Object.fromEntries(oldActivities.map(a=>[a.activityCode,a.data as Record<string,unknown>]));
      // Carry non-empty authored content forward without inventing absent content or approvals.
      const groups:Record<number,string[]>={1:["A1.1"],2:["A2.1","A2.4"],3:["A1.2","A1.3","A1.4","A1.5","A1.6","A1.7"],4:["A2.3","A2.5","A2.6","A3.1"],5:["A3.2"],6:["A3.3"],7:["A2.2","A4.1","A4.2"],8:["A3.4","A4.3"]};
      for(const m of moduleDefinitions){
        let data:Record<string,unknown>;
        let status="not_started";
        if(kind!=="user"){
          data=exampleFor(kind,m.number);
          status=kind==="real"?(real.load_state.module_status as Record<string,string>)[String(m.number)]:"in_progress";
        }else{
          data=blankValue(exampleFor("user",m.number)) as Record<string,unknown>;
          const populated=groups[m.number].filter(c=>Object.keys(byCode[c]??{}).length);
          if(populated.length){
            const imported=Object.fromEntries(populated.map(c=>[c,byCode[c]]));
            // Preserve all authored fields in a separate review section, including structures without an exact equivalent.
            data.imported_previous_content=imported;
            if(m.number===1){data.profile={name:utility.name,service_area:utility.serviceArea};data.project_team=byCode["A1.1"]?.team_members??[];}
            if(m.number===2)for(const key of ["mission","vision","objectives","values"])if(byCode["A2.1"]?.[key]!==undefined)data[key]=byCode["A2.1"][key];
            if(m.number===3){data.baseline_indicators=byCode["A1.2"]?.indicators??[];data.swot=byCode["A1.7"]?.swot??data.swot;}
            if(m.number===4)data.charters=byCode["A3.1"]?.charters??[];
            if(m.number===7)data.kpis=byCode["A2.2"]?.kpis??[];
            if(m.number===8)data.executive_summary=byCode["A3.4"]?.executive_summary??"";
            status="needs_data";
          }
        }
        await tx.insert(planModules).values({planId:plan.id,number:m.number,data,status});
      }
      await tx.update(plans).set({status:kind==="user"&&oldActivities.every(a=>a.status==="not_started")?"not_started":"in_progress",progress:"0",updatedAt:new Date()}).where(eq(plans.id,plan.id));
      await tx.insert(audit).values({userId:utility.createdBy,entity:"plan",entityId:plan.id,utilityId:utility.id,action:"Converted to independent eight-module planning",diff:{source:kind==="user"?"Legacy copy":sourceNames[kind],legacyCopyPreserved:true}});
    }
  });
}
