import { utilities, plans, members, comments, audit, planActivities, modulePlans, planModules, legacyPlanCopies, type StudioPerson } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { HttpError, writeAudit, type Tx } from "./studio";

/** Caller supplies one transaction; either every dependent row is removed or none are. */
export async function deleteUtilityRecord(tx:Tx, actor:StudioPerson, id:string, confirmationName:string) {
  const [utility]=await tx.select().from(utilities).where(eq(utilities.id,id)).for("update");
  if(!utility)throw new HttpError(404,"Utility not found.");
  if(confirmationName!==utility.name)throw new HttpError(400,"Type the exact current utility name to confirm deletion.");
  const ownedPlans=await tx.select().from(plans).where(eq(plans.utilityId,id)).for("update");
  const planIds=ownedPlans.map(p=>p.id);
  const kinds=planIds.length?await tx.select({kind:modulePlans.kind}).from(modulePlans).where(inArray(modulePlans.planId,planIds)):[];
  if(planIds.length){
    await tx.delete(comments).where(inArray(comments.planId,planIds));
    await tx.delete(planActivities).where(inArray(planActivities.planId,planIds));
    await tx.delete(planModules).where(inArray(planModules.planId,planIds));
    await tx.delete(legacyPlanCopies).where(inArray(legacyPlanCopies.planId,planIds));
    await tx.delete(modulePlans).where(inArray(modulePlans.planId,planIds));
    await tx.delete(plans).where(inArray(plans.id,planIds));
  }
  await tx.delete(members).where(eq(members.utilityId,id));
  // Keep administrative history, but detach the FK from the deleted utility.
  await tx.update(audit).set({utilityId:null}).where(eq(audit.utilityId,id));
  await writeAudit(tx,actor,"Deleted utility","utility",id,{name:utility.name,planIds,deletedSourceKinds:[...new Set(kinds.map(k=>k.kind))]});
  await tx.delete(utilities).where(eq(utilities.id,id));
}
