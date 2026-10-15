import {db,modulePlans} from "@workspace/db";
import {eq,sql} from "drizzle-orm";
export const scenarioTypes=["conservative","base","ambitious"] as const;
export function fixedScenarios(input:unknown[]=[]){
 const old=input.filter((v):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v));
 return scenarioTypes.map(type=>({
  ...(old.find(s=>s.type===type)??{}),
  code:`SC-${type.toUpperCase()}`,type,name:type[0].toUpperCase()+type.slice(1),
  is_primary:type==="base",
 }));
}
export async function migrateFixedScenarios(){
 await db.transaction(async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(81260349)`);
  for(const row of await tx.select().from(modulePlans)){
   if(row.context.fixedScenarioDefinitions)continue;
   await tx.update(modulePlans).set({scenarios:fixedScenarios(row.scenarios),context:{...row.context,fixedScenarioDefinitions:true,previousScenarioDefinitions:row.scenarios}}).where(eq(modulePlans.planId,row.planId));
  }
 });
}
