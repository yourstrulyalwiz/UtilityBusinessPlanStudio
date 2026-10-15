import { pgTable, uuid, integer, text, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { plans } from "./studio";

export const modulePlans = pgTable("module_plans", {
  planId: uuid("plan_id").primaryKey().references(()=>plans.id),
  source: text("source").notNull(),
  kind: text("kind").notNull(),
  context: jsonb("context").$type<Record<string,unknown>>().notNull().default({}),
  scenarios: jsonb("scenarios").$type<unknown[]>().notNull().default([]),
  createdAt: timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
});
export const planModules = pgTable("plan_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(()=>plans.id),
  number: integer("number").notNull(),
  status: text("status").notNull().default("not_started"),
  data: jsonb("data").$type<Record<string,unknown>>().notNull().default({}),
  feedback: text("feedback").notNull().default(""),
  updatedAt: timestamp("updated_at",{withTimezone:true}).notNull().defaultNow(),
},t=>[uniqueIndex("plan_module_number_unique").on(t.planId,t.number)]);
export const legacyPlanCopies = pgTable("legacy_plan_copies", {
  planId: uuid("plan_id").primaryKey().references(()=>plans.id),
  snapshot: jsonb("snapshot").$type<Record<string,unknown>>().notNull(),
  createdAt: timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
});
export const guidanceTopics = pgTable("guidance_topics", {
  id: text("id").primaryKey(),
  module: integer("module").notNull(),
  data: jsonb("data").$type<Record<string,unknown>>().notNull(),
  updatedAt: timestamp("updated_at",{withTimezone:true}).notNull().defaultNow(),
});
