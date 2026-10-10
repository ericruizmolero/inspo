// "Why it's here": the highlights a model once drew from the team's words about a reference and its DESIGN.md.
// Nothing builds them any more (the sheet that asked for them is gone); the rows already saved still reach the
// system's prompts through getWhy.
import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import type { DesignWhy } from "@/types/design";

export async function getWhy(organizationId: string, url: string): Promise<{ stamp: string; why: DesignWhy } | null> {
  const [row] = await db.select().from(schema.designWhy)
    .where(and(eq(schema.designWhy.organizationId, organizationId), eq(schema.designWhy.url, url))).limit(1);
  if (!row) return null;
  return { stamp: row.stamp, why: row.whyJson as DesignWhy };
}
