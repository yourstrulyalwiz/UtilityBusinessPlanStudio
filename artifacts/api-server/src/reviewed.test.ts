import {test} from "node:test";
import assert from "node:assert/strict";
import data from "./lib/tcws-reviewed.json";
import {evaluateBaseline} from "@workspace/baseline";
import {baselineSchema} from "./lib/baseline-validation";
test("reviewed baseline retains sourced periods and missing billings",()=>{
 const parsed=baselineSchema.parse(data.module1);
 assert.equal(parsed.variables.v15,3049028);
 assert.equal(parsed.variables.v16,1833134);
 assert.equal(parsed.variables.v13,6393);
 assert.equal(parsed.variables.v36,null);
 assert.equal(evaluateBaseline(parsed).valid,true);
 assert.equal(data.scenarios.length,3);
 assert.equal(data.module8.data_review.length,19);
 const nrw=data.module1.history.filter(h=>h.metric==="Non-revenue water (NRW)");
 assert.ok(Math.abs(nrw.find(h=>h.year===2024)!.value!-39.9)<1e-9);
 assert.ok(nrw.some(h=>typeof h.year==="string"&&h.year.includes("Jan")));
 assert.ok(Array.isArray(parsed.history));
});
