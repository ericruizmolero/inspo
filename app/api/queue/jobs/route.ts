import { handleCallback } from "@vercel/queue";
import { runJob, RetryLater } from "@/lib/job-run";
import { recordFailure } from "@/lib/log";
import type { Job } from "@/lib/jobs";

// Every job, as Vercel Queues delivers it (lib/jobs.ts). This route has no public URL: only the queue calls it
// (vercel.json, experimentalTriggers). Each delivery has the whole maxDuration, whatever route sent the job.
export const maxDuration = 300;

/** Deliveries of a job that keeps failing before it is let go. Its failure is stored; a tag job also keeps its
 *  row (failed, or pending for the sweep), which is the dead letter the library shows with "try again". */
const MAX_DELIVERIES = 6;

export const POST = handleCallback<Job>(async (job, meta) => {
  try { await runJob(job); }
  catch (e) {
    if (meta.deliveryCount >= MAX_DELIVERIES) {
      void recordFailure("job", job.kind, e, { ref: "organizationId" in job ? job.organizationId : meta.messageId });
    }
    throw e;
  }
}, {
  // Longer than maxDuration: a job is not delivered twice while its first delivery still runs
  visibilityTimeoutSeconds: 360,
  retry: (error, meta) => {
    if (meta.deliveryCount >= MAX_DELIVERIES) return { acknowledge: true };
    if (error instanceof RetryLater) return { afterSeconds: error.seconds };
    // 1, 2, 4, 8, 15 minutes
    return { afterSeconds: Math.min(15 * 60, 60 * 2 ** (meta.deliveryCount - 1)) };
  },
});
