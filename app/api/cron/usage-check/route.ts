import { NextRequest } from "next/server";
import { checkUsage } from "@/lib/usage-check";
import { cronAuthorized } from "@/lib/cron-auth";

// Run once a day by Vercel Cron (vercel.json), which sends CRON_SECRET in the header (proxy.ts lets /api/cron/ through without a session)
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await checkUsage());
}
