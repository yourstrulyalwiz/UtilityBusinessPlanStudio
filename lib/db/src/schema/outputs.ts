import { pgTable, uuid, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { plans } from "./studio";

/** Immutable files live in private App Storage; only their metadata is stored here. */
export const planOutputs = pgTable("plan_outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  format: text("format").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  objectPath: text("object_path").notNull(),
  author: text("author").notNull(),
  scenarioCode: text("scenario_code").notNull(),
  scenarioName: text("scenario_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex("plan_output_version_unique").on(t.planId, t.version)]);
