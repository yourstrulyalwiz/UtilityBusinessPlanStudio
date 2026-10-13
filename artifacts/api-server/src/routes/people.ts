import { Router, type IRouter } from "express";
import { db, people, utilities, requests, notifications, savedViews } from "@workspace/db";
import { eq, and, or, sql, desc } from "drizzle-orm";
import * as api from "@workspace/api-zod";
import { actor, personDto, HttpError, uuid, writeAudit, auditRows } from "../lib/studio";
const router:IRouter=Router();
const canBootstrap=(authId:string)=>Boolean(process.env.INITIAL_ADMIN_REPLIT_ID&&process.env.INITIAL_ADMIN_REPLIT_ID===authId);
async function profile(authId:string){
  const [p]=await db.select().from(people).where(eq(people.authId,authId));
  const admins=await db.select({id:people.id}).from(people).where(and(eq(people.role,"admin"),eq(people.isActive,true))).limit(1);
  if(!p)throw new HttpError(403,"Sign out and sign in again to initialize your profile.");
  return {person:personDto(p),setupRequired:!admins.length,canBootstrap:!admins.length&&canBootstrap(authId)};
}
router.get("/profile",async(req,res)=>{
  if(!req.user)throw new HttpError(401,"Sign in to continue.");
  res.json(api.GetProfileResponse.parse(await profile(req.user.id)));
});
router.post("/setup",async(req,res)=>{
  if(!req.user)throw new HttpError(401,"Sign in to continue.");
  if(!canBootstrap(req.user.id))throw new HttpError(403,"An administrator must be designated by the project owner.");
  const authId=req.user.id;
  await db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(84721501)`);
    const admins=await tx.select().from(people).where(and(eq(people.role,"admin"),eq(people.isActive,true)));
    if(admins.length)throw new HttpError(409,"An administrator is already configured.");
    const [p]=await tx.update(people).set({role:"admin",isActive:true}).where(eq(people.authId,authId)).returning();
    if(!p)throw new HttpError(403,"Sign in again before setting up your account.");
    await writeAudit(tx,p,"Initialized administrator","user",p.id);
  });
  res.json(api.BootstrapAdminResponse.parse(await profile(authId)));
});
router.get("/users",async(req,res)=>{
  const p=await actor(req,["admin","ttl"]);
  const rows=await db.select().from(people).where(p.role==="admin"?undefined:or(eq(people.invitedBy,p.id),eq(people.id,p.id))).orderBy(people.fullName);
  res.json(api.ListUsersResponse.parse(rows.map(personDto)));
});
router.post("/users",async(req,res)=>{
  const p=await actor(req,["admin","ttl"]);const data=api.InviteUserBody.parse(req.body);
  if(!data.fullName.trim())throw new HttpError(400,"Full name is required.");
  if(p.role==="ttl"&&!["editor","viewer"].includes(data.role))throw new HttpError(403,"TTLs may invite editors or viewers only.");
  const email=data.email.trim().toLowerCase();
  const created=await db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(84721501)`);
    const [existing]=await tx.select().from(people).where(eq(people.email,email));
    let result;
    if(existing){
      if(existing.isActive||existing.invitedBy)throw new HttpError(409,"This user already has an invitation or access.");
      [result]=await tx.update(people).set({...data,email,fullName:data.fullName.trim(),isActive:true,invitedBy:p.id}).where(eq(people.id,existing.id)).returning();
    }else{
      [result]=await tx.insert(people).values({...data,email,fullName:data.fullName.trim(),invitedBy:p.id}).returning();
    }
    await writeAudit(tx,p,"Provisioned user access","user",result.id,{role:data.role});
    return result;
  });
  res.json(api.InviteUserResponse.parse(personDto(created)));
});
router.patch("/users/:id",async(req,res)=>{
  const p=await actor(req,["admin"]);const id=uuid(req.params.id);const data=api.UpdateUserBody.parse(req.body);
  const updated=await db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(84721501)`);
    const [before]=await tx.select().from(people).where(eq(people.id,id));
    if(!before)throw new HttpError(404,"User not found.");
    if(before.role==="admin"&&(data.role&&data.role!=="admin"||data.isActive===false)){
      const admins=await tx.select().from(people).where(and(eq(people.role,"admin"),eq(people.isActive,true)));
      if(admins.length<=1&&before.isActive)throw new HttpError(400,"Keep at least one active administrator.");
    }
    if(before.role==="ttl"&&(data.role&&data.role!=="ttl"||data.isActive===false)){
      const assigned=await tx.select().from(utilities).where(eq(utilities.ttlUserId,id));
      const pending=await tx.select().from(requests).where(and(eq(requests.requestedBy,id),eq(requests.status,"pending")));
      if(assigned.length||pending.length)throw new HttpError(400,"Reassign this TTL's utilities and resolve pending requests first.");
    }
    const [after]=await tx.update(people).set(data).where(eq(people.id,id)).returning();
    await writeAudit(tx,p,"Updated user access","user",id,{before:personDto(before),after:personDto(after)});
    return after;
  });
  res.json(api.UpdateUserResponse.parse(personDto(updated)));
});
router.get("/audit",async(req,res)=>{const p=await actor(req,["admin","ttl"]);res.json(api.ListAuditResponse.parse(await auditRows(p)));});
router.get("/notifications",async(req,res)=>{
  const p=await actor(req);const rows=await db.select().from(notifications).where(eq(notifications.userId,p.id)).orderBy(desc(notifications.createdAt)).limit(100);
  res.json(api.ListNotificationsResponse.parse(rows.map(r=>({...r,createdAt:r.createdAt.toISOString()}))));
});
router.post("/notifications/:id/read",async(req,res)=>{
  const p=await actor(req);const [row]=await db.update(notifications).set({read:true}).where(and(eq(notifications.id,uuid(req.params.id)),eq(notifications.userId,p.id))).returning();
  if(!row)throw new HttpError(404,"Notification not found.");
  res.json({success:true});
});
router.get("/views",async(req,res)=>{const p=await actor(req);res.json(api.ListViewsResponse.parse(await db.select().from(savedViews).where(eq(savedViews.userId,p.id))));});
router.post("/views",async(req,res)=>{
  const p=await actor(req);const data=api.SaveViewBody.parse(req.body);
  const [view]=await db.insert(savedViews).values({...data,userId:p.id}).returning();res.json(api.SaveViewResponse.parse(view));
});
router.delete("/views/:id",async(req,res)=>{
  const p=await actor(req);await db.delete(savedViews).where(and(eq(savedViews.id,uuid(req.params.id)),eq(savedViews.userId,p.id)));res.json({success:true});
});
export default router;
