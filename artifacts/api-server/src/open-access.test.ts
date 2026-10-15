import assert from "node:assert/strict";
import { test } from "node:test";
import app from "./app";
import { seedTestIdentity } from "./lib/open-access";
import { pool } from "@workspace/db";

test("open access is opt-in; closed mode ignores preview cookies and restores API protection",async()=>{
  const previous=process.env.OPEN_ACCESS;
  const server=app.listen(0,"127.0.0.1");
  await new Promise<void>(resolve=>server.once("listening",resolve));
  const address=server.address() as {port:number};
  const base=`http://127.0.0.1:${address.port}/api`;
  try{
    for(const flag of [undefined,"false","TRUE","true"]){
      if(flag===undefined)delete process.env.OPEN_ACCESS;else process.env.OPEN_ACCESS=flag;
      const enabled=flag==="true";
      if(enabled)await seedTestIdentity();
      const mode=await fetch(`${base}/test-mode`).then(r=>r.json()) as {openAccess:boolean};
      assert.equal(mode.openAccess,enabled);
      const profile=await fetch(`${base}/profile`,{headers:{Cookie:"studio_test_role=viewer"}});
      assert.equal(profile.status,enabled?200:401);
      if(enabled){
        const data=await profile.json() as {person:{fullName:string;role:string}};
        assert.equal(data.person.fullName,"Test Admin");assert.equal(data.person.role,"viewer");
      }
      for(const path of ["utilities","admin/summary","users","audit","utility-requests","notifications","views"]){
        assert.equal((await fetch(`${base}/${path}`,{headers:{Cookie:"studio_test_role=viewer"}})).status,enabled?200:401,path);
      }
      const absentPlan="00000000-0000-4000-8000-000000000000";
      assert.equal((await fetch(`${base}/plans/${absentPlan}/workflow`)).status,enabled?404:401);
      assert.equal((await fetch(`${base}/plans/${absentPlan}/modules`)).status,enabled?404:401);
      assert.equal((await fetch(`${base}/plans/${absentPlan}/legacy-copy`)).status,enabled?404:401);
       assert.equal((await fetch(`${base}/plans/${absentPlan}/outputs`)).status,enabled?404:401);
       assert.equal((await fetch(`${base}/plans/${absentPlan}/outputs/${absentPlan}/download`)).status,enabled?404:401);
       assert.equal((await fetch(`${base}/plans/${absentPlan}/outputs`,{
         method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({format:"docx"}),
       })).status,enabled?404:401);
      assert.equal((await fetch(`${base}/guidance-library`)).status,enabled?200:401);
      assert.equal((await fetch(`${base}/utilities/${absentPlan}`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirmationName:"Missing utility"})})).status,enabled?404:401);
      assert.equal((await fetch(`${base}/plans/${absentPlan}/activities/A1.1`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"save",updatedAt:new Date().toISOString(),data:{}}),
      })).status,enabled?404:401);
      const switchRole=await fetch(`${base}/test-mode/role`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:"ttl"})});
      assert.equal(switchRole.status,enabled?200:404);
      const auth=await fetch(`${base}/auth/user`).then(r=>r.json()) as {user:unknown};
      assert.equal(Boolean(auth.user),enabled);
    }
    process.env.OPEN_ACCESS="false";
    assert.equal((await fetch(`${base}/profile`,{headers:{Cookie:"studio_test_role=admin"}})).status,401);
  }finally{
    if(previous===undefined)delete process.env.OPEN_ACCESS;else process.env.OPEN_ACCESS=previous;
    await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
    await pool.end();
  }
});
