import { Router, type IRouter } from "express";
import PptxGenJS from "pptxgenjs";
import { db, plans } from "@workspace/db";
import { eq } from "drizzle-orm";
import { actor, accessibleUtility, utilityRows, uuid, HttpError, writeAudit } from "../lib/studio";

const router:IRouter=Router();
router.get("/plans/:id/deck",async(req,res)=>{
  const p=await actor(req);
  const [plan]=await db.select().from(plans).where(eq(plans.id,uuid(req.params.id)));
  if(!plan)throw new HttpError(404,"Plan not found.");
  await accessibleUtility(p,plan.utilityId);
  const u=(await utilityRows(p)).find(u=>u.planId===plan.id);
  if(!u)throw new HttpError(404,"Plan not found.");
  const deck=new PptxGenJS();
  deck.layout="LAYOUT_WIDE";
  deck.author="Urban Water and Sanitation Service Optimization - Digital Transformation - Business Plan Studio";
  deck.subject="Step 0 draft export — registry information only";
  deck.title=`${u.name} — draft plan overview`;
  deck.theme={headFontFace:"Aptos Display",bodyFontFace:"Aptos"};
  const slide=deck.addSlide();
  slide.background={color:"F6F8FB"};
  slide.addText("DRAFT · STEP 0 PREVIEW",{x:.65,y:.5,w:12,h:.4,fontSize:14,color:"009FDA",bold:true});
  slide.addText(u.name,{x:.65,y:1.25,w:12,h:1.2,fontSize:32,color:"002244",bold:true,breakLine:false});
  slide.addText([
    `${u.countryName} · ${u.serviceArea}`,
    `Business Plan ${u.planYear} · Currency: ${u.currency}`,
    `Task Team Leader: ${u.ttlName}`,
    `Plan status: ${u.planStatus.replaceAll("_"," ")} · Progress: ${u.progress}%`,
  ].join("\n"),{x:.65,y:2.75,w:12,h:2,fontSize:20,color:"002244",paraSpaceAfter:14});
  slide.addText("This is a registry-only preview. The complete business-plan deck is not implemented yet.",{x:.65,y:5.3,w:12,h:.7,fontSize:17,color:"5B6573"});
  slide.addText("Source: Utility registry (user-entered data)",{x:.65,y:6.65,w:12,h:.3,fontSize:11,color:"5B6573"});
  const output=await deck.write({outputType:"nodebuffer"});
  await db.transaction(tx=>writeAudit(tx,p,"Downloaded draft plan deck","plan",plan.id,{},u.id));
  res.setHeader("Content-Disposition",`attachment; filename="business-plan-${u.planYear}-draft.pptx"`);
  res.type("application/vnd.openxmlformats-officedocument.presentationml.presentation").send(output);
});
export default router;
