// What each job does when the queue delivers it (lib/jobs.ts). Server only.
import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { taggerEnabled } from "./tagger";
import { embedItems } from "./embed";
import { getOrCaptureShot } from "./screenshot";
import { QueueFull } from "./browser-gate";
import { openWorkspacesWithJobs, PER_WORKSPACE, runTagJob } from "./tag-jobs";
import { enqueue, enqueueEmbed, scheduleSweep, EMBED_BATCH, type Job } from "./jobs";

const T = schema.inspoItem;

/** Thrown to have the same job delivered again after `seconds` */
export class RetryLater extends Error {
  constructor(readonly seconds: number) { super(`retry in ${seconds} s`); }
}

/** Workspaces the sweep sends jobs for, each one PER_WORKSPACE of them */
const SWEEP_WORKSPACES = 100;
/** Tag jobs the sweep lets start in the same five seconds */
const SWEEP_AT_ONCE = 25;
/** Vectors the sweep sends to be made, in calls of EMBED_BATCH: in a day of sweeps, far more than are cleared */
const SWEEP_EMBEDS = 10 * EMBED_BATCH;

type Handlers = { [K in Job["kind"]]: (job: Extract<Job, { kind: K }>) => Promise<void> };

const HANDLERS: Handlers = {
  async tag(job) {
    if (taggerEnabled()) await runTagJob(job);
  },
  async embed(job) {
    await embedItems(job.itemIds);
  },
  async shot(job) {
    try { await getOrCaptureShot(job.url); }
    // A site that fails to capture now fails the same way in a minute; a browser that is busy is not a failure
    catch (e) { if (e instanceof QueueFull) throw new RetryLater(20); }
  },
  // Only the deployment in production sweeps. A sweep scheduled by the one before (messages go back to the
  // deployment that sent them) asks production to sweep instead, and its own chain ends there
  async sweep() {
    const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (!prod) { await sweep(); return; }
    const res = await fetch(`https://${prod}/api/cron/sweep`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new RetryLater(60);
  },
};

export function runJob(job: Job): Promise<void> {
  return (HANDLERS[job.kind] as (j: Job) => Promise<void>)(job);
}

/**
 * Sends again what no job carries: PER_WORKSPACE jobs for each workspace with tags to gather (a workspace
 * already full answers them "busy" at once), and the vectors that are missing. Then schedules the next sweep,
 * so the safety net keeps itself going; any add, and the morning cron, start it again if it ever stops.
 */
export async function sweep(): Promise<{ workspaces: number; embeds: number }> {
  const open = taggerEnabled() ? await openWorkspacesWithJobs(SWEEP_WORKSPACES) : [];
  // Spread over a minute and a half: hundreds of jobs at once would each hold a database connection
  const jobs = open.flatMap((organizationId) => Array.from({ length: PER_WORKSPACE }, () => ({ kind: "tag" as const, organizationId })));
  for (let i = 0; i < jobs.length; i += SWEEP_AT_ONCE) await enqueue(jobs.slice(i, i + SWEEP_AT_ONCE), { delaySeconds: i / SWEEP_AT_ONCE * 5 });
  // Tagged first, so the vector carries the tags
  const missing = await db.select({ id: T.id }).from(T)
    .where(and(isNull(T.embedding), eq(T.tagStatus, "done")))
    .orderBy(sql`${T.createdAt} desc`).limit(SWEEP_EMBEDS);
  await enqueueEmbed(missing.map((r) => r.id));
  await scheduleSweep();
  return { workspaces: open.length, embeds: missing.length };
}
