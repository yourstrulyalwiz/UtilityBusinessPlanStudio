import demo from "./demo-option-b.json";
import real from "./tagbilaran-option-b.json";
import guidance from "./guidance-option-b.json";
import catalog from "./lgu-indicators.json";

export { demo, real, guidance, catalog };
export const moduleDefinitions = [
  {number:1,title:"Utility profile & planning",description:"Define the service area, team, planning horizon and scenarios."},
  {number:2,title:"Strategic direction",description:"Describe mission, vision, values and measurable objectives."},
  {number:3,title:"Diagnostic & baseline",description:"Assess service performance, demand, assets, enabling conditions and SWOT."},
  {number:4,title:"Goals, strategies & actions",description:"Connect goals to strategies, costed actions and project charters."},
  {number:5,title:"Financial plan",description:"Review historical finances, investment, operating costs and scenario projections."},
  {number:6,title:"Tariffs & affordability",description:"Compare tariffs, cost recovery and affordability with clear assumptions."},
  {number:7,title:"Implementation & monitoring",description:"Assign KPI responsibilities, targets, milestones and review routines."},
  {number:8,title:"Review & outputs",description:"Consolidate the executive summary, resolve gaps and share the reviewed plan."},
];
export const sourceNames={
  fictional:"demo_utility_valle_verde_v2_1792021268122.json",
  real:"tagbilaran_tcws_optionB_1792021268124.json",
  guidance:"guidance_optionB_1792021268123.json",
  catalog:"indicator_catalog_lgu_waterworks_(1)_1792021268122.json",
};
export function exampleFor(kind:string,n:number):Record<string,unknown> {
  const source=(kind==="real"?real:demo) as Record<string,unknown>;
  return source[`module${n}`] as Record<string,unknown>;
}
export function blankValue(ex:unknown):unknown {
  if(Array.isArray(ex))return [];
  if(ex&&typeof ex==="object")return Object.fromEntries(Object.entries(ex).map(([k,v])=>[k,blankValue(v)]));
  if(typeof ex==="number"||ex===null)return null;
  if(typeof ex==="boolean")return false;
  return "";
}
export const moduleProgress=(rows:{status:string}[])=>rows.length?Math.round(rows.filter(r=>r.status==="approved").length/8*10000)/100:0;
// Draft gaps and source citations are not completed business content.
export function meaningfulModule(value:unknown):boolean {
  if(value===null||value===undefined)return false;
  if(typeof value==="string")return !!value.trim();
  if(typeof value==="number")return Number.isFinite(value);
  if(typeof value==="boolean")return value;
  if(Array.isArray(value))return value.some(meaningfulModule);
  if(typeof value==="object"){
    if("value" in value&&"gap_note" in value)return meaningfulModule(value.value);
    return Object.entries(value).some(([k,v])=>!["source","gap_note","note","notes","open_issues","rating_gap","targets_gap"].includes(k)&&meaningfulModule(v));
  }
  return false;
}
export const coreFields:Record<number,string[]>={
  1:["profile"],2:["mission","vision","objectives"],3:["annual_indicators","baseline_indicators"],
  4:["goals","strategies","actions"],5:["baseline","Baseline","business_plan","Improvement","actuals"],
  6:["current_tariff","Baseline","required_tariff","proposed_tariff"],7:["kpis"],8:["executive_summary"],
};
export function moduleReady(number:number,data:Record<string,unknown>) {
  const keys=coreFields[number]??[];
  // Financial and baseline source templates have alternative field names.
  return [3,5,6].includes(number)?keys.some(k=>meaningfulModule(data[k])):keys.every(k=>meaningfulModule(data[k]));
}
