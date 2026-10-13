import { db, countries, phases, activities } from "@workspace/db";
import countryReference from "./country-reference.json";
import { phaseSeed, activitySeed } from "./playbook";

// Reference definitions only. Never create example users or utility records.
export async function seedReferenceData(){
  await db.transaction(async tx=>{
    await tx.insert(countries).values(countryReference.countries).onConflictDoNothing();
    await tx.insert(phases).values(phaseSeed).onConflictDoNothing();
    await tx.insert(activities).values(activitySeed).onConflictDoNothing();
  });
}
