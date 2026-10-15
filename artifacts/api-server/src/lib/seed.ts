import { db, countries, phases, activities } from "@workspace/db";
import countryReference from "./country-reference.json";
import { phaseSeed, activitySeed } from "./playbook";
import { seedTestIdentity, openAccessEnabled, testActor } from "./open-access";
import { migrateModulePlans } from "./module-migration";
import { seedSuppliedModulePlans } from "./module-seed";
import { migrateBaseline } from "./baseline-migration";
import { migrateStrategy } from "./strategy-migration";
import { migrateAssessment } from "./assessment-migration";
import { migrateReviewed } from "./reviewed-migration";
import {migrateFixedScenarios} from "./fixed-scenarios";
import {refreshExamples} from "./example-refresh";

// Reference definitions only. Never create example users or utility records.
export async function seedReferenceData(){
  await db.transaction(async tx=>{
    await tx.insert(countries).values(countryReference.countries).onConflictDoNothing();
    await tx.insert(phases).values(phaseSeed).onConflictDoNothing();
    await tx.insert(activities).values(activitySeed).onConflictDoNothing();
  });
  await seedTestIdentity();
  await migrateModulePlans();
  if(openAccessEnabled()){
    const p=await testActor();
    await seedSuppliedModulePlans(p);
  }
  await migrateBaseline();
  await migrateStrategy();
  await migrateAssessment();
  await migrateReviewed();
  await migrateFixedScenarios();
  await refreshExamples();
}
