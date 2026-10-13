import { sql } from "drizzle-orm";
import { pgTable, uuid, text, varchar, boolean, timestamp, integer, numeric, jsonb, date, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

const dates = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export const people = pgTable("studio_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authId: varchar("auth_id").unique().references(() => usersTable.id),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ["admin","ttl","editor","viewer"] }).notNull().default("viewer"),
  organization: text("organization").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  invitedBy: uuid("invited_by"),
  ...dates(),
});
export const countries = pgTable("countries", {
  iso3: text("iso3").primaryKey(), name: text("name").notNull(),
  region: text("region").notNull(), currencyCode: text("currency_code").notNull().default("USD"),
  ...dates(),
});
export const phases = pgTable("phases", {
  code: text("code").primaryKey(), name:text("name").notNull(), days:integer("days").notNull(), ...dates(),
});
export const activities = pgTable("activities", {
  code:text("code").primaryKey(), phaseCode:text("phase_code").notNull().references(()=>phases.code),
  name:text("name").notNull(), days:integer("days").notNull(), milestone:text("milestone").notNull().default(""), ...dates(),
});
export const utilities = pgTable("utilities", {
  id:uuid("id").primaryKey().defaultRandom(), name:text("name").notNull(), shortName:text("short_name").notNull().default(""),
  countryIso3:text("country_iso3").notNull().references(()=>countries.iso3), serviceArea:text("service_area").notNull(),
  ttlUserId:uuid("ttl_user_id").notNull().references(()=>people.id), wbProjectId:text("wb_project_id").notNull().default(""),
  logoPath:text("logo_path"), status:text("status",{enum:["active","archived"]}).notNull().default("active"),
  createdBy:uuid("created_by").notNull().references(()=>people.id), ...dates(),
},t=>[uniqueIndex("utility_name_country_unique").on(t.countryIso3,sql`lower(${t.name})`)]);
export const plans = pgTable("business_plans", {
  id:uuid("id").primaryKey().defaultRandom(), utilityId:uuid("utility_id").notNull().references(()=>utilities.id),
  planYear:integer("plan_year").notNull(), currency:text("currency").notNull().default("USD"),
  uofCompletionDate:date("uof_completion_date"), startDate:date("start_date"), targetEndDate:date("target_end_date"),
  status:text("status").notNull().default("not_started"), progress:numeric("progress_pct",{precision:5,scale:2}).notNull().default("0"), ...dates(),
},t=>[uniqueIndex("utility_plan_year_unique").on(t.utilityId,t.planYear)]);
export const planActivities = pgTable("plan_activities", {
  id:uuid("id").primaryKey().defaultRandom(), planId:uuid("plan_id").notNull().references(()=>plans.id),
  activityCode:text("activity_code").notNull().references(()=>activities.code), status:text("status").notNull().default("not_started"),
  ownerUserId:uuid("owner_user_id").references(()=>people.id), dueDate:date("due_date"),
  completedAt:timestamp("completed_at",{withTimezone:true}), approvedBy:uuid("approved_by").references(()=>people.id),
  data:jsonb("data").notNull().default({}), ...dates(),
},t=>[uniqueIndex("plan_activity_unique").on(t.planId,t.activityCode)]);
export const members = pgTable("utility_members", {
  id:uuid("id").primaryKey().defaultRandom(),utilityId:uuid("utility_id").notNull().references(()=>utilities.id),
  userId:uuid("user_id").notNull().references(()=>people.id),memberRole:text("member_role").notNull(), ...dates(),
},t=>[uniqueIndex("utility_member_unique").on(t.utilityId,t.userId)]);
export const requests = pgTable("utility_requests", {
  id:uuid("id").primaryKey().defaultRandom(),requestedBy:uuid("requested_by").notNull().references(()=>people.id),
  countryIso3:text("country_iso3").notNull().references(()=>countries.iso3),utilityName:text("utility_name").notNull(),
  serviceArea:text("service_area").notNull(),planYear:integer("plan_year").notNull(),justification:text("justification").notNull(),
  status:text("status").notNull().default("pending"),decidedBy:uuid("decided_by").references(()=>people.id),decisionNote:text("decision_note"), ...dates(),
});
export const comments = pgTable("comments", {
  id:uuid("id").primaryKey().defaultRandom(),planId:uuid("plan_id").notNull().references(()=>plans.id),
  activityCode:text("activity_code").notNull().references(()=>activities.code),userId:uuid("user_id").notNull().references(()=>people.id),
  body:text("body").notNull(),resolved:boolean("resolved").notNull().default(false), ...dates(),
});
export const audit = pgTable("audit_log", {
  id:uuid("id").primaryKey().defaultRandom(),userId:uuid("user_id").notNull().references(()=>people.id),
  entity:text("entity").notNull(),entityId:text("entity_id").notNull(),action:text("action").notNull(),
  utilityId:uuid("utility_id").references(()=>utilities.id),diff:jsonb("diff").notNull().default({}), ...dates(),
});
export const notifications = pgTable("notifications", {
  id:uuid("id").primaryKey().defaultRandom(),userId:uuid("user_id").notNull().references(()=>people.id),
  title:text("title").notNull(),body:text("body").notNull(),read:boolean("read").notNull().default(false), ...dates(),
});
export const savedViews = pgTable("saved_views", {
  id:uuid("id").primaryKey().defaultRandom(),userId:uuid("user_id").notNull().references(()=>people.id),
  name:text("name").notNull(),filters:jsonb("filters").$type<Record<string,string>>().notNull(), ...dates(),
});
export const uploads = pgTable("uploads", {
  id:uuid("id").primaryKey().defaultRandom(),ownerId:uuid("owner_id").notNull().references(()=>people.id),
  objectPath:text("object_path").notNull().unique(),contentType:text("content_type").notNull(),
  size:integer("size").notNull(),confirmed:boolean("confirmed").notNull().default(false), ...dates(),
  immutablePath:text("immutable_path"),
});
export type StudioPerson = typeof people.$inferSelect;
