// The references a template brings (lib/template-seed.ts): the sample project's board. They are Criterio's, not the
// workspace's, so the plan's cap on references leaves them out.
import { sql, type SQL } from "drizzle-orm";
import { schema } from "./db";

/** Who "saved" a template's references: nobody of the workspace. They are the template's until a project is cloned from it */
export const TEMPLATE_AUTHOR = "Criterio";

/** True for a reference a template brought: signed by Criterio and still on a template's board. Cloning a template
 *  files the same reference in the new project too, so it stays a sample. The board check keeps a person who names
 *  themself "Criterio" from saving references that never count */
export function isSampleItem(): SQL {
  const T = schema.inspoItem, PI = schema.projectItem, P = schema.project;
  return sql`(${T.author} = ${TEMPLATE_AUTHOR} and exists (
    select 1 from ${PI} join ${P} on ${P.id} = ${PI.projectId} and ${P.template} is not null where ${PI.itemId} = ${T.id}))`;
}
