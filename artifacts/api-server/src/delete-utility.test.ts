import {test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {db,pool,people,countries,utilities,plans,members,comments,planActivities,activities,audit,planModules,modulePlans,legacyPlanCopies} from "@workspace/db";
import {eq} from "drizzle-orm";
import {createUtilityRecord} from "./lib/studio";
import {deleteUtilityRecord} from "./lib/delete-utility";

test("deletion validates name, removes all plan dependencies, retains history and accounts; rollback leaves no fixtures",async()=>{
  const rollback=new Error("Intentional rollback");
  try {
    await assert.rejects(db.transaction(async tx=>{
      const [actor]=await tx.select().from(people).limit(1);
      const [country]=await tx.select().from(countries).limit(1);
      const name=`Deletion regression ${randomUUID()}`;
      const u=await createUtilityRecord(tx,actor,{name,countryIso3:country.iso3,serviceArea:"Isolated test",ttlUserId:actor.id,planYear:2026,currency:"USD"});
      const [plan]=await tx.select().from(plans).where(eq(plans.utilityId,u.id));
      const [activity]=await tx.select().from(activities).limit(1);
      await tx.insert(planActivities).values({planId:plan.id,activityCode:activity.code});
      await tx.insert(comments).values({planId:plan.id,activityCode:activity.code,userId:actor.id,body:"Test"});
      await tx.insert(legacyPlanCopies).values({planId:plan.id,snapshot:{test:true}});
      await assert.rejects(deleteUtilityRecord(tx,actor,u.id,"incorrect"),/exact current utility name/);
      assert.equal((await tx.select().from(utilities).where(eq(utilities.id,u.id))).length,1);
      await deleteUtilityRecord(tx,actor,u.id,name);
      for(const table of [planModules,modulePlans,planActivities,comments,legacyPlanCopies])
        assert.equal((await tx.select().from(table).where(eq(table.planId,plan.id))).length,0);
      assert.equal((await tx.select().from(plans).where(eq(plans.utilityId,u.id))).length,0);
      assert.equal((await tx.select().from(members).where(eq(members.utilityId,u.id))).length,0);
      assert.equal((await tx.select().from(utilities).where(eq(utilities.id,u.id))).length,0);
      const events=await tx.select().from(audit).where(eq(audit.entityId,u.id));
      assert.ok(events.some(e=>e.action==="Deleted utility"));
      assert.ok(events.every(e=>e.utilityId===null));
      assert.equal((await tx.select().from(people).where(eq(people.id,actor.id))).length,1);
      await assert.rejects(deleteUtilityRecord(tx,actor,u.id,name),/not found/);
      throw rollback;
    }),e=>e===rollback);
  } finally {await pool.end();}
});
