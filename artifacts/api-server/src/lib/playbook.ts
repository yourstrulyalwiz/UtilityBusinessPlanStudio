export const phaseSeed = [
  {code:"P1",name:"Create Baseline",days:29},
  {code:"P2",name:"Define Strategic Objectives",days:23},
  {code:"P3",name:"Develop Business Plan",days:40},
  {code:"P4",name:"Sustainable Transformation Roadmap",days:16},
];
const definitions: [string,string,number,string][] = [
  ["A1.1","Stand-up project team",1,"Project team assembled"],
  ["A1.2","Document past performance (UoF)",5,""],
  ["A1.3","Key strengths and weaknesses (UoF)",2,""],
  ["A1.4","Outputs of the UoF 100-day action plan",1,""],
  ["A1.5","Demographic analysis",10,"Demographic analysis"],
  ["A1.6","Finalize enablement environment",5,""],
  ["A1.7","SWOT analysis + management discussion",5,"SWOT analysis exercise"],
  ["A2.1","Refine mission, vision and strategic objectives",5,"Strategic architecture"],
  ["A2.2","Define company-wide KPIs",10,"KPIs defined"],
  ["A2.3","Review long-term priorities from 100-day plan",1,""],
  ["A2.4","Sign-off on objectives and KPIs",1,"Objectives and KPIs approved"],
  ["A2.5","Assign owners per objective",1,""],
  ["A2.6","Align initiatives to objectives",5,"Initiatives selected"],
  ["A3.1","Project charters per initiative",15,"Project charters completed"],
  ["A3.2","Financial forecast: P&L + Capital Investment Plan",15,"Proforma P&L and investment plan completed"],
  ["A3.3","Sensitivity analysis",5,""],
  ["A3.4","Integrate business plan",5,"Business plan completed"],
  ["A4.1","Tracking process and dashboard templates",10,"Meeting agenda defined"],
  ["A4.2","Tracking team and meeting cadence",1,"Transition to internal team completed"],
  ["A4.3","Dissemination and communication",5,"Information sessions held"],
];
export const activitySeed=definitions.map(([code,name,days,milestone])=>({code,phaseCode:`P${code[1]}`,name,days,milestone}));
export function progressOf(rows:{days:number;status:string}[]) {
  const credits:Record<string,number>={not_started:0,in_progress:.25,submitted:.75,approved:1};
  const total=rows.reduce((a,r)=>a+r.days,0);
  return total?Math.round(10000*rows.reduce((a,r)=>a+r.days*(credits[r.status]??0),0)/total)/100:0;
}
