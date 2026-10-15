import {z} from "zod/v4";
import {inputVariables,workbook} from "@workspace/baseline";
const notes=(keys:string[])=>z.record(z.string(),z.string().max(6000)).refine(v=>Object.keys(v).every(k=>keys.includes(k)),"Unknown note key");
export const baselineSchema=z.object({
  baselineVersion:z.literal(1),referenceYear:z.number().int().min(1900).max(2200).nullable(),
  variables:z.record(z.string(),z.number().finite().nullable()).refine(v=>Object.keys(v).length===inputVariables.length&&inputVariables.every(d=>d.id in v),"Supply the workbook variable set"),
  variableNotes:notes(inputVariables.map(v=>v.id)),
  indicatorNotes:notes(workbook.indicators.map(i=>i.id)),importedWorkbook:z.boolean(),
}).passthrough();
