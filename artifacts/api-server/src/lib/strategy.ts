import {z} from "zod/v4";
import source from "./strategy-tcws.json";
export {source as strategySource};
export const objectiveFields=["code","title","relevant","specific","kpi","kpi_formula","baseline","baseline_year","target","time_bound","achievable","owner"] as const;
const text=z.string().max(20000);
export const strategySchema=z.object({
  strategyVersion:z.literal(1),vision:text,mission:text,values:z.array(z.string().max(500)).max(100),
  objectives:z.array(z.object(Object.fromEntries(objectiveFields.map(k=>[k,text])) as Record<typeof objectiveFields[number],typeof text>).passthrough()).max(100),
}).passthrough();
export const blankStrategy=()=>({strategyVersion:1,vision:"",mission:"",values:[] as string[],objectives:[] as Record<string,string>[]});
export function strategyReady(data:Record<string,unknown>){
  const parsed=strategySchema.safeParse(data);
  if(!parsed.success)return false;
  const d=parsed.data;
  return !!d.vision.trim()&&!!d.mission.trim()&&d.values.some(v=>v.trim())&&d.objectives.length>0&&
    d.objectives.every(o=>o.title.trim()&&o.specific.trim()&&o.kpi.trim()&&o.target.trim());
}
