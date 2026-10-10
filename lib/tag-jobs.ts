// The tagging job of each item, kept in its own row (inspo_item.tag_status …). Server only.
//
// Adding anything creates the job (the column defaults to "pending") and sends it to the queue (lib/jobs.ts),
// which runs it in its own function. Jobs are claimed under a lock per workspace, so one workspace never runs
// more than PER_WORKSPACE at once: a big import doesn't open 300 browsers, and the rest stay pending. A job
// that finishes sends the workspace's next one, so an import keeps moving PER_WORKSPACE at a time; a failure
// with tries left is delivered again after its pause. The sweep (lib/job-run.ts, every few minutes) sends again
// whatever no job carries: runs lost with their server (older than STALE_MS), messages lost on the way, and
// every item again when TAXONOMY_VERSION changes.
import "server-only";
import { and, desc, eq, gte, inArray, sql, type SQL } from "drizzle-orm";
import { db, schema } from "./db";
import { ITEM_COLUMNS, rowToItem, type ItemRow } from "./items";
import { tagItem } from "./tagger";
import { PROMPTS } from "./prompts";
import { LlmError } from "./llm";
import { embedItems } from "./embed";
import { enqueue, enqueueEmbed } from "./jobs";
import { log, recordFailure } from "./log";
import { assertSeatsOk } from "./quota";
import type { PlanKey } from "./plans";
import { TAXONOMY_VERSION } from "./taxonomy";
import type { InspoTags, TagStatus } from "@/types/inspo";

const T = schema.inspoItem;
type Row = ItemRow;

export const MAX_ATTEMPTS = 3;
/** Jobs one workspace runs at once */
export const PER_WORKSPACE = 5;
/** Longer than the route that runs a job (app/api/queue/jobs, maxDuration 300 s) */
const STALE_MS = 6 * 60 * 1000;
/** A failure waits before its next try, longer each time: a site that is down now may answer later */
const RETRY_AFTER_S = 2 * 60;
export const retryAfterS = (attempts: number) => RETRY_AFTER_S * 4 ** Math.max(attempts - 1, 0);
/** A rate-limited provider is asked again after this */
const THROTTLED_FOR_S = 2 * 60;

/** Rows a run may take: new, failed with tries left (after its pause, retryAfterS), lost mid-run, or tagged with an
 *  older taxonomy. Each branch has an index (inspo_item_tag_status_idx, inspo_item_tags_version_idx), so the
 *  sweep reads the few rows to do, not every row's tags. Never a newer taxonomy: the jobs of the deployment
 *  before keep running a while after a deploy, and would tag back with the old one what the new one tagged. */
const tagsVersion = sql`coalesce((${T.tagsJson}->>'v')::int, 0)`;
const claimable = (): SQL => sql`(
  ${T.tagStatus} = 'pending'
  or (${T.tagStatus} = 'failed' and ${T.tagAttempts} < ${MAX_ATTEMPTS} and ${T.tagStartedAt} < now() - make_interval(secs => ${RETRY_AFTER_S} * power(4, greatest(${T.tagAttempts} - 1, 0))))
  or (${T.tagStatus} = 'running' and ${T.tagStartedAt} < ${new Date(Date.now() - STALE_MS)})
  or (${T.tagStatus} = 'done' and ${tagsVersion} < ${TAXONOMY_VERSION})
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
 * "throttled": the model's provider is rate limiting. That try doesn't count, the job waits THROTTLED_FOR_S,
 * and the workspace's next job waits with it.
 */
async function run(row: Row, userId: string | null): Promise<InspoTags | null | "throttled"> {
  try {
    // The last try goes to another model (claim already counted this one)
    const model = row.tagAttempts >= MAX_ATTEMPTS ? PROMPTS.tag.fallback : undefined;
    // Billed to whoever started it, else to whoever saved the item
    const tags = await tagItem(rowToItem(row), { organizationId: row.organizationId, userId: userId ?? row.createdBy }, model);
    // New tags, new meaning: the vector is made now, or by its own job if this fails
    await db.update(T).set({ tagsJson: tags, tagStatus: "done", tagError: null, embedding: null, updatedAt: new Date() }).where(eq(T.id, row.id));
    await embedItems([row.id]).catch(async (err) => { log.warn("embed.deferred", { ref: row.id, err }); await enqueueEmbed([row.id]); });
    return tags;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const throttled = e instanceof LlmError && e.status === 429;
    // A model failure is already stored by llm(); anything else (the capture, the write) is stored here
    if (!(e instanceof LlmError)) void recordFailure("job", "tag", e, { ref: row.id, organizationId: row.organizationId, userId: userId ?? row.createdBy });
    else log.warn(throttled ? "job.tag.throttled" : "job.tag.failed", { ref: row.id, organizationId: row.organizationId });
    await db.update(T).set({
      tagStatus: "failed", tagError: msg.slice(0, 500),
      ...(throttled ? { tagAttempts: sql`greatest(${T.tagAttempts} - 1, 0)` } : {}),
    }).where(eq(T.id, row.id))
      // The row stays "running" until the sweep takes it as lost (STALE_MS)
      .catch((err) => log.error("job.tag.not_marked", { ref: row.id, err }));
    return throttled ? "throttled" : null;
  }
}

/**
 * One tag job, as the queue delivers it: that item (or the workspace's next one waiting), then the
 * workspace's next one sent on. A full workspace leaves the item pending: one of the jobs filling it sends
 * the next when it ends. A failure with tries left sends its item's own job for after its pause; a throttled
 * provider holds the workspace's line until then. Returns that pause in seconds, or null.
 */
export async function runTagJob(job: { organizationId: string; itemId?: string; userId?: string | null }): Promise<number | null> {
  const row = await claim(job.organizationId, job.itemId);
  if (typeof row === "string") return null;
  const r = await run(row, job.userId ?? null);
  const again = r === "throttled" ? THROTTLED_FOR_S : r === null && row.tagAttempts < MAX_ATTEMPTS ? retryAfterS(row.tagAttempts) + 5 : null;
  if (again !== null) await enqueue({ kind: "tag", organizationId: job.organizationId, itemId: row.id, userId: job.userId }, { delaySeconds: again });
  if (r !== "throttled") await enqueue({ kind: "tag", organizationId: job.organizationId });
  return again;
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

/** Workspaces with jobs to take that may take them: one over its seats gets no AI until it fixes it, as in the app */
export async function openWorkspacesWithJobs(limit: number): Promise<string[]> {
  const found = await db.selectDistinct({ organizationId: T.organizationId, plan: schema.organization.plan }).from(T)
    .innerJoin(schema.organization, eq(schema.organization.id, T.organizationId))
    .where(claimable())
    .limit(limit);
  const open = await Promise.all(found.map((w) =>
    assertSeatsOk({ id: w.organizationId, plan: w.plan as PlanKey }).then(() => w.organizationId, () => null)));
  return open.filter((id): id is string => !!id);
}

/** How the jobs are going, for /api/health/deep. `stalled`: workspaces that may run jobs, with one waiting
 *  longer than STALLED_AFTER_MIN and none started in that time. A long import moving through its line is not
 *  stalled; jobs that stopped running while every page still loads are. */
export const STALLED_AFTER_MIN = 15;
export async function jobStats() {
  const n = (where: SQL) => sql<number>`count(*) filter (where ${where})::int`;
  const [counts] = await db.select({
    pending: n(sql`${T.tagStatus} = 'pending'`),
    running: n(sql`${T.tagStatus} = 'running'`),
    retrying: n(sql`${T.tagStatus} = 'failed' and ${T.tagAttempts} < ${MAX_ATTEMPTS}`),
    failed: n(sql`${T.tagStatus} = 'failed' and ${T.tagAttempts} >= ${MAX_ATTEMPTS}`),
    unembedded: n(sql`${T.embedding} is null and ${T.tagStatus} = 'done'`),
  }).from(T);
  const open = await openWorkspacesWithJobs(100);
  const minutesSince = (at: SQL) => sql<number | null>`extract(epoch from now() - ${at}) / 60`;
  const waiting = open.length ? await db.select({
    oldest: minutesSince(sql`min(coalesce(${T.tagStartedAt}, ${T.createdAt})) filter (where ${claimable()})`),
    lastStarted: minutesSince(sql`max(${T.tagStartedAt})`),
  }).from(T).where(inArray(T.organizationId, open)).groupBy(T.organizationId) : [];
  const stalled = waiting.filter((w) => (w.oldest ?? 0) > STALLED_AFTER_MIN && (w.lastStarted ?? Infinity) > STALLED_AFTER_MIN).length;
  const oldest = Math.max(0, ...waiting.map((w) => Number(w.oldest ?? 0)));
  return { ...counts, oldestWaitingMin: Math.round(oldest), stalled };
}

/** What the client shows for a job that is not done: still gathering, or given up. An item tagged with an
 *  older taxonomy keeps showing those tags while the worker tags it again: that one isn't "gathering". */
export function statusOf(r: { tagStatus: string; tagAttempts: number; tagsJson: InspoTags | null }): TagStatus | null {
  if (r.tagStatus === "done") return null;
  if (r.tagStatus === "failed" && r.tagAttempts >= MAX_ATTEMPTS) return "failed";
  return r.tagStatus === "running" ? "running" : "pending";
}
