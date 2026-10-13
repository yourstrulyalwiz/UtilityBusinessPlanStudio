import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { db, uploads } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import * as api from "@workspace/api-zod";
import { actor, HttpError, utilityRows } from "../lib/studio";
import { ObjectStorageService, objectStorageClient } from "../lib/objectStorage";
const router:IRouter=Router();
const storage=new ObjectStorageService();
router.post("/storage/uploads/request-url",async(req,res)=>{
  const p=await actor(req,["admin"]);const data=api.RequestUploadUrlBody.parse(req.body);
  const uploadURL=await storage.getObjectEntityUploadURL();const objectPath=storage.normalizeObjectEntityPath(uploadURL);
  await db.insert(uploads).values({ownerId:p.id,objectPath,contentType:data.contentType,size:data.size});
  res.json(api.RequestUploadUrlResponse.parse({uploadURL,objectPath}));
});
router.post("/storage/uploads/confirm",async(req,res)=>{
  const p=await actor(req,["admin"]);const {objectPath}=api.ConfirmUploadBody.parse(req.body);
  const [record]=await db.select().from(uploads).where(and(eq(uploads.objectPath,objectPath),eq(uploads.ownerId,p.id)));
  if(!record)throw new HttpError(404,"Upload not found.");
  if(record.confirmed){res.json({success:true});return;}
  const file=await storage.getObjectEntityFile(objectPath);
  const chunks:Buffer[]=[];let size=0;
  for await(const raw of file.createReadStream()){
    const chunk=Buffer.from(raw);size+=chunk.length;
    if(size>2097152)throw new HttpError(400,"Logo must not exceed 2 MB.");
    chunks.push(chunk);
  }
  let buffer=Buffer.concat(chunks);
  if(size!==record.size)throw new HttpError(400,"Uploaded file size does not match.");
  if(record.contentType==="image/png"){
    if(!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new HttpError(400,"Invalid PNG image.");
  }else{
    const text=buffer.toString("utf8");
    if(!/<svg[\s>]/i.test(text))throw new HttpError(400,"Invalid SVG image.");
    const clean=sanitizeHtml(text,{
      allowedTags:["svg","g","path","circle","ellipse","rect","line","polyline","polygon","title","desc"],
      allowedAttributes:{"*":["xmlns","viewBox","width","height","fill","stroke","stroke-width","stroke-linecap","stroke-linejoin","d","cx","cy","r","rx","ry","x","y","x1","x2","y1","y2","points","transform","opacity","fill-rule","clip-rule"]},
      parser:{lowerCaseTags:false,lowerCaseAttributeNames:false},
      allowedSchemes:[],
    });
    if(/url\s*\(/i.test(clean))throw new HttpError(400,"SVG external resources are not supported.");
    buffer=Buffer.from(clean);
  }
  const privatePath=storage.getPrivateObjectDir().replace(/^\/|\/$/g,"");
  const [bucket,...prefix]=privatePath.split("/");
  const suffix=`validated/${randomUUID()}`;
  await objectStorageClient.bucket(bucket).file([...prefix,suffix].join("/")).save(buffer,{contentType:record.contentType,resumable:false});
  await db.update(uploads).set({confirmed:true,immutablePath:`/objects/${suffix}`}).where(eq(uploads.id,record.id));
  res.json({success:true});
});
router.get("/storage/objects/{*path}",async(req,res)=>{
  const p=await actor(req);
  const path="/objects/"+(Array.isArray(req.params.path)?req.params.path.join("/"):req.params.path);
  const [record]=await db.select().from(uploads).where(and(eq(uploads.objectPath,path),eq(uploads.confirmed,true)));
  if(!record?.immutablePath)throw new HttpError(404,"Logo not found.");
  if(p.role!=="admin"&&record.ownerId!==p.id&&!(await utilityRows(p)).some(u=>u.logoPath===path))throw new HttpError(403,"Logo access denied.");
  const file=await storage.getObjectEntityFile(record.immutablePath);
  res.setHeader("Content-Security-Policy","default-src 'none'; sandbox");
  res.type(record.contentType);
  const stream=file.createReadStream();stream.on("error",()=>res.destroy());stream.pipe(res);
});
export default router;
