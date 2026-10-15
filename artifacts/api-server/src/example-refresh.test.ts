import {test} from "node:test";
import assert from "node:assert/strict";
import {exampleBaseline} from "./lib/example-refresh";
import {evaluateBaseline} from "@workspace/baseline";
test("example baseline uses supplied Valle Verde values without borrowing TCWS data",()=>{
 const b=exampleBaseline();
 assert.equal(b.variables.v10,124800);
 assert.equal(b.referenceYear,2025);
 assert.equal(b.variables.v15,48400000);
 assert.equal(b.variables.v16,27588000);
 assert.equal(b.variables.v11,null);
 assert.equal(evaluateBaseline(b).valid,true);
});
