import { z } from "zod/v4";
// Task instructions are implementation guidance, not claimed as verbatim library content.
export const activityGuide:Record<string,{required:string[];instructions:string;needs:string[]}>={
  "A1.1":{required:["focal_point","team_members","kickoff_date"],instructions:"Name the focal point, assemble the multidisciplinary team and agree a kick-off date. Add people using the repeatable team fields.",needs:["Names and roles of the utility team","Kick-off date"]},
  "A1.2":{required:["indicators","narratives"],instructions:"Record past performance and explain the trends across the five UoF elements. Include the original sources and reporting years.",needs:["UoF assessment","Historical performance reports"]},
  "A1.3":{required:["maturity_scores","strengths","weaknesses"],instructions:"Review maturity scores and identify evidence-based strengths and weaknesses. Record the management discussion.",needs:["UoF maturity assessment","Performance evidence from A1.2"]},
  "A1.4":{required:["impact","lessons","long_term_priorities"],instructions:"Summarise the 100-day action plan: what changed, what the team learned and which priorities need longer-term investment.",needs:["100-day action plan results","Case studies and team feedback"]},
  "A1.5":{required:["population","households","implications"],instructions:"Describe the service area and its demographic outlook. Record assumptions and sources alongside the figures, then explain implications for service demand.",needs:["Population and household information","Service-area boundaries and source documents"]},
  "A1.6":{required:["pillars"],instructions:"Assess the enabling environment pillar by pillar. Record ratings, evidence, opportunities and threats.",needs:["Policy and regulatory context","Institutional assessment"]},
  "A1.7":{required:["swot","management_discussion"],instructions:"Combine internal strengths and weaknesses with external opportunities and threats. Prioritise findings with management.",needs:["Strengths and weaknesses from A1.3","Enabling environment from A1.6"]},
  "A2.1":{required:["mission","vision","objectives"],instructions:"Set a mission and vision, then define measurable, time-bound objectives informed by the SWOT.",needs:["Approved or submitted SWOT","Leadership priorities"]},
  "A2.2":{required:["kpis"],instructions:"Define indicators and their units, baseline and targets for each objective. Keep the measurement method and ownership clear.",needs:["Strategic objectives from A2.1","Baseline indicators from A1.2"]},
  "A2.3":{required:["priorities"],instructions:"Decide which long-term priorities to retain, revise or defer and explain each decision.",needs:["Long-term priorities from A1.4","Objectives and targets"]},
  "A2.4":{required:["meeting_date","decision"],instructions:"Record the sign-off meeting, attendees, decisions and requested changes. Only submit when the decision is accurately documented.",needs:["Objectives and KPIs","Meeting decisions or signed minutes reference"]},
  "A2.5":{required:["owners"],instructions:"Assign accountable owners and backups to each objective and document their responsibilities.",needs:["Signed-off objectives","Team responsibilities"]},
  "A2.6":{required:["initiatives"],instructions:"Define initiatives that deliver the objectives. Record scope, priority and links to the strategy.",needs:["Objectives and owners","Candidate initiatives"]},
  "A3.1":{required:["charters"],instructions:"Develop a charter for each initiative: scope, deliverables, ownership, schedule, costs and risks. Check budget breakdowns against totals.",needs:["Initiatives from A2.6","Cost estimates and implementation assumptions"]},
  "A3.2":{required:["actual_assumptions","assumptions","capital_investment_plan","pl_actuals","pl_forecast"],instructions:"Document actual results, assumptions, investments and the forecast. These are editable planning inputs; this form does not recalculate financial statements or validate the supplied forecast.",needs:["Historical financial statements","Charter budgets and financing assumptions"]},
  "A3.3":{required:["scenarios","conclusions"],instructions:"Record the financial outcomes of alternative scenarios and explain their implications. Enter reviewed scenario results; changing assumptions here does not run a financial model.",needs:["Reviewed base forecast","Sensitivity calculations and risk assumptions"]},
  "A3.4":{required:["executive_summary"],instructions:"Bring the plan together in a coherent executive summary, using the evidence and decisions from earlier steps.",needs:["Strategy, charters and financial results","Water balance and asset-management notes"]},
  "A4.1":{required:["agenda","dashboard_rules","quarterly_inputs"],instructions:"Define the review agenda, data rules and periodic inputs for tracking implementation. Record reviewed KPI actuals.",needs:["KPIs and targets","Operational and financial actuals"]},
  "A4.2":{required:["team","cadence","transition"],instructions:"Assign the tracking team, agree the meeting cadence and document the handover to the internal team.",needs:["Tracking responsibilities","Handover and meeting arrangements"]},
  "A4.3":{required:["events","summary"],instructions:"Plan and document communication events so stakeholders understand the plan, their roles and how progress will be reported.",needs:["Stakeholder audiences","Dissemination events and materials"]},
};

export function hasContent(value:unknown):boolean{
  if(value===null||value===undefined)return false;
  if(typeof value==="object"&&!Array.isArray(value)&&"value" in value&&"gap_note" in value)
    return hasContent(value.value);
  if(typeof value==="string")return !!value.trim();
  if(typeof value==="number")return Number.isFinite(value);
  if(typeof value==="boolean")return true;
  if(Array.isArray(value))return value.some(hasContent);
  return typeof value==="object"&&Object.values(value).some(hasContent);
}

/** Validate supplied field types while permitting incomplete drafts and additional user fields. */
export function schemaForExample(example:unknown):z.ZodType {
  if(Array.isArray(example))return z.array(schemaForExample(example[0])).max(1000).nullable();
  if(example&&typeof example==="object"){
    return z.object(Object.fromEntries(Object.entries(example).map(([key,value])=>[key,schemaForExample(value).optional()]))).passthrough().nullable();
  }
  if(typeof example==="number")return z.union([z.number(),z.null(),z.literal("")]);
  if(typeof example==="boolean")return z.boolean().nullable();
  if(typeof example==="string")return z.string().max(100000).nullable();
  return z.unknown();
}
