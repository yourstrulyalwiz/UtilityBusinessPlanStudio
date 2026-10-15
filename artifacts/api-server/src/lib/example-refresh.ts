import {db,modulePlans,planModules,plans} from "@workspace/db";
import {eq,sql} from "drizzle-orm";
import demo from "./demo-option-b.json";
import {createBaseline} from "@workspace/baseline";
import {objectiveFields} from "./strategy";
export function exampleBaseline(){
 const row=demo.module3.baseline_indicators.at(-1)!;
 const baseline=createBaseline();
 baseline.referenceYear=row.year;
 const mapping:Record<string,number>={v6:row.population_service_area,v10:row.connections_water,v15:row.water_produced_m3,v16:row.billed_m3,v19:row.continuity_hours_day,v20:row.water_quality_compliance_pct/100,v22:row.connections_sewer,v35:row.total_revenue,v38:row.operating_costs,v48:row.staff};
 Object.assign(baseline.variables,mapping);
 for(const key of Object.keys(mapping))baseline.variableNotes[key]="Provided Valle Verde fictional example, "+row.year+". Not Tagbilaran data.";
 return baseline;
}
export async function refreshExamples(){
 await db.transaction(async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(81260350)`);
  for(const meta of await tx.select().from(modulePlans).where(eq(modulePlans.kind,"fictional"))){
   if(meta.context.modernExampleEditors)continue;
   const rows=await tx.select().from(planModules).where(eq(planModules.planId,meta.planId));
   let changed=false;
   for(const row of rows){
    let next:Record<string,unknown>|undefined;
    if(row.number===1&&Object.values((row.data.variables??{}) as object).every(v=>v===null))next={...exampleBaseline()};
    if(row.number===2&&!row.data.strategyVersion){
     const d=row.data as typeof demo.module2;
     next={strategyVersion:1,mission:d.mission??"",vision:d.vision??"",values:[],
      objectives:(d.objectives??[]).map(o=>({...Object.fromEntries(objectiveFields.map(f=>[f,""])),code:o.code,title:o.title,specific:o.smart,owner:o.owner})),
      sign_off:d.sign_off};
    }
    if(row.number===3&&!row.data.assessmentVersion){
     const d=row.data as typeof demo.module3;
     next={assessmentVersion:1,
      areas:Object.entries(d.maturity_self_assessment?.scores??{}).map(([area,score],i)=>({id:`area-${i}`,area,status:"Not assessed",key_indicators:`Reported self-assessment: ${score}/100. This is not a 1–5 indicator level.`,findings:[],message:""})),
      messages:(d.maturity_self_assessment?.strengths??[]).map((text,i)=>({id:`message-${i}`,type:"Overall",text})),
      swot:Object.fromEntries(Object.entries(d.swot??{}).map(([key,items])=>[key,items.map(([text,priority],i)=>({id:`${key}-${i}`,text,priority}))])),
      review_notes:"The supplied example contains numeric maturity scores, not qualitative assessment statuses. No conversion to Critical/Weak/Moderate/Strong has been assumed. Add area findings and judgments before submitting."};
    }
    if(next){changed=true;await tx.update(planModules).set({data:next,status:"in_progress",updatedAt:new Date()}).where(eq(planModules.id,row.id));}
   }
   await tx.update(modulePlans).set({context:{...meta.context,modernExampleEditors:true,previousExampleModules:rows.filter(r=>r.number<=3)}}).where(eq(modulePlans.planId,meta.planId));
   if(changed){
    const states=await tx.select().from(planModules).where(eq(planModules.planId,meta.planId));
    await tx.update(plans).set({progress:String(Math.round(states.filter(r=>r.status==="approved").length/8*10000)/100),status:"in_progress"}).where(eq(plans.id,meta.planId));
   }
  }
 });
}
