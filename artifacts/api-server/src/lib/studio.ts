import { db, people, utilities, plans, countries, members, planActivities, activities, audit, notifications, uploads, planModules, type StudioPerson } from "@workspace/db";
import { and, eq, inArray, desc } from "drizzle-orm";
import { z } from "zod/v4";
import type { Request, Response, NextFunction } from "express";
import type { UtilityInput } from "@workspace/api-zod";
import { activitySeed } from "./playbook";
import { openAccessEnabled, testActor } from "./open-access";
import { createBlankModulePlan } from "./module-migration";

export class HttpError extends Error {
  constructor(public status:number,message:string){super(message);}
}
export const uuid=(value:unknown)=>z.string().uuid().parse(value);
export type Tx=Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function actor(req:Request, roles?:string[]):Promise<StudioPerson>{
  if(openAccessEnabled())return testActor();
  if(!req.user) throw new HttpError(401,"Sign in to continue.");
  const [p]=await db.select().from(people).where(eq(people.authId,req.user.id));
  if(!p?.isActive) throw new HttpError(403,"Your account is awaiting access from an administrator.");
  if(roles&&!roles.includes(p.role)) throw new HttpError(403,"You do not have permission to perform this action.");
  return p;
}
export function personDto(p:StudioPerson){
  return {id:p.id,fullName:p.fullName,email:p.email,role:p.role,organization:p.organization,isActive:p.isActive,invited:!p.authId};
}
export async function writeAudit(tx:Tx,p:StudioPerson,action:string,entity:string,entityId:string,diff:unknown={},utilityId?:string){
  await tx.insert(audit).values({userId:p.id,action,entity,entityId,diff,utilityId});
}
export async function notify(tx:Tx,userId:string,title:string,body:string){
  await tx.insert(notifications).values({userId,title,body});
}
export async function accessibleUtility(p:StudioPerson,id:string,writeTeam=false){
  const [u]=await db.select().from(utilities).where(eq(utilities.id,id));
  if(!u) throw new HttpError(404,"Utility not found.");
  if(openAccessEnabled() || p.role==="admin" || (p.role==="ttl"&&u.ttlUserId===p.id)) return u;
  if(writeTeam) throw new HttpError(403,"Only the responsible TTL or an administrator can manage the team.");
  const [m]=await db.select().from(members).where(and(eq(members.utilityId,id),eq(members.userId,p.id)));
  if(!m || p.role==="ttl") throw new HttpError(403,"This utility is not assigned to you.");
  return u;
}
export async function utilityRows(p:StudioPerson){
  let rows=await db.select({u:utilities,p:plans,c:countries,t:people}).from(utilities)
    .leftJoin(plans,eq(plans.utilityId,utilities.id)).innerJoin(countries,eq(countries.iso3,utilities.countryIso3))
    .innerJoin(people,eq(people.id,utilities.ttlUserId)).orderBy(desc(utilities.createdAt));
  if(p.role==="ttl") rows=rows.filter(r=>r.u.ttlUserId===p.id);
  else if(p.role!=="admin"){
    const assignments=await db.select({id:members.utilityId}).from(members).where(eq(members.userId,p.id));
    const ids=new Set(assignments.map(m=>m.id)); rows=rows.filter(r=>ids.has(r.u.id));
  }
  const stateRows=rows.length?await db.select({planId:planModules.planId,number:planModules.number,status:planModules.status})
    .from(planModules).where(inArray(planModules.planId,rows.flatMap(r=>r.p?[r.p.id]:[]))).orderBy(planModules.number):[];
  return rows.map(({u,p:plan,c,t})=>({
    id:u.id,name:u.name,shortName:u.shortName,countryIso3:u.countryIso3,countryName:c.name,region:c.region,
    serviceArea:u.serviceArea,ttlUserId:t.id,ttlName:t.fullName,planId:plan?.id??"",planYear:plan?.planYear??0,currency:plan?.currency??"",
    status:u.status,planStatus:plan?.status??"not_started",progress:Number(plan?.progress??0),currentPhase:
      plan?`M${stateRows.find(r=>r.planId===plan.id&&r.status!=="approved")?.number??8}`:"No business plan",createdAt:u.createdAt.toISOString(),
    uofCompletionDate:plan?.uofCompletionDate??null,wbProjectId:u.wbProjectId,logoPath:u.logoPath,
  }));
}
export function filterUtilities(rows:Awaited<ReturnType<typeof utilityRows>>,query:Record<string,unknown>){
  const str=(k:string)=>typeof query[k]==="string"?String(query[k]):"";
  const includes=(k:string,v:string)=>!str(k)||str(k).split(",").includes(v);
  const q=str("q").toLowerCase();
  const sorted=rows.filter(u=>(!q||`${u.name} ${u.shortName} ${u.serviceArea} ${u.countryName} ${u.ttlName}`.toLowerCase().includes(q))
    &&includes("country",u.countryIso3)&&includes("region",u.region)&&includes("ttl",u.ttlUserId)&&includes("year",String(u.planYear))
    &&(!str("status")||str("status")==="active"?u.status!=="archived":str("status")==="all"||str("status")==="archived"?str("status")==="all"||u.status==="archived":u.status!=="archived"&&u.planStatus===str("status")));
  const keys:Record<string,keyof typeof rows[number]>={country:"countryName",countryName:"countryName",utility:"name",name:"name",ttl:"ttlName",ttlName:"ttlName",progress:"progress",year:"planYear",planYear:"planYear",created:"createdAt",createdAt:"createdAt",status:"planStatus"};
  const key=keys[str("sort")]??"createdAt",direction=str("direction")==="asc"?1:-1;
  return sorted.sort((a,b)=>direction*(typeof a[key]==="number"?Number(a[key])-Number(b[key]):String(a[key]).localeCompare(String(b[key]))));
}
export function validateYear(year:number){
  const current=new Date().getUTCFullYear();
  if(!Number.isInteger(year)||year<current-1||year>current+3) throw new HttpError(400,`Business Plan year must be ${current-1}–${current+3}.`);
}
export async function validateLogo(tx:Tx,p:StudioPerson,path:string|null|undefined){
  if(!path)return;
  const [upload]=await tx.select().from(uploads).where(and(eq(uploads.objectPath,path),eq(uploads.confirmed,true)));
  if(!upload||upload.ownerId!==p.id)throw new HttpError(400,"Please upload and confirm the logo before saving.");
}
export async function createUtilityRecord(tx:Tx,p:StudioPerson,input:UtilityInput){
  validateYear(input.planYear);
  const [country]=await tx.select().from(countries).where(eq(countries.iso3,input.countryIso3));
  if(!country) throw new HttpError(400,"Select a country from the reference list.");
  const [storedTtl]=await tx.select().from(people).where(eq(people.id,uuid(input.ttlUserId)));
  const ttl=openAccessEnabled()?storedTtl:storedTtl?.role==="ttl"&&storedTtl.isActive?storedTtl:undefined;
  if(!ttl)throw new HttpError(400,"Select an active TTL.");
  if(!input.name.trim()||!input.serviceArea.trim())throw new HttpError(400,"Utility name and service area are required.");
  if(input.uofCompletionDate)z.iso.date().parse(input.uofCompletionDate);
  const currency=(input.currency||"USD").toUpperCase();
  if(!/^[A-Z]{3}$/.test(currency))throw new HttpError(400,"Enter a three-letter currency code.");
  await validateLogo(tx,p,input.logoPath);
  const [u]=await tx.insert(utilities).values({
    name:input.name.trim(),shortName:input.shortName?.trim()??"",countryIso3:input.countryIso3,serviceArea:input.serviceArea.trim(),
    ttlUserId:ttl.id,wbProjectId:input.wbProjectId??"",logoPath:input.logoPath??null,createdBy:p.id,
  }).returning();
  const [plan]=await tx.insert(plans).values({utilityId:u.id,planYear:input.planYear,currency,uofCompletionDate:input.uofCompletionDate||null}).returning();
  await createBlankModulePlan(tx,plan.id);
  await tx.insert(members).values({utilityId:u.id,userId:ttl.id,memberRole:"team"});
  await writeAudit(tx,p,"Created utility","utility",u.id,{utility:u,planId:plan.id},u.id);
  await notify(tx,ttl.id,"Utility assigned",`${u.name}: you are the responsible TTL for the ${plan.planYear} Business Plan.`);
  return u;
}
export async function auditRows(p:StudioPerson,utilityId?:string){
  const rows=await db.select({a:audit,actor:people.fullName}).from(audit).innerJoin(people,eq(people.id,audit.userId))
    .where(utilityId?eq(audit.utilityId,utilityId):undefined).orderBy(desc(audit.createdAt)).limit(200);
  const ids=new Set((await utilityRows(p)).map(u=>u.id));
  return rows.filter(r=>p.role==="admin"||(r.a.utilityId&&ids.has(r.a.utilityId))).map(({a,actor})=>({
    id:a.id,actor,action:a.action,entity:a.entity,entityId:a.entityId,createdAt:a.createdAt.toISOString(),
  }));
}
export function errorHandler(err:unknown,req:Request,res:Response,_next:NextFunction){
  if(err instanceof HttpError){res.status(err.status).json({error:err.message});return;}
  if(err instanceof z.ZodError || (err as {name?:string})?.name==="ZodError"){res.status(400).json({error:"Invalid input. Check required fields and formats."});return;}
  const code=(err as {code?:string,cause?:{code?:string}})?.code??(err as {cause?:{code?:string}})?.cause?.code;
  if(code==="23505"){res.status(409).json({error:"A record with that name or email already exists."});return;}
  if(code==="23503"){res.status(400).json({error:"A referenced record is missing."});return;}
  req.log.error({errorName:err instanceof Error?err.name:"Error"},"Request failed");
  res.status(500).json({error:"The request could not be completed. Please try again."});
}
