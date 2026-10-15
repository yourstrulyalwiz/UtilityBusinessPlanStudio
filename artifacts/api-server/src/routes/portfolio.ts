import { Router, type IRouter } from "express";
import { db, utilities, plans, people, members, planActivities, activities, requests, countries, phases } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import * as api from "@workspace/api-zod";
import { actor, accessibleUtility, utilityRows, filterUtilities, uuid, createUtilityRecord, writeAudit, notify, validateLogo, auditRows, HttpError } from "../lib/studio";
import countryReference from "../lib/country-reference.json";
import { openAccessEnabled } from "../lib/open-access";
import { moduleDefinitions } from "../lib/module-definitions";
import { deleteUtilityRecord } from "../lib/delete-utility";
const router:IRouter=Router();
router.get("/metadata",async(_req,res)=>{
  res.json(api.GetMetadataResponse.parse({countries:await db.select().from(countries).orderBy(countries.name),countrySource:countryReference.source,phases:moduleDefinitions.map(m=>({code:`M${m.number}`,name:m.title,days:0})),activities:[]}));
});
router.get("/admin/summary",async(req,res)=>{
  const p=await actor(req,["admin"]); const rows=(await utilityRows(p)).filter(r=>r.status==="active");
  const pending=await db.select().from(requests).where(eq(requests.status,"pending"));
  res.json(api.GetSummaryResponse.parse({
    utilities:rows.length,countries:new Set(rows.map(r=>r.countryIso3)).size,
    averageProgress:rows.length?rows.reduce((a,r)=>a+r.progress,0)/rows.length:0,completed:rows.filter(r=>r.planStatus==="completed").length,pendingRequests:pending.length,
    phases:[...moduleDefinitions.map(m=>`M${m.number}`),"Completed"].map(label=>({label,value:rows.filter(r=>label==="Completed"?r.planStatus==="completed":r.planStatus!=="completed"&&r.currentPhase===label).length})),
    regions:[...new Set(rows.map(r=>r.region))].sort().map(label=>({label,value:rows.filter(r=>r.region===label).length})),
  }));
});
router.get("/utilities/export.csv",async(req,res)=>{
  const p=await actor(req);const rows=filterUtilities(await utilityRows(p),api.ListUtilitiesQueryParams.parse(req.query));
  const cell=(v:unknown)=>`"${String(v??"").replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')}"`;
  const data=[["Country","Utility","Service area","TTL","Progress (%)","BP year","Status","Created","Source"],
    ...rows.map(r=>[r.countryName,r.name,r.serviceArea,r.ttlName,r.progress,r.planYear,r.status==="archived"?"archived":r.planStatus,r.createdAt,"Utility registry (user-entered data)"])];
  res.setHeader("Content-Disposition",'attachment; filename="utility-registry.csv"');res.type("text/csv").send("\ufeff"+data.map(r=>r.map(cell).join(",")).join("\r\n"));
});
router.get("/utilities",async(req,res)=>{
  const p=await actor(req);const q=api.ListUtilitiesQueryParams.parse(req.query);
  const rows=filterUtilities(await utilityRows(p),q);const page=Math.max(1,Number(q.page)||1);
  res.json(api.ListUtilitiesResponse.parse({items:rows.slice((page-1)*25,page*25),total:rows.length}));
});
router.post("/utilities",async(req,res)=>{
  const p=await actor(req,["admin"]);const input=api.CreateUtilityBody.parse(req.body);
  const u=await db.transaction(tx=>createUtilityRecord(tx,p,input));
  res.json(api.CreateUtilityResponse.parse((await utilityRows(p)).find(r=>r.id===u.id)));
});
router.get(["/utilities/:id","/plans/:planId"],async(req,res)=>{
  const p=await actor(req);
  let id:string;
  if(req.params.planId){
    const [plan]=await db.select().from(plans).where(eq(plans.id,uuid(req.params.planId)));
    if(!plan)throw new HttpError(404,"Plan not found.");
    id=plan.utilityId;
  }else id=uuid(req.params.id);
  await accessibleUtility(p,id);
  const utility=(await utilityRows(p)).find(r=>r.id===id)!;
  const a=await db.select({row:planActivities,def:activities}).from(planActivities).innerJoin(activities,eq(activities.code,planActivities.activityCode)).where(eq(planActivities.planId,utility.planId)).orderBy(activities.code);
  const team=await db.select({id:members.id,fullName:people.fullName,email:people.email,memberRole:members.memberRole}).from(members).innerJoin(people,eq(people.id,members.userId)).where(eq(members.utilityId,id));
  res.json(api.GetUtilityResponse.parse({utility,activities:[],members:team,audit:["admin","ttl"].includes(p.role)?await auditRows(p,id):[]}));
});
router.patch("/utilities/:id",async(req,res)=>{
  const p=await actor(req,["admin"]);const id=uuid(req.params.id);const before=await accessibleUtility(p,id);
  const data=api.UpdateUtilityBody.parse(req.body);
  if(data.name!==undefined&&!data.name.trim()||data.serviceArea!==undefined&&!data.serviceArea.trim())throw new HttpError(400,"Name and service area cannot be blank.");
  await db.transaction(async tx=>{
    if(data.ttlUserId){
      const [ttl]=await tx.select().from(people).where(and(eq(people.id,uuid(data.ttlUserId)),openAccessEnabled()?undefined:and(eq(people.role,"ttl"),eq(people.isActive,true))));
      if(!ttl)throw new HttpError(400,"Select an active TTL.");
      if(ttl.id!==before.ttlUserId){
        await tx.delete(members).where(and(eq(members.utilityId,id),eq(members.userId,before.ttlUserId)));
        await tx.insert(members).values({utilityId:id,userId:ttl.id,memberRole:"team"}).onConflictDoNothing();
        await notify(tx,ttl.id,"Utility assigned",`${before.name} has been assigned to you.`);
      }
    }
    if(data.logoPath!==undefined&&data.logoPath!==before.logoPath)await validateLogo(tx,p,data.logoPath);
    const [after]=await tx.update(utilities).set({...data,name:data.name?.trim(),serviceArea:data.serviceArea?.trim()}).where(eq(utilities.id,id)).returning();
    await writeAudit(tx,p,data.status==="archived"?"Archived utility":"Updated utility","utility",id,{before,after},id);
  });
  res.json(api.UpdateUtilityResponse.parse((await utilityRows(p)).find(r=>r.id===id)));
});
router.delete("/utilities/:id",async(req,res)=>{
  const p=await actor(req,["admin"]);
  const id=uuid(req.params.id);
  const input=api.DeleteUtilityBody.parse(req.body);
  await db.transaction(tx=>deleteUtilityRecord(tx,p,id,input.confirmationName));
  res.json({success:true});
});
router.post("/utilities/:id/members",async(req,res)=>{
  const p=await actor(req,["admin","ttl"]);const id=uuid(req.params.id);const u=await accessibleUtility(p,id,true);
  if(u.status==="archived")throw new HttpError(400,"Restore the utility before editing its team.");
  const data=api.AddMemberBody.parse(req.body);const userId=uuid(data.userId);
  const [person]=await db.select().from(people).where(eq(people.id,userId));
  if(!person || (!openAccessEnabled()&&!person.isActive))throw new HttpError(400,"Select an active user.");
  if(p.role==="ttl"&&person.invitedBy!==p.id&&person.id!==p.id)throw new HttpError(403,"Select a user you invited.");
  await db.transaction(async tx=>{
    await tx.insert(members).values({utilityId:id,userId,memberRole:data.memberRole}).onConflictDoUpdate({target:[members.utilityId,members.userId],set:{memberRole:data.memberRole}});
    await writeAudit(tx,p,"Updated team membership","utility",id,{userId,memberRole:data.memberRole},id);
    await notify(tx,userId,"Added to utility team",`You have been assigned to ${u.name}.`);
  });
  res.json({success:true});
});
router.delete("/utilities/:id/members/:memberId",async(req,res)=>{
  const p=await actor(req,["admin","ttl"]);const id=uuid(req.params.id);const u=await accessibleUtility(p,id,true);const memberId=uuid(req.params.memberId);
  const [m]=await db.select().from(members).where(and(eq(members.id,memberId),eq(members.utilityId,id)));
  if(!m)throw new HttpError(404,"Member not found.");
  if(m.userId===u.ttlUserId)throw new HttpError(400,"Reassign the responsible TTL before removing them.");
  await db.transaction(async tx=>{await tx.delete(members).where(eq(members.id,memberId));await writeAudit(tx,p,"Removed team member","utility",id,{userId:m.userId},id);});
  res.json({success:true});
});
export default router;
