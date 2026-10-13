import { Router, type IRouter } from "express";
import { db, plans, planActivities, comments } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { actor, accessibleUtility, uuid, HttpError, writeAudit } from "../lib/studio";
import { workflow, blockedReason, examples } from "../lib/workflow";
import { activitySeed, progressOf } from "../lib/playbook";
import { activityGuide, hasContent, schemaForExample } from "../lib/activity-guide";
import { ensureDemo } from "../lib/import-demo";
import { openAccessEnabled } from "../lib/open-access";

const router:IRouter=Router();
const actionBody=z.object({
  action:z.enum(["save","submit","approve","return","reopen"]),
  updatedAt:z.string().datetime(),data:z.record(z.string(),z.unknown()).optional(),comment:z.string().max(10000).optional(),
});
router.get("/plans/:id/workflow",async(req,res)=>{
  res.json(await workflow(await actor(req),uuid(req.params.id)));
});
router.post("/demo-plan",async(req,res)=>{
  const p=await actor(req,["admin"]);
  // Supplied examples use the test identity; closed-mode demo provisioning needs a real TTL.
  if(!openAccessEnabled())throw new HttpError(403,"Demo imports are available only in open-access test mode.");
  const {mode}=z.object({mode:z.enum(["complete","midway"])}).parse(req.body);
  res.json(await ensureDemo(p,mode));
});
router.post("/plans/:id/activities/:code",async(req,res)=>{
  const p=await actor(req,["admin","ttl","editor"]);
  const id=uuid(req.params.id),code=String(req.params.code);
  if(!activityGuide[code])throw new HttpError(404,"Activity not found.");
  const input=actionBody.parse(req.body);
  if(["approve","return","reopen"].includes(input.action)&&!["admin","ttl"].includes(p.role))
    throw new HttpError(403,"Only the responsible TTL or an administrator can review activities.");
  await db.transaction(async tx=>{
    const [plan]=await tx.select().from(plans).where(eq(plans.id,id)).for("update");
    if(!plan)throw new HttpError(404,"Plan not found.");
    await accessibleUtility(p,plan.utilityId);
    const rows=await tx.select().from(planActivities).where(eq(planActivities.planId,id));
    const row=rows.find(r=>r.activityCode===code);
    if(!row)throw new HttpError(404,"Activity not found.");
    if(row.updatedAt.toISOString()!==input.updatedAt)throw new HttpError(409,"This activity changed in another session. Reload before saving; your draft has not been saved.");
    let data=row.data as Record<string,unknown>,status=row.status;
    if(input.action==="save"||input.action==="submit"){
      const reason=blockedReason(code,rows);
      if(reason)throw new HttpError(409,reason);
      if(["submitted","approved"].includes(status))throw new HttpError(409,"Reopen or return this activity before changing its content.");
      data=input.data??data;
      schemaForExample(examples[code]).parse(data);
      if(JSON.stringify(data).length>500000)throw new HttpError(400,"Activity content is too large.");
      if(input.action==="submit"){
        const missing=activityGuide[code].required.filter(key=>!hasContent(data[key]));
        if(missing.length)throw new HttpError(400,`Complete the required sections: ${missing.map(k=>k.replaceAll("_"," ")).join(", ")}.`);
        if(code==="A1.1"){
          const team=z.object({focal_point:z.object({name:z.string().trim().min(1),position:z.string().trim().min(1)}),
            team_members:z.array(z.object({name:z.string().trim().min(1),position:z.string().trim().min(1)})).min(1),
            kickoff_date:z.iso.date()}).safeParse(data);
          if(!team.success)throw new HttpError(400,"Enter the focal point's name and position, at least one named team member with a position, and a valid kick-off date.");
        }
      }
      status=input.action==="submit"?"submitted":"in_progress";
    }else if(input.action==="approve"){
      if(status!=="submitted")throw new HttpError(409,"Submit the activity before approving it.");
      const reason=blockedReason(code,rows);
      if(reason)throw new HttpError(409,reason);
      status="approved";
    }else if(input.action==="return"){
      if(status!=="submitted")throw new HttpError(409,"Only submitted activities can be returned.");
      if(!input.comment?.trim())throw new HttpError(400,"Explain the changes required before returning this activity.");
      status="in_progress";
    }else{
      if(status!=="approved")throw new HttpError(409,"Only approved activities can be reopened.");
      status="in_progress";
    }
    const now=new Date();
    await tx.update(planActivities).set({data,status,approvedBy:status==="approved"?p.id:null,
      completedAt:status==="approved"?now:null,updatedAt:now}).where(eq(planActivities.id,row.id));
    if(input.comment?.trim())await tx.insert(comments).values({planId:id,activityCode:code,userId:p.id,body:input.comment.trim()});
    const weighted=activitySeed.map(a=>({days:a.days,status:a.code===code?status:rows.find(r=>r.activityCode===a.code)!.status}));
    const completed=weighted.every(a=>a.status==="approved");
    await tx.update(plans).set({progress:String(progressOf(weighted)),status:completed?"completed":"in_progress",updatedAt:now,
      startDate:plan.startDate??now.toISOString().slice(0,10)}).where(eq(plans.id,id));
    await writeAudit(tx,p,`${input.action} ${code}`,"activity",row.id,{from:row.status,to:status,comment:input.comment??null},plan.utilityId);
  });
  res.json(await workflow(p,id));
});
export default router;
