import {test} from "node:test";
import assert from "node:assert/strict";
import {assessmentSchema,assessmentSource,assessmentReady,blankAssessment} from "./lib/assessment";
test("assessment import retains exact content counts and no source fields",()=>{
  const d=assessmentSchema.parse(assessmentSource);
  assert.equal(d.areas.length,8);
  assert.equal(d.messages.length,7);
  assert.deepEqual(["strengths","weaknesses","opportunities","threats"].map(k=>(d.swot[k] as unknown[]).length),[10,17,7,7]);
  assert.ok(d.review_notes.includes("27%")&&d.review_notes.includes("24%"));
  assert.ok(!JSON.stringify(d).includes('"source"'));
  assert.equal(assessmentReady(d),true);
  assert.equal(assessmentReady(blankAssessment()),false);
  const duplicate=structuredClone(d);duplicate.areas[1].id=duplicate.areas[0].id;
  assert.equal(assessmentSchema.safeParse(duplicate).success,false);
  const missing=structuredClone(d);missing.areas[0].status="Not assessed";
  assert.equal(assessmentReady(missing),false);
});
