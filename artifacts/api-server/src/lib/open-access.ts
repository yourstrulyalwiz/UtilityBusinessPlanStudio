import { db, people } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request } from "express";

export const TEST_ADMIN_ID = "00000000-0000-4000-8000-000000000001";
export function openAccessEnabled() { return process.env.OPEN_ACCESS === "true"; }
export function previewRole(req: Pick<Request, "cookies">) {
  const role=req.cookies?.studio_test_role;
  return ["admin","ttl","editor","viewer"].includes(role) ? role as "admin"|"ttl"|"editor"|"viewer" : "admin";
}
export async function seedTestIdentity() {
  if(!openAccessEnabled())return;
  // Store no real administrative grant: normal mode must not inherit test privileges.
  await db.insert(people).values({id:TEST_ADMIN_ID,fullName:"Test Admin",email:"test-admin@invalid.local",role:"viewer",organization:"Open-access testing",isActive:false}).onConflictDoNothing();
}
export async function testActor() {
  const [person]=await db.select().from(people).where(eq(people.id,TEST_ADMIN_ID));
  if(!person)throw new Error("Test identity has not been initialized.");
  return {...person,role:"admin" as const,isActive:true};
}
