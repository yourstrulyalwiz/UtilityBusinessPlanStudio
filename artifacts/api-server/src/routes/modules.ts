import { Router, type IRouter } from "express";
import { db, plans, planModules, modulePlans, legacyPlanCopies, guidanceTopics } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod/v4";
import * as api from "@workspace/api-zod";
import { actor, accessibleUtility, uuid, HttpError, writeAudit } from "../lib/studio";
import { moduleWorkflow } from "../lib/module-workflow";
import { moduleProgress, moduleReady, coreFields, sourceNames } from "../lib/module-definitions";
import {baselineSchema} from "../lib/baseline-validation";
import {evaluateBaseline,isBaseline,workbook} from "@workspace/baseline";

const router:IRouter=Router();
const actionSchema=z.object({
  action:z.enum(["save","submit","approve","return","reopen"]),updatedAt:z.iso.datetime(),
  data:z.record(z.string(),z.unknown()).optional(),scenarios:z.array(z.unknown()).max(50).optional(),
  comment:z.string().max(10000).optional(),
});
function safeContent(data:unknown){
  if(JSON.stringify(data).length>1000000)throw new HttpError(400,"This module is too large; keep its content below 1 MB.");
}
router.get("/plans/:id/modules",async(req,res)=>{
  res.json(api.GetModulePlanResponse.parse(await moduleWorkflow(await actor(req),uuid(req.params.id))));
});
router.post("/plans/:id/modules/:number",async(req,res)=>{
  const p=await actor(req,["admin","ttl","editor"]),id=uuid(req.params.id),number=z.coerce.number().int().min(1).max(8).parse(req.params.number);
  const input=actionSchema.parse(api.UpdateModuleBody.parse(req.body));
  if(["approve","return","reopen"].includes(input.action)&&!["admin","ttl"].includes(p.role))throw new HttpError(403,"Only administrators and responsible TTLs can review modules.");
  if(input.scenarios!==undefined&&number!==1)throw new HttpError(400,"Edit scenario definitions in Module 1.");
  await db.transaction(async tx=>{
    const [plan]=await tx.select().from(plans).where(eq(plans.id,id)).for("update");
    if(!plan)throw new HttpError(404,"Plan not found.");
    const u=await accessibleUtility(p,plan.utilityId);
    if(u.status==="archived")throw new HttpError(409,"Restore this utility before editing its plan.");
    const rows=await tx.select().from(planModules).where(eq(planModules.planId,id));
    const row=rows.find(m=>m.number===number);
    if(!row)throw new HttpError(404,"Module not found.");
    if(row.updatedAt.toISOString()!==input.updatedAt)throw new HttpError(409,"This module changed in another session. Your draft was not saved. Reload the latest version before retrying.");
    let status=row.status,data=row.data;
    if(input.action==="save"||input.action==="submit"){
      if(["ready_for_review","approved"].includes(status))throw new HttpError(409,"Return or reopen this module before editing.");
      data=input.data??data;safeContent(data);if(input.scenarios)safeContent(input.scenarios);
      if(number===1){
        data=baselineSchema.parse(data);
        const result=evaluateBaseline(baselineSchema.parse(data));
        if(input.action==="submit"&&!result.valid)throw new HttpError(400,result.issues.filter(i=>i.severity==="error").map(i=>i.message).join(" "));
        if(input.action==="submit"&&!moduleReady(1,data))throw new HttpError(400,"Enter at least one baseline variable before submitting.");
      }
      if(input.action==="submit"&&!moduleReady(number,data))throw new HttpError(400,`Add the core module information before submitting: ${coreFields[number].join(", ").replaceAll("_"," ")}. Missing-value notes and citations do not count as content.`);
      status=input.action==="submit"?"ready_for_review":"in_progress";
      if(number===1&&input.scenarios!==undefined)await tx.update(modulePlans).set({scenarios:input.scenarios}).where(eq(modulePlans.planId,id));
    }else if(input.action==="approve"){
      if(number===1&&(!isBaseline(data)||!evaluateBaseline(data).valid))throw new HttpError(400,"Correct baseline inconsistencies before approval.");
      if(status!=="ready_for_review")throw new HttpError(409,"Submit the module for review first.");
      status="approved";
    }else if(input.action==="return"){
      if(status!=="ready_for_review")throw new HttpError(409,"Only modules ready for review can be returned.");
      if(!input.comment?.trim())throw new HttpError(400,"Explain the changes required.");
      status="in_progress";
    }else{
      if(status!=="approved")throw new HttpError(409,"Only approved modules can be reopened.");
      status="in_progress";
    }
    const now=new Date();
    await tx.update(planModules).set({data,status,updatedAt:now,feedback:input.comment?.trim()??row.feedback}).where(eq(planModules.id,row.id));
    const updated=rows.map(m=>({status:m.number===number?status:m.status}));
    await tx.update(plans).set({progress:String(moduleProgress(updated)),status:updated.every(m=>m.status==="approved")?"completed":"in_progress",updatedAt:now}).where(eq(plans.id,id));
    await writeAudit(tx,p,`${input.action} Module ${number}`,"module",row.id,{from:row.status,to:status,comment:input.comment??null},u.id);
  });
  res.json(api.UpdateModuleResponse.parse(await moduleWorkflow(p,id)));
});
router.get("/plans/:id/legacy-copy",async(req,res)=>{
  const p=await actor(req),id=uuid(req.params.id);
  await moduleWorkflow(p,id);
  const [copy]=await db.select().from(legacyPlanCopies).where(eq(legacyPlanCopies.planId,id));
  if(!copy)throw new HttpError(404,"This new plan has no pre-conversion copy.");
  res.setHeader("Content-Disposition",`attachment; filename="legacy-plan-${id}.json"`);
  res.json({savedAt:copy.createdAt.toISOString(),...copy.snapshot});
});
router.get("/plans/:id/module-export",async(req,res)=>{
  const p=await actor(req),id=uuid(req.params.id),wf=await moduleWorkflow(p,id);
  res.setHeader("Content-Disposition",`attachment; filename="business-plan-${id}.json"`);
  res.json({format:"Independent eight-module business plan",exportedAt:new Date().toISOString(),
    source:wf.source,context:wf.context,scenarios:wf.scenarios,modules:wf.modules.map(({example,...m})=>m),
    baselineResults:isBaseline(wf.modules[0]?.data)?{source:workbook.source,...evaluateBaseline(wf.modules[0].data)}:null,
    catalog:wf.catalog,catalogSource:wf.catalogSource,reviewProgress:wf.progress,
    calculationNotice:"Figures are entered or supplied scenario results. Editing inputs does not recalculate a financial model."});
});
router.get("/guidance-library",async(req,res)=>{
  const p=await actor(req),rows=await db.select().from(guidanceTopics).orderBy(asc(guidanceTopics.module));
  res.json(api.GetGuidanceLibraryResponse.parse({source:`Source: ${sourceNames.guidance}`,canManage:p.role==="admin",topics:rows.map(t=>({...t,updatedAt:t.updatedAt.toISOString()}))}));
});
router.put("/guidance-library/:id",async(req,res)=>{
  const p=await actor(req,["admin"]);
  const id=z.string().max(100).parse(req.params.id),body=api.UpdateGuidanceTopicBody.parse(req.body);
  z.iso.datetime().parse(body.updatedAt);safeContent(body.data);
  z.object({title:z.string().trim().min(1),definition:z.string().trim().min(1),
    why_it_matters:z.array(z.string()),guiding_questions:z.array(z.string()),
    example:z.record(z.string(),z.unknown()),tips:z.object({do:z.array(z.string()),avoid:z.array(z.string())})}).parse(body.data);
  const topic=await db.transaction(async tx=>{
    const [before]=await tx.select().from(guidanceTopics).where(eq(guidanceTopics.id,id)).for("update");
    if(!before)throw new HttpError(404,"Guidance topic not found.");
    if(before.updatedAt.toISOString()!==body.updatedAt)throw new HttpError(409,"This guidance was edited elsewhere. Reload before saving.");
    const [after]=await tx.update(guidanceTopics).set({data:{...body.data,id:before.id,module:before.module},updatedAt:new Date()}).where(eq(guidanceTopics.id,id)).returning();
    await writeAudit(tx,p,"Updated module guidance","guidance",id,{title:after.data.title});
    return after;
  });
  res.json(api.UpdateGuidanceTopicResponse.parse({...topic,updatedAt:topic.updatedAt.toISOString()}));
});
export default router;
