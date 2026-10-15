import {test} from "node:test";
import assert from "node:assert/strict";
import {stageProgress,workflowProgress} from "./lib/workflow-progress";
test("workflow stages and eight-module denominator are explicit",()=>{
 assert.equal(stageProgress("not_started"),0);
 assert.equal(stageProgress("in_progress"),50);
 assert.equal(stageProgress("ready_for_review"),75);
 assert.equal(stageProgress("approved"),100);
 assert.equal(workflowProgress([]),0);
 assert.equal(workflowProgress([{status:"approved"}]),12.5);
 assert.equal(workflowProgress(Array.from({length:8},()=>({status:"in_progress"}))),50);
 assert.equal(workflowProgress(Array.from({length:8},()=>({status:"approved"}))),100);
});
