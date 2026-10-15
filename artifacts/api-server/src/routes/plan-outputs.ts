import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { db, plans, planOutputs, uploads } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { actor, accessibleUtility, utilityRows, uuid, HttpError, writeAudit } from "../lib/studio";
import { moduleWorkflow } from "../lib/module-workflow";
import { ObjectStorageService, objectStorageClient } from "../lib/objectStorage";
import { generateOutput, pdfAvailable } from "../lib/outputs";

const router: IRouter = Router();
const storage = new ObjectStorageService();
const requestSchema = z.object({ format: z.enum(["docx", "pdf", "pptx"]), scenarioCode: z.string().max(200).optional() });
const dto = (o: typeof planOutputs.$inferSelect) => ({
  id: o.id, version: o.version, format: o.format, filename: o.filename,
  createdAt: o.createdAt.toISOString(), author: o.author,
  scenarioCode: o.scenarioCode, scenarioName: o.scenarioName,
});
async function permitted(req: Parameters<typeof actor>[0]) {
  const person = await actor(req);
  const id = uuid(req.params.id);
  const [plan] = await db.select().from(plans).where(eq(plans.id, id));
  if (!plan) throw new HttpError(404, "Plan not found.");
  const utility = await accessibleUtility(person, plan.utilityId);
  return { person, id, utility };
}
router.get("/plans/:id/outputs", async (req, res) => {
  const { id } = await permitted(req);
  const rows = await db.select().from(planOutputs).where(eq(planOutputs.planId, id)).orderBy(desc(planOutputs.version));
  res.json({ outputs: rows.map(dto), pdfAvailable: await pdfAvailable() });
});
router.post("/plans/:id/outputs", async (req, res) => {
  await actor(req, ["admin", "ttl", "editor"]);
  const { person, id, utility } = await permitted(req);
  if (utility.status === "archived") throw new HttpError(409, "Restore this utility before generating outputs.");
  const input = requestSchema.parse(req.body);
  if (input.format === "pdf" && !(await pdfAvailable())) throw new HttpError(503, "PDF conversion is unavailable. Download the editable Word document instead.");
  let stored: ReturnType<ReturnType<typeof objectStorageClient.bucket>["file"]> | undefined;
  try {
    const output = await db.transaction(async tx => {
      // The plan lock serializes exports and module saves, so each version is a consistent snapshot.
      const [locked] = await tx.select().from(plans).where(eq(plans.id, id)).for("update");
      if (!locked) throw new HttpError(404, "Plan not found.");
      const workflow = await moduleWorkflow(person, id);
      const utilityRow = (await utilityRows(person)).find(u => u.planId === id);
      if (!utilityRow) throw new HttpError(404, "Plan not found.");
      const scenarios = workflow.scenarios as Array<Record<string, unknown>>;
      const scenario = input.scenarioCode
        ? scenarios.find(s => s.code === input.scenarioCode)
        : scenarios.find(s => s.is_primary === true || s.primary === true || s.isPrimary === true) ?? scenarios.find(s => s.type === "base") ?? scenarios[0];
      if (!scenario) throw new HttpError(400, "Select an existing plan scenario.");
      const [latest] = await tx.select().from(planOutputs).where(eq(planOutputs.planId, id)).orderBy(desc(planOutputs.version)).limit(1);
      const version = (latest?.version ?? 0) + 1;
      const createdAt = new Date();
      // Logos must be validated uploads belonging to this utility, never arbitrary remote URLs.
      let utilityLogo: { buffer: Buffer; mime: string } | undefined;
      if (utility.logoPath) {
        const [logo] = await tx.select().from(uploads).where(and(eq(uploads.objectPath, utility.logoPath), eq(uploads.confirmed, true)));
        if (logo?.immutablePath) {
          const file = await storage.getObjectEntityFile(logo.immutablePath);
          const [buffer] = await file.download();
          utilityLogo = { buffer, mime: logo.contentType };
        }
      }
      const generated = await generateOutput({
        format: input.format, workflow, utility: { ...utilityRow, utilityLogo }, scenario,
        version, author: person.fullName, date: createdAt.toISOString(),
      });
      const objectId = randomUUID();
      const suffix = `outputs/${id}/${objectId}.${input.format}`;
      const [bucket, ...prefix] = storage.getPrivateObjectDir().replace(/^\/|\/$/g, "").split("/");
      stored = objectStorageClient.bucket(bucket).file([...prefix, suffix].join("/"));
      await stored.save(generated.buffer, { resumable: false, contentType: generated.mime });
      const [row] = await tx.insert(planOutputs).values({
        id: objectId, planId: id, version, format: input.format, filename: generated.filename,
        mime: generated.mime, objectPath: `/objects/${suffix}`, author: person.fullName,
        scenarioCode: String(scenario.code), scenarioName: String(scenario.name), createdAt,
      }).returning();
      await writeAudit(tx, person, "Generated business plan output", "plan", id, { outputId: row.id, version, format: input.format, scenarioCode: row.scenarioCode }, utility.id);
      return row;
    });
    res.status(201).json(dto(output));
  } catch (error) {
    if (stored) await stored.delete({ ignoreNotFound: true }).catch(() => {});
    throw error;
  }
});
router.get("/plans/:id/outputs/:outputId/download", async (req, res) => {
  const { id } = await permitted(req);
  const [output] = await db.select().from(planOutputs).where(and(eq(planOutputs.planId, id), eq(planOutputs.id, uuid(req.params.outputId))));
  if (!output) throw new HttpError(404, "Output not found.");
  const file = await storage.getObjectEntityFile(output.objectPath);
  res.setHeader("Content-Disposition", `attachment; filename="${output.filename.replace(/["\r\n]/g, "_")}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.type(output.mime);
  const stream = file.createReadStream();
  stream.on("error", () => res.destroy());
  stream.pipe(res);
});
export default router;
