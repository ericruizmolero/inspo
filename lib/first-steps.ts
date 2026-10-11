// The first steps of one person in one workspace, read from what the app already stores (lib/first-steps-core.ts
// has the steps). Server only.
import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { isSampleItem } from "./sample-items";
import { nextStep, type FirstSteps } from "./first-steps-core";

const P = schema.project, PI = schema.projectItem, T = schema.inspoItem, S = schema.projectSystem;

/** Where the person is along the path, or null once they hid it or walked it. Walking it hides it for good, so
 *  a project deleted afterwards does not bring the list back */
export async function firstSteps(userId: string, organizationId: string): Promise<FirstSteps | null> {
  const U = schema.user;
  const [u] = await db.select({ doneAt: U.firstStepsDoneAt }).from(U).where(eq(U.id, userId)).limit(1);
  if (!u || u.doneAt) return null;

  // Raw SQL with aliases: in a one-table select Drizzle leaves column names unqualified, and these subqueries
  // name the same columns on several tables
  const [[project], [signals]] = await Promise.all([
    db.execute<{ id: string; refs: number; brief: boolean; system: boolean }>(sql`select p.id,
      (select count(*)::int from ${PI} pi join ${T} on ${T.id} = pi.item_id where pi.project_id = p.id and not ${isSampleItem()}) as refs,
      coalesce(trim(p.brief->>'about'), '') <> '' as brief,
      -- A project cloned from an example arrives with the example's run: that is not a pass of its own
      exists (select 1 from ${S} s where s.project_id = p.id and s.run_json is not null and s.run_json->>'model' is distinct from 'template') as system
      from ${P} p where p.organization_id = ${organizationId} and p.template is null
      order by refs desc, p.created_at limit 1`).then((r) => r.rows),
    db.execute<{ example: boolean; out: boolean }>(sql`select
      exists (select 1 from ${schema.activitySegment} a where a.user_id = ${userId} and a.area = 'example') as example,
      (exists (select 1 from ${S} s where s.organization_id = ${organizationId} and s.exported_at is not null)
        or exists (select 1 from ${schema.systemShare} sh where sh.organization_id = ${organizationId})
        or exists (select 1 from ${schema.mcpGrant} g where g.user_id = ${userId} and g.code_used_at is not null)) as out`).then((r) => r.rows),
  ]);

  const steps: FirstSteps = {
    example: !!signals?.example, out: !!signals?.out,
    project: project?.id ?? null, brief: !!project?.brief, refs: Number(project?.refs ?? 0), system: !!project?.system,
  };
  if (nextStep(steps) === null) {
    await hideFirstSteps(userId);
    return null;
  }
  return steps;
}

export async function hideFirstSteps(userId: string): Promise<void> {
  const U = schema.user;
  await db.update(U).set({ firstStepsDoneAt: new Date() }).where(and(eq(U.id, userId), isNull(U.firstStepsDoneAt)));
}

/** criterio.md was copied or downloaded: the first time is kept, the rest change nothing */
export async function markExported(organizationId: string, projectId: string): Promise<void> {
  await db.update(S).set({ exportedAt: new Date() })
    .where(and(eq(S.organizationId, organizationId), eq(S.projectId, projectId), isNull(S.exportedAt)));
}
