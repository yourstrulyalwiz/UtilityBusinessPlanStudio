// Guidance content library. Topic text is taken from the supplied change-request document (see SOURCE_DOC).
// Sector lenses are author-created qualitative illustrations and are labelled as such in the UI.

export const SOURCE_DOC = "Option_A_—_Replit_Change_Request_Guidance_Content_Library_1791919068001.docx";
export const ILLUSTRATIVE = "Illustrative recommendation — not sector data";

export type GuidanceExample = { label: string; text?: string; table?: { headers: string[]; rows: string[][] } };
export type Phase = "P1" | "P2" | "P3" | "P4";
export type GuidanceTopic = {
  id: string; title: string; phase: Phase; source: string;
  definition: string[]; whyItMatters: string[]; examples: GuidanceExample[];
  tips: { do: string[]; avoid: string[] }; guidingQuestions?: string[]; fieldHints?: Record<string, string>;
};

export const PHASE_NAMES: Record<Phase, string> = { P1: "Create Baseline", P2: "Define Strategic Objectives", P3: "Develop Business Plan", P4: "Roadmap" };

const S = SOURCE_DOC;
const T = (t: Omit<GuidanceTopic, "source">): GuidanceTopic => ({ ...t, source: S });

export const GUIDANCE: Record<string, GuidanceTopic> = Object.fromEntries([
  T({ id: "project-team", title: "Stand-up the project team", phase: "P1",
    definition: ["The project team leads the development of the business plan. It is headed by a Utility Leader / Focal Point and includes staff for each UoF element: commercial management, technical operations, human resources, planning and strategy, and financial management."],
    whyItMatters: ["A respected leader with direct access to the CEO builds trust and commitment across the utility.", "People who took part in the UoF program already understand its goals and methods.", "A diverse team (age, gender, knowledge, hierarchy) produces a more realistic plan."],
    examples: [{ label: "Example team", text: "Focal Point: Head of Strategic Planning (UoF focal point). Members: Commercial Manager, Operations Engineer, HR Specialist, Planning Analyst, Financial Controller, plus the local consultant." }],
    tips: { do: ["Pick a leader such as the Head of Strategy or CFO.", "Name one person per UoF element."], avoid: ["A team made only of senior managers."] } }),
  T({ id: "past-performance", title: "Document past performance", phase: "P1",
    definition: ["A record of the utility's quantitative results in the five UoF elements (Commercial Management, Technical Operations, Financial Management, Human Talent, Organization & Strategy), ideally for the last 3 years, with a short narrative explaining them."],
    whyItMatters: ["Trends show whether the utility is improving, stable or deteriorating.", "The narrative explains the numbers: recent investments, specific projects or external factors."],
    examples: [{ label: "Example narrative", text: "\"Collection rate rose from 78% (2022) to 86% (2024) after the billing system upgrade and a door-to-door campaign; metered connections grew from 61% to 74%.\"" }],
    tips: { do: ["Add 3 years of data where possible.", "Cite the source (UoF report, audited statements)."], avoid: ["Listing numbers without explaining the trend."] } }),
  T({ id: "uof-maturity", title: "Key strengths and weaknesses", phase: "P1",
    definition: ["The strengths and weaknesses the management team identifies from the UoF radar (spider) graph and the comments for each of the five elements."],
    whyItMatters: ["They are the internal half of the SWOT analysis.", "The candid management discussion is as valuable as the written result."],
    examples: [{ label: "Strength", text: "\"Water quality processes rated advanced; compliance above 98%.\"" }, { label: "Weakness", text: "\"Asset management rated elementary; no updated asset register.\"" }],
    guidingQuestions: ["Which processes are well performing or world-class?", "Which are elementary or basic?", "Why is each element at its current level?", "What recent changes explain it?"],
    tips: { do: ["Allow time for an open discussion before writing."], avoid: ["Copying the UoF report without interpretation."] } }),
  T({ id: "action-plan-100-day", title: "Outputs of the UoF 100-day action plan", phase: "P1",
    definition: ["A review of the 100-Day Impact Evaluation from the UoF: what changed, what worked, and who drove it.", "What to capture: impact and changes during the 100 days; a case study of the most important change; staff engagement and change adoption; key success factors; lessons learned; high-performing staff; high-performing teams or departments."],
    whyItMatters: ["Success factors and lessons learned shape the business plan approach.", "High-performing staff and teams are candidates for the business plan team.", "Long-term priorities identified then feed the strategic objectives (A2.3)."],
    examples: [{ label: "What to capture", text: "Impact and changes during the 100 days; a case study of the most important change; staff engagement and change adoption; key success factors; lessons learned; high-performing staff; high-performing teams or departments." }],
    tips: { do: ["Link each lesson to a later decision in the plan."], avoid: ["Treating the 100-day plan as finished history; it is the starting point."] } }),
  T({ id: "demographics", title: "Demographic analysis", phase: "P1",
    definition: ["An analysis of population growth, household expansion, migration, age distribution, industrial dynamics and infrastructure development in the service area."],
    whyItMatters: ["It anticipates demand: more households mean more connections, even when population grows slower.", "It shows where the network must expand.", "It should align with the region's urban development master plan."],
    examples: [{ label: "Querétaro, Mexico, from the guide", table: { headers: ["Indicator", "2010", "2020", "Note"], rows: [["Population", "789,566", "1,045,631", "+32.4% in 10 years"], ["Households", "202,791", "305,361", "+50.6%; 698,046 forecast for 2030"], ["Occupants per household", "3.89", "3.42", "3.30 forecast for 2030"], ["Dwellings with piped water", "90.56%", "95.36%", ""]] } },
      { label: "Other data points", text: "195,760 people moved in between 2015 and 2020; largest age group 15–29 years (26.8%), median age 30." }],
    tips: { do: ["Use official statistics (national census, statistics office) and cite them.", "Translate each finding into a water implication."], avoid: ["Data older than the last census."] } }),
  T({ id: "enablement-environment", title: "Enablement environment", phase: "P1",
    definition: ["The external conditions the utility operates in, grouped in five pillars: Policy (legal and policy framework, decision-making processes), Sector Institutions (capacities, clear roles), Intergovernmental Relations (coordination, aligned long-term goals), Financing (sustainable mechanisms, effective tariff structures) and Regulation (clear standards, monitoring and compliance)."],
    whyItMatters: ["Many constraints (tariffs, transfers, regulation) are outside the utility's control but shape its plan.", "It feeds the Opportunities and Threats of the SWOT."],
    examples: [{ label: "Financing", text: "\"Tariffs are set by the municipal council and have not been adjusted since 2019; the national water fund offers concessional loans for NRW reduction.\"" }],
    tips: { do: ["Rate each pillar and justify the rating."], avoid: ["Describing laws without saying how they affect the utility."] } }),
  T({ id: "swot", title: "SWOT analysis", phase: "P1",
    definition: ["A matrix of internal Strengths and Weaknesses (attributes the utility controls) and external Opportunities and Threats (environmental factors that help or hinder it)."],
    whyItMatters: ["It is the bridge between the diagnosis and the strategic objectives.", "Its real value is the actionable strategy it leads to, not the list itself."],
    examples: [{ label: "From the guide", table: { headers: ["Quadrant", "Items"], rows: [["Strengths", "Highly skilled and experienced workforce; modern, well-maintained distribution network; strong customer base and reputation; efficient water conservation practices"], ["Weaknesses", "Aging infrastructure with high maintenance costs; limited adoption of modern technologies; high water leakage rate; dependence on a single water source"], ["Opportunities", "Growing population in the service area; demand for water-efficient technologies; government incentives for infrastructure upgrades; expansion into neighboring regions"], ["Threats", "Legal and regulatory changes; economic downturns affecting customers; increasing water scarcity; technological disruption of existing infrastructure"]] } }],
    tips: { do: ["Start with external factors (Opportunities and Threats), as the guide recommends.", "Prioritize: significance matters more than the number of items.", "Treat it as a snapshot and update it."], avoid: ["Filling the quadrants without discussing implications with management."] } }),
  T({ id: "mission", title: "Mission statement", phase: "P2",
    definition: ["The mission states why the utility exists: whom it serves and what it delivers. It is simple and inspirational. Start from the statement produced in the UoF toolkit and refine it with the SWOT insights."],
    whyItMatters: ["It anchors every objective and initiative in the plan.", "Staff, customers and regulators understand the utility's purpose in one sentence."],
    examples: [{ label: "DHL Group (logistics)", text: "\"Excellence. Simply delivered.\"" }, { label: "Danone (food)", text: "\"Bringing health through food to as many people as possible.\"" }, { label: "Water utility (illustrative, as given in the document)", text: "\"Safe, reliable water and sanitation for every household we serve, every day.\"" }],
    guidingQuestions: ["Whom do we serve?", "What service do we provide?", "What makes how we serve distinctive?", "What would be lost if the utility did not exist?"],
    tips: { do: ["Keep it under 25 words.", "Use words staff would say."], avoid: ["Lists of activities or technical jargon."] } }),
  T({ id: "vision", title: "Vision statement", phase: "P2",
    definition: ["The vision states what the utility wants to become: a north star for the next 5–10 years. It can be more elaborate than the mission."],
    whyItMatters: ["It sets the direction that the strategic objectives must move toward.", "It aligns the board, management and staff on ambition."],
    examples: [{ label: "DHL Group (logistics)", text: "\"We are the logistics company for the world.\"" }, { label: "Danone (food)", text: "\"One Planet. One Health.\"" }, { label: "Water utility (illustrative, as given in the document)", text: "\"To be the most trusted and efficient water utility in the region by 2035.\"" }],
    guidingQuestions: ["Where do we want to be in 5–10 years?", "What will customers, staff and regulators say about us then?", "Which UoF maturity level do we aim for?"],
    tips: { do: ["Make it ambitious and time-anchored."], avoid: ["Confusing it with the mission (purpose) or with a single objective."] } }),
  T({ id: "smart-objectives", title: "Strategic objectives (SMART)", phase: "P2",
    definition: ["Strategic objectives are the few outcomes the utility commits to, aligned with the mission and vision and grounded in the internal situation, the enablement environment and the SWOT. SMART checks that each is Specific, Measurable, Achievable, Relevant and Time-bound."],
    whyItMatters: ["Vague objectives (\"enhance operational efficiency\") cannot be managed or tracked.", "Well-written objectives translate directly into KPIs and initiatives."],
    examples: [{ label: "From the guide", table: { headers: ["Typical objective", "SMART objective"], rows: [["Decrease overhead spending", "Over the next fiscal year, reduce overhead spending by 15% by identifying and implementing cost-saving measures"], ["Reduce waste", "Reduce non-revenue water by 15% over the next year through efficient water distribution systems and leak detection technology"], ["Increase market position", "In the next year, increase our market share by 5% through efficiency improvements and customer satisfaction initiatives"]] } }],
    guidingQuestions: ["Specific: What needs to be accomplished? Who will be involved?", "Measurable: How will we measure progress? How much must be achieved? Which indicators will we use?", "Achievable: Do we have the resources and capabilities? Is it realistic for the time available?", "Relevant: How does it relate to the mission and vision? Is it pertinent to current priorities?", "Time-bound: When will it be accomplished? Is there a specific deadline?"],
    tips: { do: ["Set stretch objectives: specific, challenging goals with tight deadlines lead to better performance.", "Use SMART only to test that an objective is well written, not to lower the ambition."], avoid: ["More than 6–8 objectives."] } }),
  T({ id: "kpis", title: "Company-wide KPIs", phase: "P2",
    definition: ["Key performance indicators are the few metrics that show progress toward the strategic objectives. Every utility tracks at least five quantitative KPIs, complemented by other quantitative and qualitative KPIs."],
    whyItMatters: ["KPIs let management compare actual results with targets every quarter and act early."],
    examples: [{ label: "Core KPIs", table: { headers: ["KPI", "Formula"], rows: [["Non-Revenue Water (%)", "(water produced or purchased − water billed) ÷ water produced or purchased"], ["Collection rate", "collections from customers ÷ billed customer revenue"], ["Operating Cost Coverage Ratio", "operating revenues ÷ operating costs"], ["EBITDA margin", "EBITDA ÷ total revenue"], ["Debt Service Coverage Ratio", "cash from operations ÷ principal and interest payments"]] } },
      { label: "Qualitative KPI examples (from the Master Guide)", text: "Create the Environmental Management Department; review procurement practices; launch customer satisfaction surveys; implement an ERP; strengthen dialogue with the regulator on sector policy and tariffs." }],
    tips: { do: ["Keep 8–12 measures, balanced across financial, customer, operational, strategic and human capital aspects.", "Benchmark against peers (IBNET utility dashboard: newibnet.org/utility-dashboard)."], avoid: ["KPIs with no clear data source."] } }),
  T({ id: "sign-off", title: "Sign-off on objectives and KPIs", phase: "P2",
    definition: ["The formal approval of the strategic objectives and KPIs by the responsible and management teams."],
    whyItMatters: ["It confirms management commitment before initiatives are designed."],
    examples: [{ label: "Proposed agenda (from the Master Guide)", text: "1. Introduction and purpose. 2. Review of the current state. 3. Proposed strategic objectives, rationale and alignment with mission and vision. 4. Proposed KPIs. 5. Open discussion and feedback. 6. Formal sign-off." }],
    tips: { do: ["Upload the minutes and list who signed."], avoid: ["Moving to initiatives before sign-off."] } }),
  T({ id: "objective-owners", title: "Owners per objective", phase: "P2",
    definition: ["One accountable owner per strategic objective, who drives execution, monitors progress and removes obstacles."],
    whyItMatters: ["Clear accountability keeps each objective moving."],
    examples: [{ label: "Example", text: "Objective 1 \"Reduce NRW to 30% by 2030\" → Owner: Technical Operations Director." }],
    tips: { do: ["Assign one person, not a department.", "Choose someone with authority over the needed resources."], avoid: ["Shared or departmental ownership."] } }),
  T({ id: "initiatives", title: "Initiatives to achieve the objectives", phase: "P2",
    definition: ["Initiatives are actionable projects with tasks, resources and timelines that deliver each objective. Each initiative later gets a project charter.", "How to run it: the objective owner leads a session with the relevant staff, explains the objective and its background, and brainstorms and details the initiatives, reusing UoF best practices and long-term actions."],
    whyItMatters: ["Initiatives turn objectives into funded, owned work."],
    examples: [{ label: "Example", text: "Objective \"Reduce NRW\" → Initiative 1: District metered areas. Initiative 2: Meter replacement program. Initiative 3: Active leak detection team." }],
    tips: { do: ["Link every initiative to one objective."], avoid: ["Initiatives no one owns or funds."] } }),
  T({ id: "project-charters", title: "Project charters", phase: "P3",
    definition: ["A project charter formally authorizes an initiative and gives the project manager authority to use the organization's resources. It states the mission, goals, scope, dependencies, risks, assumptions, major milestones, sponsor and team, budget and completion date, and it is signed."],
    whyItMatters: ["It sets clear boundaries and a formal record at the start of the project.", "It is how top management formally accepts and commits to the project."],
    examples: [{ label: "From the guide", text: "\"Upgrade and Modernization of Water Distribution System\". Mission: enhance the efficiency, reliability and sustainability of the distribution system. Goals: increase system efficiency by 20% within 18 months; reduce leak losses by 15% within 12 months; cut maintenance response time by 25%. Scope: assessment, replacement of aging pipes, real-time monitoring and control system, staff training. Risks: unforeseen underground conditions, weather delays, budget overruns, resistance to change. Milestones: assessment complete → regulatory approvals → works start → monitoring live → training complete → testing complete. Budget: USD 5,000,000." }],
    fieldHints: { mission: "What the project intends to accomplish and why.", goals: "Schedule, cost and quality targets, including what to preserve or avoid.", milestones: "Only the major ones.", approvals: "At least sponsor, project manager and finance manager." },
    tips: { do: ["Name a signatory with the authority and resources to help."], avoid: ["Unclear objective.", "Project manager's role not defined.", "Key people not told the project has started.", "Signatory without the authority or resources to help."] } }),
  T({ id: "proforma-pl", title: "Proforma P&L", phase: "P3",
    definition: ["A forward-looking income statement (revenue, costs, EBITDA, depreciation, interest, taxes, net income) based on explicit assumptions. In the platform: 4 years of actuals plus 5 forecast years.", "How each line is projected (from the guide): Water and sewage charges = connections × average metered consumption × average tariff × collection rate. Production cost = m³ produced or purchased × average cost per m³. Distribution and other operating costs = % of revenue. Tax = constant % of taxable income. Interest = historical average (simplified)."],
    whyItMatters: ["It shows whether the plan is financially sustainable.", "It is the main tool to talk with creditors, banks and investors."],
    examples: [{ label: "Projection logic (from the guide)", text: "Water and sewage charges = connections × average metered consumption × average tariff × collection rate." }],
    fieldHints: { assumptions: "State each assumption explicitly; the Studio stores values as entered and does not recalculate them." },
    tips: { do: ["Involve operational managers, not only finance.", "Start from trend extrapolation as a base scenario and then reflect the strategic objectives and investments.", "Compare projections with recent results and benchmarks.", "Enter expenses as positive numbers."], avoid: ["Presenting goals as forecasts: plans tend to be optimistic."] } }),
  T({ id: "capital-investment-plan", title: "Capital Investment Plan", phase: "P3",
    definition: ["The investments needed for the initiatives (water, sanitation, other CAPEX), how they are financed (long- and short-term loans), the debt service, the incremental depreciation, and the resulting Debt Service Coverage Ratio.", "Key concept: DSCR = net cash flow from operating activities ÷ (principal + interest). Above 1 means the utility generates enough cash to pay its debt; below 1 signals difficulty.", "Glossary: CAPEX = funds invested in tangible assets (infrastructure, equipment) expected to generate long-term benefits."],
    whyItMatters: ["It links investment ambitions to the ability to repay debt."],
    examples: [{ label: "DSCR (from the guide)", text: "DSCR = net cash flow from operating activities ÷ (principal + interest)." }],
    tips: { do: ["Tie every investment to an initiative and its charter.", "Plan cash outflows by milestone."], avoid: ["Financing that pushes DSCR below 1 without a mitigation."] } }),
  T({ id: "sensitivity", title: "Sensitivity analysis", phase: "P3",
    definition: ["A test of how changes in key assumptions change the results (revenue, EBITDA, net income). For water utilities, tariffs are the most critical variable."],
    whyItMatters: ["Critical assumptions become early warning indicators."],
    examples: [{ label: "From the guide", text: "A profit projection of USD 74 M in the plan falls to USD 62 M if a key cost rises 40%, and rises to USD 86 M if it falls 30%." }],
    tips: { do: ["Use realistic scenarios grounded in regulation, market and cost changes.", "Record which assumptions are critical: they become early warning indicators."], avoid: ["Arbitrary changes."] } }),
  T({ id: "integrate-plan", title: "Integrate the business plan", phase: "P3",
    definition: ["Assemble all components into the Business Plan Outline: 1 Executive Summary, 2 Internal Situation, 3 Enablement Environment, 4 Assessment, 5 Strategy, 6 Financial Plan, 7 Performance Management Framework, 8 Appendices."],
    whyItMatters: ["A single coherent document is what boards, regulators and financiers read."],
    examples: [{ label: "Executive summary hint", text: "Current situation and performance, enablement environment, mission, vision and objectives, key initiatives, expected financial results and required investments." }],
    tips: { do: ["Write the executive summary last.", "Explain the reasons behind trends, not only the numbers."], avoid: ["Pasting sections without connecting them."] } }),
  T({ id: "tracking-process", title: "Tracking process, team and cadence", phase: "P4",
    definition: ["Periodic meetings (recommended quarterly) where a tracking team of top managers reviews KPIs against targets using the dashboard and agrees on corrective actions."],
    whyItMatters: ["Data supports, but does not replace, management judgment."],
    examples: [{ label: "Agenda example (from the Master Guide)", text: "1. Previous quarter highlights and achievements. 2. KPI review against targets using the dashboard. 3. Optimization opportunities, with responsibilities. 4. Closing remarks and key takeaways." }],
    tips: { do: ["Include finance, operations and strategy leaders.", "Keep the corporate dashboard to 8–12 measures with high visual impact."], avoid: ["Letting data replace management judgment."] } }),
  T({ id: "dissemination", title: "Dissemination and communication", phase: "P4",
    definition: ["Sharing the approved business plan inside the utility (staff, board) and outside (regulator, municipality, customers, financiers) through information sessions and workshops."],
    whyItMatters: ["A plan that people do not know about is not executed."],
    examples: [{ label: "Example", text: "All-staff town hall; department workshops on initiatives; presentation to the regulator; summary on the utility website." }],
    tips: { do: ["Tailor the message to each audience.", "Complete the transfer of responsibilities from consultants to the internal team."], avoid: ["One message for every audience."] } }),
].map((t) => [t.id, t]));

export const ACTIVITY_GUIDANCE: Record<string, string[]> = {
  "A1.1": ["project-team"], "A1.2": ["past-performance"], "A1.3": ["uof-maturity"], "A1.4": ["action-plan-100-day"], "A1.5": ["demographics"],
  "A1.6": ["enablement-environment"], "A1.7": ["swot"], "A2.1": ["mission", "vision", "smart-objectives"], "A2.2": ["kpis"], "A2.3": ["action-plan-100-day", "kpis"],
  "A2.4": ["sign-off"], "A2.5": ["objective-owners"], "A2.6": ["initiatives"], "A3.1": ["project-charters"], "A3.2": ["proforma-pl", "capital-investment-plan"],
  "A3.3": ["sensitivity"], "A3.4": ["integrate-plan"], "A4.1": ["tracking-process"], "A4.2": ["tracking-process"], "A4.3": ["dissemination"],
};

export const topicsFor = (code: string) => (ACTIVITY_GUIDANCE[code] ?? []).map((id) => GUIDANCE[id]).filter(Boolean);

/** Map a form field key to a topic so inline help can open. Keyword based, qualitative only. */
const FIELD_TOPIC: [RegExp, string][] = [
  [/mission/i, "mission"], [/vision/i, "vision"], [/smart|objective/i, "smart-objectives"], [/kpi|indicator/i, "kpis"], [/swot|strength|weakness|opportunit|threat/i, "swot"],
  [/charter/i, "project-charters"], [/initiative/i, "initiatives"], [/owner/i, "objective-owners"], [/team|member|focal/i, "project-team"], [/demograph|population|household/i, "demographics"],
  [/enabl|policy|regulat|pillar/i, "enablement-environment"], [/sensitiv|scenario/i, "sensitivity"], [/capex|invest|dscr|debt|loan/i, "capital-investment-plan"],
  [/p&?l|pnl|revenue|cost|ebitda|income|assumption|forecast/i, "proforma-pl"], [/sign.?off|approv|minutes/i, "sign-off"], [/track|cadence|dashboard/i, "tracking-process"],
  [/dissem|communicat|audience/i, "dissemination"], [/past|performance|history/i, "past-performance"], [/100|lesson/i, "action-plan-100-day"], [/maturity|radar/i, "uof-maturity"],
];
export function topicForField(key: string,path=""): GuidanceTopic | undefined {
  if(path.includes("A1.2")&&/indicator|year|narrative|source/i.test(key))return GUIDANCE["past-performance"];
  const hit = FIELD_TOPIC.find(([re]) => re.test(key));
  if (hit) return GUIDANCE[hit[1]];
  return undefined;
}
export function hintForField(key: string, topic?: GuidanceTopic): string | undefined {
  if (!topic?.fieldHints) return undefined;
  const k = Object.keys(topic.fieldHints).find((h) => key.toLowerCase().includes(h));
  return k ? topic.fieldHints[k] : undefined;
}

// Sector lenses: author-created, qualitative, hypothetical. No statistics.
export type Sector = "water" | "energy" | "transport" | "health";
export const SECTORS: { id: Sector; label: string }[] = [
  { id: "water", label: "Water and sanitation" }, { id: "energy", label: "Energy distribution" }, { id: "transport", label: "Urban transport" }, { id: "health", label: "Health services" },
];
const LENS: Record<Sector, Record<Phase, string>> = {
  water: {
    P1: "A water utility baseline usually rests on the UoF results, network condition, metering and customer service. Explain why each trend happened, not only that it happened.",
    P2: "Purpose statements for water typically speak about safe, reliable service for every household. Objectives often address losses, collections, service continuity and staff capability.",
    P3: "Initiatives such as network renewal or metering programmes need a charter, an owner and a financing source before they enter the financial plan.",
    P4: "Quarterly tracking works best when operations, commercial and finance leaders review the same short dashboard together.",
  },
  energy: {
    P1: "A hypothetical power distributor would describe grid reliability, losses and billing in the same way: what the numbers show, and what caused them.",
    P2: "An energy company might frame its mission around keeping homes and businesses supplied safely; objectives could target outage response or loss reduction, written in SMART form.",
    P3: "Grid upgrades would be chartered like water network works: scope, risks, milestones and sponsor, with financing tied to each project.",
    P4: "A distributor would track reliability and customer indicators at a regular management meeting, adjusting actions rather than only reporting.",
  },
  transport: {
    P1: "A hypothetical city bus operator would baseline route coverage, fleet condition and fare collection, and explain what changed in recent years.",
    P2: "A transport operator might state its purpose as connecting people to jobs and services; objectives could address punctuality or fleet availability.",
    P3: "Fleet renewal would become a chartered initiative with milestones such as procurement, delivery and driver training.",
    P4: "Communicating the plan to riders, staff and the city authority would be tailored to each audience, as in any public service.",
  },
  health: {
    P1: "A hypothetical district hospital network would document service coverage, staffing and patient experience, citing official data sources.",
    P2: "A health provider might express its mission as care that reaches everyone it serves; objectives could address waiting times or staff retention.",
    P3: "Facility or equipment investments would be chartered and linked to the objectives they serve before being financed.",
    P4: "Management review meetings would combine indicators with clinical and managerial judgment to decide corrective actions.",
  },
};
export const sectorLens = (sector: Sector, phase: Phase) => LENS[sector][phase];

export const searchTopics = (q: string) => {
  const s = q.trim().toLowerCase();
  const all = Object.values(GUIDANCE);
  if (!s) return all;
  return all.filter((t) => JSON.stringify(t).toLowerCase().includes(s));
};
