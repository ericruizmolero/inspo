// The first run's place (lib/welcome-core.ts), kept on the person's row. Server only.
import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db, schema } from "./db";
import { resumeStep, type WelcomeAt, type WelcomeStep } from "./welcome-core";

/** Welcome under way for this person, with the project it made in this workspace; null when it is not */
export async function welcomeAt(userId: string, organizationId: string): Promise<WelcomeAt | null> {
  const U = schema.user, P = schema.project;
  const [u] = await db.select({ step: U.welcomeStep }).from(U).where(eq(U.id, userId)).limit(1);
  if (!u?.step) return null;
  // Welcome starts only with no project, so the first one this person made, never an example, is the one it made
  // (or the one a board pasted at its first reference brought)
  const [p] = await db.select({ id: P.id }).from(P)
    .where(and(eq(P.organizationId, organizationId), eq(P.createdBy, userId), isNull(P.template), isNull(P.fromTemplate)))
    .orderBy(asc(P.createdAt)).limit(1);
  return { step: resumeStep(u.step, !!p), project: p?.id ?? null };
}

/** The step reached, or null when Welcome ends */
export async function setWelcomeStep(userId: string, step: WelcomeStep | null): Promise<void> {
  await db.update(schema.user).set({ welcomeStep: step }).where(eq(schema.user.id, userId));
}
