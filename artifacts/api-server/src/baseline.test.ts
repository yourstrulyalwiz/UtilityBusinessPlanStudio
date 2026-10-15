import {test} from "node:test";
import assert from "node:assert/strict";
import {createBaseline,evaluateBaseline,workbook,levelFor} from "@workspace/baseline";
test("all 22 indicators reproduce the workbook cached results and levels",()=>{
  const d=createBaseline(true),r=evaluateBaseline(d);
  assert.equal(d.variables.v10,6461);
  assert.equal(r.valid,true);
  for(const i of r.indicators){
    if(typeof i.cachedValue==="number")assert.ok(Math.abs(i.value!-i.cachedValue)<1e-8,`${i.name}: ${i.value} vs ${i.cachedValue}`);
    else assert.equal(i.value,null,i.name);
    assert.equal(i.level,typeof i.cachedLevel==="number"?i.cachedLevel:null,i.name);
    if(i.direction)for(let j=0;j<4;j++)assert.equal(levelFor(Number(i.thresholds[j]),i),j+2,i.name);
  }
});
test("missing stays missing, invalid physical ratios have no levels; financial coverage and negative margin are valid",()=>{
  const empty=evaluateBaseline(createBaseline());
  assert.ok(empty.indicators.every(i=>i.value===null&&i.level===null));
  const d=createBaseline(true);
  d.variables.v11=7000;
  let r=evaluateBaseline(d);
  assert.equal(r.valid,false);assert.equal(r.indicators.find(i=>i.id==="i17")!.level,null);
  d.variables.v11=null;d.variables.v35=d.variables.v38!*2;
  r=evaluateBaseline(d);
  assert.equal(r.valid,true);assert.equal(r.indicators.find(i=>i.id==="i23")!.value,2);
  d.variables.v19=25;assert.equal(evaluateBaseline(d).valid,false);
  d.variables.v19=23;d.variables.v20=1.5;assert.equal(evaluateBaseline(d).valid,false);
  d.variables.v20=null;d.variables.v10=0;
  assert.ok(evaluateBaseline(d).issues.length>0);
});
