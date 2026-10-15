import {test} from "node:test";
import assert from "node:assert/strict";
import {strategySource,strategySchema,strategyReady,blankStrategy,objectiveFields} from "./lib/strategy";
test("strategy workbook content is complete structurally, with missing information left blank",()=>{
  const d=strategySchema.parse(strategySource);
  assert.equal(d.values.length,7);
  assert.equal(d.objectives.length,5);
  assert.ok(d.objectives.every(o=>o.owner===""&&o.achievable===""));
  assert.equal(d.objectives[2].time_bound,"");
  assert.equal(strategyReady(d),true);
  assert.equal(strategyReady(blankStrategy()),false);
  assert.ok(d.objectives[0].baseline.includes("6,461 (2024)"));
  const changed=structuredClone(d);
  changed.objectives[0].target="";
  assert.equal(strategyReady(changed),false);
  assert.equal(strategySchema.safeParse({...d,objectives:[{title:"Missing required keys"}]}).success,false);
  for(const key of objectiveFields)assert.equal(typeof d.objectives[0][key],"string");
});
