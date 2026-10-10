import { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireCtx, isResponse } from "@/lib/workspace";
import { findByWeb, tagsOfRow } from "@/lib/items";
import { taggerEnabled } from "@/lib/tagger";
import { resetTagJob, statusOf } from "@/lib/tag-jobs";
import { enqueue } from "@/lib/jobs";
import { assertSeatsOk, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";
import type { InspoTags, TagStatus } from "@/types/inspo";

export const maxDuration = 30;

// Tagging is a job per item (lib/tag-jobs.ts): adding anything starts it on the server.
// GET ?web=…&web=… → how those jobs are going: { jobs: { [web]: status }, tags: { [web]: tags } }.
//   A web missing from `jobs` is done. The library asks this while it shows "gathering tags".
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const webs = req.nextUrl.searchParams.getAll("web").slice(0, 100);
  if (!webs.length) return Response.json({ jobs: {}, tags: {} });
  const T = schema.inspoItem;
  const rows = await db.select({ web: T.web, tagsJson: T.tagsJson, tagsUser: T.tagsUser, tagStatus: T.tagStatus, tagAttempts: T.tagAttempts })
    .from(T).where(and(eq(T.organizationId, ctx.workspace.id), inArray(T.web, webs)));
  const jobs: Record<string, TagStatus> = {};
  const tags: Record<string, InspoTags> = {};
  for (const r of rows) {
    const job = statusOf(r);
    if (job) jobs[r.web] = job;
    else { const t = tagsOfRow(r); if (t) tags[r.web] = t; }
  }
  return Response.json({ jobs, tags });
}

// POST { web } → gathers that item's tags again ("try again" after a failure, or a fresh look).
export async function POST(req: NextRequest) {
  if (!taggerEnabled()) return Response.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  // Downgrading can leave the team with more people than the plan allows: AI stops until they fix it
  const blocked = await quotaBlock(assertSeatsOk(ctx.workspace));
  if (blocked) return blocked;
  const { web } = (await req.json().catch(() => ({}))) as { web?: string };
  if (!web) return Response.json({ error: (await getErrors()).missingWebOrAll }, { status: 400 });
  const id = await resetTagJob(ctx.workspace.id, web);
  if (!id) {
    // Not updated: the card is not here, or it ran in the last ten minutes (lib/tag-jobs.ts)
    if (await findByWeb(ctx.workspace.id, web)) return Response.json({ error: (await getErrors()).tooMany }, { status: 429 });
    return Response.json({ error: (await getErrors()).urlNotInWorkspace }, { status: 404 });
  }
  void enqueue({ kind: "tag", organizationId: ctx.workspace.id, itemId: id, userId: ctx.user.id });
  return Response.json({ status: "pending" }, { status: 202 });
}
