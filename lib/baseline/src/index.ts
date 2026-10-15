import workbook from "./workbook.json";
export {workbook};
export const inputVariables=workbook.variables.filter(v=>!v.excelFormula);
export const derivedVariables=workbook.variables.filter(v=>!!v.excelFormula);
export interface BaselineData {
  baselineVersion:1;
  referenceYear:number|null;
  variables:Record<string,number|null>;
  variableNotes:Record<string,string>;
  indicatorNotes:Record<string,string>;
  importedWorkbook:boolean;
}
export function createBaseline(prefill=false):BaselineData {
  return {baselineVersion:1,referenceYear:prefill?2024:null,
    variables:Object.fromEntries(inputVariables.map(v=>[v.id,prefill?v.value:null])),
    variableNotes:prefill?Object.fromEntries(inputVariables.filter(v=>v.note).map(v=>[v.id,v.note])):{},
    indicatorNotes:{},importedWorkbook:prefill};
}
export function isBaseline(v:unknown):v is BaselineData {
  if(!v||typeof v!=="object")return false;
  const d=v as BaselineData;
  return d.baselineVersion===1&&!!d.variables&&typeof d.variables==="object"&&!Array.isArray(d.variables);
}
export const levelLabels=["Elemental","Básico","Bueno","Buen desempeño","Clase mundial"];
export function levelFor(value:number,def:(typeof workbook.indicators)[number]):number|null {
  if(!def.direction)return null;
  for(let i=3;i>=0;i--)if(def.direction===">"?value>=Number(def.thresholds[i]):value<=Number(def.thresholds[i]))return i+2;
  return 1;
}
export interface BaselineIssue {keys:string[];message:string;severity:"error"|"warning"}
export function evaluateBaseline(data:BaselineData) {
  const issues:BaselineIssue[]=[];
  const values:Record<string,number|null>={};
  const issue=(keys:string[],message:string,severity:"error"|"warning"="error")=>issues.push({keys,message,severity});
  if(data.referenceYear!==null&&(!Number.isInteger(data.referenceYear)||data.referenceYear<1900||data.referenceYear>2200))
    issue([],"Reference year must be a whole year between 1900 and 2200.");
  for(const v of inputVariables){
    const raw=data.variables[v.id];
    const n=typeof raw==="number"&&Number.isFinite(raw)?raw:null;
    values[v.id]=n;
    if(raw!==null&&raw!==undefined&&n===null)issue([v.id],`${v.name}: enter a finite number.`);
    if(n!==null){
      if(n<0)issue([v.id],`${v.name}: cannot be negative.`);
      if(v.unit==="%"&&n>1)issue([v.id],`${v.name}: cannot exceed 100%.`);
      if(v.id==="v19"&&n>24)issue([v.id],"Continuity cannot exceed 24 hours per day.");
      if(v.unit==="número"&&!Number.isInteger(n))issue([v.id],`${v.name}: use a whole count.`);
    }
  }
  const relation=(a:string,b:string,message:string,severity:"error"|"warning"="error")=>{
    if(values[a]!==null&&values[b]!==null&&values[a]!>values[b]!)issue([a,b],message,severity);
  };
  for(const [a,b,message] of [
    ["v11","v10","Metered connections cannot exceed total water connections."],
    ["v12","v11","Smart meters cannot exceed installed water meters."],
    ["v12","v10","Smart meters cannot exceed total connections."],
    ["v13","v10","Domestic connections cannot exceed total connections."],
    ["v16","v15","Water sales cannot exceed water production for the same period."],
    ["v17","v16","Domestic water sales cannot exceed total water sales."],
    ["v25","v24","Treated volume cannot exceed collected volume."],
    ["v37","v36","Electronic collections cannot exceed total collections."],
    ["v43","v42","Electronic invoices cannot exceed total invoices."],
    ["v49","v48","Female employees cannot exceed total employees."],
    ["v51","v50","Female managers cannot exceed total managers."],
    ["v53","v52","Female engineers cannot exceed total engineers."],
    ["v50","v48","Managers cannot exceed total employees."],
    ["v52","v48","Engineers cannot exceed total employees."],
    ["v40","v38","Labor costs cannot exceed total operating costs."],
  ])relation(a,b,message);
  relation("v36","v35","Collection rate exceeds 100%. Check periods, arrears and the revenue denominator.","warning");
  relation("v54","v48","Employee turnover exceeds 100%. Check period and workforce denominator.","warning");
  const n=(id:number)=>values[`v${id}`];
  const calc=(ids:number[],fn:(...n:number[])=>number):number|null=>ids.every(i=>n(i)!==null)?fn(...ids.map(i=>n(i)!)):null;
  values.v56=calc([7,13],(a,b)=>a*b+(n(8)??0)*(n(14)??0));
  values.v57=n(7)!==null&&(n(22)!==null||n(23)!==null)?n(7)!*((n(22)??0)+(n(23)??0)):null;
  values.v58=calc([15,16],(a,b)=>a-b);
  values.v59=calc([35,38],(a,b)=>a-b);
  relation("v56","v6","Calculated water coverage exceeds 100%. Check population and domestic connections.");
  relation("v57","v6","Calculated sanitation coverage exceeds 100%. Check population and duplicate properties.");
  // Explicit workbook formulas; never evaluate arbitrary Excel or user expressions.
  const dependencies:Record<number,number[]>={
    5:[19],6:[18],7:[17,56],8:[26],9:[20],10:[25,24],11:[56,6],12:[57,6],13:[32],14:[31],15:[27],
    16:[36,35],17:[11,10],18:[33],19:[58,10,19],20:[58,15],21:[29,28],22:[59,35],23:[35,38],24:[48,10],25:[54,48],26:[40,38],
  };
  const expanded:Record<number,number[]>={56:[7,13,8,14],57:[7,22,23],58:[15,16],59:[35,38]};
  const resultValues:Record<number,number|null>={};
  const ratio=(row:number,num:number|null,den:number|null,mult=1)=>{
    if(num===null||den===null)return null;
    if(den===0){issue(dependencies[row].map(x=>`v${x}`),"Cannot calculate with a zero denominator.","warning");return null;}
    const r=num/den*mult;
    return Number.isFinite(r)?r:null;
  };
  for(const row of [5,6,8,9,13,14,15,18])resultValues[row]=n(dependencies[row][0]);
  resultValues[7]=ratio(7,n(17),n(56),1000/365);
  for(const row of [10,11,12,16,17,20,22,23,25,26])resultValues[row]=ratio(row,n(dependencies[row][0]),n(dependencies[row][1]));
  resultValues[19]=ratio(19,n(58),calc([10,19],(a,b)=>365*a*b),1000);
  resultValues[21]=ratio(21,n(29),n(28),100);
  resultValues[24]=ratio(24,n(48),n(10)!==null?n(10)!+(n(22)??0):null,1000);
  const indicators=workbook.indicators.map(def=>{
    const deps=[...new Set(dependencies[def.row].flatMap(i=>[i,...(expanded[i]??[])]).concat(def.row===24?[22]:[]))].map(i=>`v${i}`);
    const value=resultValues[def.row]??null;
    const relevant=issues.filter(e=>e.keys.some(k=>deps.includes(k)));
    if(value!==null&&def.unit==="%"&&![22,23,16,25].includes(def.row)&&(value<0||value>1)){
      if(!relevant.length){const e:BaselineIssue={keys:deps,message:"Calculated percentage is outside 0–100%. Check input variables.",severity:"error"};issues.push(e);relevant.push(e);}
    }
    return {...def,value,level:value!==null&&!relevant.length?levelFor(value,def):null,
      issues:relevant,dependencies:deps,missing:deps.filter(k=>values[k]===null)};
  });
  return {indicators,derived:Object.fromEntries(derivedVariables.map(v=>[v.id,values[v.id]])),issues,valid:!issues.some(i=>i.severity==="error")};
}
