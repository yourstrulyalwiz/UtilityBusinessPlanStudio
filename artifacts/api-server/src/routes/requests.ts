import { Router, type IRouter } from "express";
import { db, requests, people, countries } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import * as api from "@workspace/api-zod";
import { actor, uuid, HttpError, validateYear, createUtilityRecord, writeAudit, notify } from "../lib/studio";
const router:IRouter=Router();
async function rows(p:{id:string;role:string}){
  const data=await db.select({r:requests,ttlName:people.fullName,countryName:countries.name}).from(requests)
    .innerJoin(people,eq(people.id,requests.requestedBy)).innerJoin(countries,eq(countries.iso3,requests.countryIso3))
    .where(p.role==="admin"?undefined:eq(requests.requestedBy,p.id)).orderBy(desc(requests.createdAt));
  return data.map(({r,ttlName,countryName})=>({...r,ttlName,countryName,createdAt:r.createdAt.toISOString()}));
}
router.get("/utility-requests",async(req,res)=>{const p=await actor(req,["admin","ttl"]);res.json(api.ListRequestsResponse.parse(await rows(p)));});
router.post("/utility-requests",async(req,res)=>{
  const p=await actor(req,["ttl"]);const data=api.CreateRequestBody.parse(req.body);validateYear(data.planYear);
  if(!data.utilityName.trim()||!data.serviceArea.trim()||!data.justification.trim())throw new HttpError(400,"Complete all required fields.");
  const [country]=await db.select().from(countries).where(eq(countries.iso3,data.countryIso3));
  if(!country)throw new HttpError(400,"Select a country from the reference list.");
  const id=await db.transaction(async tx=>{
    const [r]=await tx.insert(requests).values({...data,utilityName:data.utilityName.trim(),requestedBy:p.id}).returning();
    await writeAudit(tx,p,"Requested utility","request",r.id,data);
    const admins=await tx.select().from(people).where(and(eq(people.role,"admin"),eq(people.isActive,true)));
    for(const admin of admins)await notify(tx,admin.id,"New utility request",`${p.fullName} requested ${data.utilityName}.`);
    return r.id;
  });
  res.json(api.CreateRequestResponse.parse((await rows(p)).find(r=>r.id===id)));
});
router.post("/utility-requests/:id/decision",async(req,res)=>{
  const p=await actor(req,["admin"]);const id=uuid(req.params.id);const data=api.DecideRequestBody.parse(req.body);
  if(data.decision==="decline"&&!data.note?.trim())throw new HttpError(400,"Provide a reason for declining the request.");
  await db.transaction(async tx=>{
    const [r]=await tx.select().from(requests).where(eq(requests.id,id)).for("update");
    if(!r)throw new HttpError(404,"Request not found.");
    if(r.status!=="pending")throw new HttpError(409,"This request has already been decided.");
    let utilityId:string|undefined;
    if(data.decision==="approve"){
      const input=data.utility??{name:r.utilityName,countryIso3:r.countryIso3,serviceArea:r.serviceArea,planYear:r.planYear,ttlUserId:r.requestedBy};
      // Request ownership cannot be reassigned by a forged approval payload.
      const u=await createUtilityRecord(tx,p,{...input,ttlUserId:r.requestedBy});
      utilityId=u.id;
    }
    const status=data.decision==="approve"?"approved":"declined";
    await tx.update(requests).set({status,decidedBy:p.id,decisionNote:data.note??null}).where(eq(requests.id,id));
    await writeAudit(tx,p,`${status==="approved"?"Approved":"Declined"} utility request`,"request",id,{status,note:data.note??null},utilityId);
    await notify(tx,r.requestedBy,`Utility request ${status}`,`${r.utilityName}${data.note?`: ${data.note}`:""}`);
  });
  res.json({success:true});
});
export default router;
