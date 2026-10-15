import original from "./workbook.json";
const groups=["Service scope","Water service","Wastewater and fecal sludge","Customer service","Financial data (PhP)","Planning and strategy","Human resources","Calculated intermediate variables"];
const sourceGroups=[...new Set(original.variables.map(v=>v.group))];
const units:Record<string,string>={"personas":"people","número":"count","horas":"hours","h/día":"hours/day","l/hab/día":"L/person/day","emp/1000 con":"employees/1,000 connections","l/con/h":"L/connection/hour"};
const notes:Record<number,string>={
6:"PSA 2024 census, entire city. TCWS serves 10 of 15 barangays (approximately 27,000 people).",
7:"Average household size (Table 20).",8:"No public standpipes reported.",
10:"Actual 2024 connections (Table 21 note). August 2025: 6,084.",
11:"Customers purchase meters; the number is not reported.",
13:"6,461 × 98.9% (residential share of 6,017/6,084 in 2025).",
15:"No 2024 data. 7.66 MLD × 365 (January–June 2025 average).",
16:"No 2024 data. 5.26 MLD × 365 (January–June 2025 average). Billed in 2023: 1,897,357 m³.",
17:"6,017 residential connections × 26.1 m³/month × 12.",
19:"Reported range: 22–24 hours/day; midpoint used.",
20:'SWOT: "10% sampling failures" (PNSDW standard, not WHO).',
22:"TCWS does not provide sanitation services.",
23:"PPDO reports 103% of households with septic tanks (inconsistent figure).",
25:"A 24 m³/day sludge treatment plant is under development.",
31:"Only response-time targets were defined.",
35:"2024 water sales (Table 5). Total revenues are not reported.",
36:"Collection efficiency not calculated.",
37:"Online payment partners exist; amounts are unavailable.",
38:"No 2024 data. Calculated 2023 operating expenses (Table 16).",
39:"2030 projection only: PhP 87.8 million.",
40:"2030 projection only: PhP 10.4 million.",
48:'Permanent staff (Table 6). Including 15 "job order" staff: 24. The narrative mentions 11 permanent staff.',
49:'Permanent staff; 6 including "job order" staff.',
50:"Organization chart: department head and officer in charge.",
56:"People per household × domestic connections + people per standpipe × standpipes.",
57:"People per household × (sewer connections + septic tanks).",
58:"Produced volume − sold volume.",59:"Revenue − operating expenses."
};
const formulas=[
"Average service hours","Customers supplied 24/7 / total customers",
"Domestic sales × 1000 / 365 / population served","Emptying requests completed within 24 hours / requests received",
"Compliant samples / total samples","Treated volume / collected volume",
"Population served with water / population","Population served with sanitation / population",
"Customer satisfaction survey","Grievances resolved within 7 days / received",
"Complaints addressed within 48 hours / received","Collections / revenue",
"Metered connections / total connections","Resolved complaints / received complaints",
"NRW volume × 1000 / 365 / connections / service hours","(Produced − sold) / produced",
"Blockages / network length in km × 100","(Revenue − operating expenses) / revenue",
"Revenue / operating expenses","Employees / (water + sewer connections) × 1000",
"Employees who left / employees","Labor costs / operating expenses"
];
const generalNotes=[
"Reference year: 2024. Where 2024 data was unavailable, the nearest available data was used: 2023 operating expenses and annualized January–June 2025 production and sales volumes.",
"EBITDA margin and cost coverage compare 2024 revenue with 2023 operating expenses and are approximate.",
"Water coverage uses the entire city population. TCWS serves only 10 of 15 barangays, so coverage within its actual service area would be higher.",
'Employees per 1,000 connections uses 9 permanent staff. Including 15 "job order" staff (24 total) would give 3.71 (Level 4).',
'"No data" means the document does not report the required information. Indicators recalculate when variables are completed.'
];
const translations=new Map<string,string>();
original.variables.forEach(v=>{if(v.note&&notes[v.row])translations.set(v.note,notes[v.row]);});
original.notes.forEach((n,i)=>translations.set(n,generalNotes[i]));
/** Translate only known supplied text; never rewrite user-authored notes. */
export const englishSourceText=(text:string)=>translations.get(text)??text;
export const englishWorkbook={
  ...original,
  variables:original.variables.map(v=>({...v,group:groups[sourceGroups.indexOf(v.group)],unit:units[v.unit]??v.unit,
    note:notes[v.row]??v.note,origin:({"Documento":"Document","Estimado":"Estimated","Inferido":"Inferred","Sin dato":"No data","Calculado":"Calculated"} as Record<string,string>)[v.origin]??v.origin})),
  indicators:original.indicators.map((i,n)=>({...i,unit:units[i.unit]??i.unit,formula:formulas[n],
    cachedValue:i.cachedValue==="Sin dato"?"No data":i.cachedValue,cachedLevel:i.cachedLevel==="Sin dato"?"No data":i.cachedLevel,
    excelFormula:i.excelFormula?.replaceAll("Sin dato","No data"),
    bands:i.bands.map(b=>b==="Informativo (sin rangos de referencia)"?"Informational (no reference bands)":b)})),
  notes:generalNotes
};
