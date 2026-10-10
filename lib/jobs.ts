// Work that runs after the answer, each piece in its own function: tagging an item, making its meaning
// vector, capturing a site's first screen, and the sweep that catches what fell through. Server only.
//
// enqueue() sends a job to Vercel Queues (topic "jobs"), which calls app/api/queue/jobs with it: each job gets
// that route's own time budget, whatever route sent it, and a failure is delivered again later (lib/job-run.ts
// says when). The database stays the record of every tag job (lib/tag-jobs.ts): a lost message only means
// the item waits for the next sweep, at most SWEEP_EVERY_S away. Off Vercel (dev, scripts) there is no queue
// and the job runs here, once, after the answer.
import "server-only";
import { after } from "next/server";
import { send } from "@vercel/queue";
import { log } from "./log";

export const TOPIC = "jobs";

export type Job =
  /** This item's tagging, or the workspace's next one waiting (no itemId) */
  | { kind: "tag"; organizationId: string; itemId?: string; userId?: string | null }
  /** These items' meaning vectors, in one call (at most EMBED_BATCH) */
  | { kind: "embed"; itemIds: string[] }
  /** A site's first screen, for its card */
  | { kind: "shot"; url: string }
  /** Every job left behind, sent again; then the next sweep */
  | { kind: "sweep" };

/** The safety net's period: what no job carries any more is sent again within this */
export const SWEEP_EVERY_S = 5 * 60;

interface SendOpts { delaySeconds?: number; idempotencyKey?: string }

export const onVercel = () => !!process.env.VERCEL_DEPLOYMENT_ID;
let sweepAskedAt = 0;

/** Sends these jobs. Never throws: a send that fails runs the job here instead, and the sweep is behind both.
 *  Inside a request the sends outlive the response, so a caller there needn't wait for them. */
export function enqueue(jobs: Job | Job[], opts: SendOpts = {}): Promise<void> {
  const list = Array.isArray(jobs) ? jobs : [jobs];
  const sent = onVercel() ? sendAll(list, opts) : Promise.resolve(list.forEach((job) => runHere(job, opts.delaySeconds)));
  try { after(() => sent); } catch { /* outside a request (a queue delivery awaits it, scripts don't) */ }
  return sent;
}

async function sendAll(list: Job[], opts: SendOpts) {
  // Work is coming in: the safety net is there for it, even if its chain ever stopped
  if (list.length && Date.now() - sweepAskedAt > SWEEP_EVERY_S * 1000) { sweepAskedAt = Date.now(); await scheduleSweep(); }
  for (let i = 0; i < list.length; i += 10) {
    await Promise.all(list.slice(i, i + 10).map((job) => send(TOPIC, job, opts).then(() => {}, (err) => {
      log.error("job.not_sent", { kind: job.kind, err });
      runHere(job);
    })));
  }
}

/** Texts per embedding call (lib/embed.ts batches the same) */
export const EMBED_BATCH = 64;

/** Their meaning vectors, made again now that their words changed */
export const enqueueEmbed = (itemIds: string[]) => enqueue(chunk(itemIds, EMBED_BATCH).map((ids) => ({ kind: "embed" as const, itemIds: ids })));

/** The next sweep, at the next boundary of SWEEP_EVERY_S. Whoever asks within one period asks for the same
 *  message (one key per boundary), so the sweep that schedules the next one and a cron that starts the chain
 *  again never make two. Off Vercel there is nothing to schedule. */
export async function scheduleSweep(): Promise<void> {
  if (!onVercel()) return;
  const now = Date.now() / 1000;
  const at = Math.ceil((now + 1) / SWEEP_EVERY_S) * SWEEP_EVERY_S;
  await send(TOPIC, { kind: "sweep" } satisfies Job, { delaySeconds: Math.ceil(at - now), idempotencyKey: `sweep:${at}` })
    .catch((err) => log.error("job.sweep_not_scheduled", { err }));
}

/** Off the queue: the job runs once, after the answer (or now, outside a request), or after its delay while
 *  this process lives */
function runHere(job: Job, delaySeconds = 0) {
  const run = () => import("./job-run").then(({ runJob }) => runJob(job))
    .catch((err) => log.warn("job.failed_here", { kind: job.kind, err }));
  if (delaySeconds > 0) { setTimeout(run, delaySeconds * 1000).unref(); return; }
  try { after(run); } catch { void run(); }
}

function chunk<T>(list: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}
