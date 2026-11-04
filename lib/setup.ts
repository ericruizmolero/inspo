// What lib/setup-core.ts reads, from the rows the app already writes. Server only.
import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { readBrief } from "@/types/brief";
import { getSystem } from "./system/areas";
import { brandBrought, type SetupFacts } from "./setup-core";

const P = schema.project, PI = schema.projectItem;

export async function setupFacts(organizationId: string, projectId: string): Promise<SetupFacts> {
  const [[row], refs, system] = await Promise.all([
    db.select({ brief: P.brief }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1),
    db.select({ id: PI.itemId }).from(PI).where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId))),
    getSystem(organizationId, projectId),
  ]);
  const brief = readBrief(row?.brief);
  const brand = !!brief?.clientItemId || brandBrought(system.brand);
  return { project: !!row, brief, brand, refs: refs.length, pass: !!system.run, picked: false, built: false };
}
