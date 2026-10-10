import { NextRequest } from "next/server";
import { sweep } from "@/lib/job-run";
import { cronAuthorized } from "@/lib/cron-auth";

export const maxDuration = 60;

// The jobs' safety net (lib/job-run.ts): sends again whatever no job carries, then schedules the next sweep.
// Called by the sweep's own message (always on the deployment in production) and by the morning cron.
// With nothing to do it costs two queries.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await sweep());
}
