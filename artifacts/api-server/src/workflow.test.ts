import assert from "node:assert/strict";
import { test } from "node:test";
import { activitySeed, progressOf } from "./lib/playbook";
import { activityGuide, hasContent, schemaForExample } from "./lib/activity-guide";
import { blockedReason, examples } from "./lib/workflow";
import { tagExamples, tagGuide, tagStatus, tagContext } from "./lib/tagbilaran";

test("TCWS import retains its own form structure, source states and indicator definitions",()=>{
  assert.equal(Object.keys(tagExamples).length,20);
  for(const a of activitySeed){
    schemaForExample(tagExamples[a.code]).parse(tagExamples[a.code]);
    for(const key of tagGuide(a.code).required)assert.ok(key in tagExamples[a.code],`${a.code}.${key}`);
  }
  assert.equal(activitySeed.filter(a=>tagStatus(a.code)==="submitted").length,7);
  assert.equal(activitySeed.filter(a=>tagStatus(a.code)==="in_progress").length,3);
  assert.equal(activitySeed.filter(a=>tagStatus(a.code)==="not_started").length,10);
  assert.equal(tagContext.catalog.indicators.length,19);
  assert.equal(tagContext.catalog.indicators.filter(i=>i.kpi).length,12);
  assert.equal(tagContext.catalog.optional_indicators_disabled_by_default.length,6);
  assert.equal(hasContent({value:null,gap_note:"Missing source information"}),false);
});

test("all supplied examples have a form guide, correct field types and required content",()=>{
  assert.equal(activitySeed.length,20);
  for(const a of activitySeed){
    const example=examples[a.code];
    assert.ok(example,a.code);
    schemaForExample(example).parse(example);
    for(const key of activityGuide[a.code].required)assert.ok(hasContent(example[key]),`${a.code}.${key}`);
  }
});
test("sequential and phase gates re-lock downstream steps after returns",()=>{
  const rows=activitySeed.map(a=>({activityCode:a.code,status:"not_started"}));
  assert.equal(blockedReason("A1.1",rows),"");
  assert.match(blockedReason("A1.2",rows),/A1.1/);
  rows[0].status="submitted";
  assert.equal(blockedReason("A1.2",rows),"");
  for(const row of rows)row.status="submitted";
  assert.equal(blockedReason("A2.2",rows),"");
  rows[0].status="in_progress";
  assert.match(blockedReason("A2.2",rows),/A1.1/);
});
test("progress is day-weighted and preserves the uploaded midway definition",()=>{
  assert.equal(activitySeed.reduce((sum,a)=>sum+a.days,0),108);
  assert.equal(progressOf(activitySeed.map(a=>({...a,status:"approved"}))),100);
  const midway=activitySeed.map(a=>({...a,status:a.phaseCode==="P1"?"approved":
    ["A2.1","A2.2","A2.3"].includes(a.code)?"submitted":a.code==="A2.4"?"in_progress":"not_started"}));
  assert.equal(progressOf(midway),38.19);
  assert.equal(hasContent({nested:["",null]}),false);
  assert.equal(hasContent(0),true);
});
