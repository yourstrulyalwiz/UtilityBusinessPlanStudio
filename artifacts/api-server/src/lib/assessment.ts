import {z} from "zod/v4";
import source from "./assessment-tcws.json";
export {source as assessmentSource};
const text=z.string().max(20000);
const id=z.string().min(1).max(150);
const item=z.object({id,text}).passthrough();
export const assessmentSchema=z.object({
  assessmentVersion:z.literal(1),
  areas:z.array(z.object({id,area:text,status:z.enum(["Critical","Weak","Moderate","Strong","Not assessed"]),key_indicators:text,
    findings:z.array(text).max(100),message:text}).passthrough()).max(100),
  messages:z.array(z.object({id,type:text,text}).passthrough()).max(100),
  swot:z.object({strengths:z.array(item).max(200),weaknesses:z.array(item).max(200),opportunities:z.array(item).max(200),threats:z.array(item).max(200)}).passthrough(),
  review_notes:text,
}).passthrough().superRefine((d,ctx)=>{
  for(const rows of [d.areas,d.messages,...Object.values(d.swot).filter(Array.isArray)]){
    const ids=rows.map(r=>r.id);
    if(new Set(ids).size!==ids.length)ctx.addIssue({code:"custom",message:"Each item must have a unique ID within its section."});
  }
});
export function blankAssessment(){
  return {assessmentVersion:1,areas:source.areas.map(a=>({id:a.id,area:a.area,status:"Not assessed",key_indicators:"",findings:[] as string[],message:""})),
    messages:[] as {id:string,type:string,text:string}[],swot:{strengths:[],weaknesses:[],opportunities:[],threats:[]},review_notes:""};
}
export function assessmentReady(data:Record<string,unknown>){
  const parsed=assessmentSchema.safeParse(data);
  if(!parsed.success)return false;
  const d=parsed.data;
  return d.areas.length>0&&d.areas.every(a=>a.area.trim()&&a.status!=="Not assessed"&&a.message.trim()&&a.findings.some(f=>f.trim()))&&
    d.messages.some(m=>m.text.trim())&&["strengths","weaknesses","opportunities","threats"].every(k=>(d.swot[k] as {text:string}[]).some(i=>i.text.trim()));
}
