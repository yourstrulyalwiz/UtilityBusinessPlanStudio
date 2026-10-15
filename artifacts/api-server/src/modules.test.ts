import { test } from "node:test";
import assert from "node:assert/strict";
import { blankValue, exampleFor, moduleDefinitions, moduleProgress, moduleReady, meaningfulModule } from "./lib/module-definitions";
import { migrateModulePlans } from "./lib/module-migration";
import { db, pool, legacyPlanCopies, planModules } from "@workspace/db";

test("eight independent modules, neutral review progress and empty drafts",()=>{
  assert.equal(moduleDefinitions.length,8);
  for(const kind of ["real","fictional"])for(const m of moduleDefinitions)assert.ok(Object.keys(exampleFor(kind,m.number)).length);
  assert.equal(moduleProgress(Array.from({length:8},()=>({status:"ready_for_review"}))),0);
  assert.equal(moduleProgress(Array.from({length:8},(_,i)=>({status:i===0?"approved":"in_progress"}))),12.5);
  assert.equal(meaningfulModule({value:null,gap_note:"Unknown"}),false);
  assert.equal(moduleReady(2,blankValue(exampleFor("fictional",2)) as Record<string,unknown>),false);
  assert.equal(moduleReady(2,exampleFor("real",2)),true);
});
test("repeated conversion preserves immutable copies and active module edits",async()=>{
  try {
    const before=await db.select().from(legacyPlanCopies);
    const modules=await db.select().from(planModules);
    await migrateModulePlans();
    assert.deepEqual(await db.select().from(legacyPlanCopies),before);
    assert.deepEqual(await db.select().from(planModules),modules);
    assert.ok(before.length>0);
    for(const copy of before)assert.equal((copy.snapshot.activities as unknown[]).length,20);
  }finally{await pool.end();}
});
