import { Router } from "express";
import { openAccessEnabled, previewRole } from "../lib/open-access";
const router=Router();
router.get(["/login","/logout","/callback"],(_req,res,next)=>{
  if(!openAccessEnabled()){next();return;}
  res.redirect("/");
});
router.get("/test-mode", (req,res)=>res.json({openAccess:openAccessEnabled(),role:openAccessEnabled()?previewRole(req):null}));
router.post("/test-mode/role",(req,res)=>{
  if(!openAccessEnabled()){res.status(404).json({error:"Not found"});return;}
  const role=req.body?.role;
  if(!["admin","ttl","editor","viewer"].includes(role)){res.status(400).json({error:"Invalid role"});return;}
  res.cookie("studio_test_role",role,{httpOnly:true,sameSite:"lax",secure:req.secure,path:"/"});
  res.json({success:true});
});
export default router;
