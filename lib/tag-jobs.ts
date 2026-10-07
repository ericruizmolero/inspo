// The tagging job of each item, kept in its own row (inspo_item.tag_status …). Server only.
//
// Adding anything creates the job (the column defaults to "pending") and starts it after the response
// (after(), in the add itself, not in the browser). Jobs are claimed under a lock per workspace, so one
// workspace never runs more than PER_WORKSPACE at once: a big import doesn't open 300 browsers, and the
// rest stay pending. A run that finishes takes the workspace's next pending job (startTagJob), so an
// import keeps moving without waiting; the worker (app/api/cron/tag-pending, once a day) takes the rest:
// failures with tries left, runs lost with their server (older than STALE_MS), and every item again
// when TAXONOMY_VERSION changes.
import "server-only";
import { and, desc, eq, gte, sql, type SQL } from "drizzle-orm";
import { db, schema } from "./db";
import { ITEM_COLUMNS, rowToItem, type ItemRow } from "./items";
import { tagItem, TAG_FALLBACK_MODEL, TAG_MODEL } from "./tagger";
import { LlmError } from "./llm";
import { embedItems } from "./embed";
import { TAXONOMY_VERSION } from "./taxonomy";
import type { InspoTags, TagStatus } from "@/types/inspo";

const T = schema.inspoItem;
type Row = ItemRow;

export const MAX_ATTEMPTS = 3;
/** Jobs one workspace runs at once */
export const PER_WORKSPACE = 5;
/** Longer than the longest route that runs a job (maxDuration 300 s) */
const STALE_MS = 6 * 60 * 1000;
/** A failure waits this long before its next try: a site that is down now may answer later */
const RETRY_AFTER_MS = 2 * 60 * 1000;
/** A run stops taking new jobs this long after it started: the last one still fits in 300 s
 *  (a whole-page capture is capped at 60 s, the model call takes a few) */
export const RUN_BUDGET_MS = 200_000;

/** Rows a run may take: new, failed with tries left (after a pause), lost mid-run, or tagged with another
 *  taxonomy. Each branch has an index (inspo_item_tag_status_idx, inspo_item_tags_version_idx), so the
 *  worker's sweep reads the few rows to do, not every row's tags. The version is written as < or >, not <>:
 *  an index can answer a range and can't answer "not equal". */
const tagsVersion = sql`coalesce((${T.tagsJson}->>'v')::int, 0)`;
const claimable = (): SQL => sql`(
  ${T.tagStatus} = 'pending'
  or (${T.tagStatus} = 'failed' and ${T.tagAttempts} < ${MAX_ATTEMPTS} and ${T.tagStartedAt} < ${new Date(Date.now() - RETRY_AFTER_MS)})
  or (${T.tagStatus} = 'running' and ${T.tagStartedAt} < ${new Date(Date.now() - STALE_MS)})
  or (${T.tagStatus} = 'done' and (${tagsVersion} < ${TAXONOMY_VERSION} or ${tagsVersion} > ${TAXONOMY_VERSION}))
)`;

/**
 * Takes one job of the workspace: that item, or its newest claimable one. "busy" when the workspace already
 * runs PER_WORKSPACE, "none" when there is nothing to take. The lock makes the count and the claim one step.
 */
async function claim(organizationId: string, itemId?: string): Promise<Row | "busy" | "none"> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`tag-jobs:${organizationId}`}))`);
    const [{ running }] = await tx.select({ running: sql<number>`count(*)::int` }).from(T)
      .where(and(eq(T.organizationId, organizationId), eq(T.tagStatus, "running"), gte(T.tagStartedAt, new Date(Date.now() - STALE_MS))));
    if (running >= PER_WORKSPACE) return "busy";
    const id = itemId ?? (await tx.select({ id: T.id }).from(T)
      .where(and(eq(T.organizationId, organizationId), claimable())).orderBy(desc(T.createdAt)).limit(1))[0]?.id;
    if (!id) return "none";
    const [row] = await tx.update(T)
      .set({ tagStatus: "running", tagStartedAt: new Date(), tagAttempts: sql`${T.tagAttempts} + 1`, tagError: null })
      .where(and(eq(T.id, id), eq(T.organizationId, organizationId), claimable()))
      .returning(ITEM_COLUMNS);
    return row ?? "none";
  });
}

/**
 * Tags a claimed row and writes the result. Never throws: a failure is written to the row.
 * "throttled": the model's provider is rate limiting. That try doesn't count, the job waits RETRY_AFTER_MS,
 * and whoever is running jobs should stop taking more for now.
 */
async function run(row: Row, userId: string | null): Promise<InspoTags | null | "throttled"> {
  try {
    // The last try goes to another model (claim already counted this one)
    const model = row.tagAttempts >= MAX_ATTEMPTS ? TAG_FALLBACK_MODEL : TAG_MODEL;
    // Billed to whoever started it, else to whoever saved the item
    const tags = await tagItem(rowToItem(row), { organizationId: row.organizationId, userId: userId ?? row.createdBy }, model);
    // New tags, new meaning: the vector is made now, or by the worker if this fails
    await db.update(T).set({ tagsJson: tags, tagStatus: "done", tagError: null, embedding: null, updatedAt: new Date() }).where(eq(T.id, row.id));
    await embedItems([row.id]).catch((e) => console.warn("embed: left for the worker", row.web, e instanceof Error ? e.message : e));
    (await import("./jev")).clearSearchCache();
    return tags;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const throttled = e instanceof LlmError && e.status === 429;
    console.error(`tag job: ${throttled ? "rate limited" : "failed"}`, row.web, msg);
    await db.update(T).set({
      tagStatus: "failed", tagError: msg.slice(0, 500),
      ...(throttled ? { tagAttempts: sql`greatest(${T.tagAttempts} - 1, 0)` } : {}),
    }).where(eq(T.id, row.id)).catch(() => {});
    return throttled ? "throttled" : null;
  }
}

/** Runs the workspace's next job: "none" when it has nothing left, "busy" when it has no room right now,
 *  "throttled" when the model's provider asks to slow down */
export async function runNextJob(organizationId: string): Promise<"done" | "failed" | "none" | "busy" | "throttled"> {
  const row = await claim(organizationId);
  if (typeof row === "string") return row;
  const r = await run(row, null);
  return r === "throttled" ? r : r ? "done" : "failed";
}

/**
 * What an add (or "try again") starts after answering: this item's job, then the workspace's next pending
 * ones until the run's budget is spent. With the workspace full, it leaves the item pending: a run
 * already going, or the worker, takes it.
 */
export async function startTagJob(organizationId: string, itemId: string, userId: string | null): Promise<void> {
  const deadline = Date.now() + RUN_BUDGET_MS;
  const row = await claim(organizationId, itemId);
  if (typeof row !== "string" && (await run(row, userId)) === "throttled") return;
  // A full workspace is already being worked through by the runs that filled it; a throttled provider waits
  while (Date.now() < deadline) {
    const r = await runNextJob(organizationId);
    if (r === "none" || r === "busy" || r === "throttled") break;
  }
}

/** Puts a job back in line with its tries reset (the "try again" button). Returns the item id, or null.
 *  By the exact address the library holds: an old row's web_key may not match today's webKeyOf. */
export async function resetTagJob(organizationId: string, web: string): Promise<string | null> {
  const [row] = await db.update(T).set({ tagStatus: "pending", tagAttempts: 0, tagError: null })
    // Ten minutes between two runs of the same card: each one is a vision model call
    .where(and(eq(T.organizationId, organizationId), eq(T.web, web), sql`${T.tagStatus} <> 'running'`,
      sql`(${T.tagStartedAt} is null or ${T.tagStartedAt} < now() - interval '10 minutes')`))
    .returning({ id: T.id });
  return row?.id ?? null;
}

/** Workspaces with jobs to take, with their plan for the seats check */
export async function workspacesWithJobs(limit: number) {
  return db.selectDistinct({ organizationId: T.organizationId, plan: schema.organization.plan }).from(T)
    .innerJoin(schema.organization, eq(schema.organization.id, T.organizationId))
    .where(claimable())
    .limit(limit);
}

/** What the client shows for a job that is not done: still gathering, or given up. An item tagged with an
 *  older taxonomy keeps showing those tags while the worker tags it again: that one isn't "gathering". */
export function statusOf(r: { tagStatus: string; tagAttempts: number; tagsJson: InspoTags | null }): TagStatus | null {
  if (r.tagStatus === "done") return null;
  if (r.tagStatus === "failed" && r.tagAttempts >= MAX_ATTEMPTS) return "failed";
  return r.tagStatus === "running" ? "running" : "pending";
}
