import { NextRequest } from "next/server";
import { checkUsage } from "@/lib/usage-check";

// Run once a day by Vercel Cron (vercel.json), which sends CRON_SECRET in the header (proxy.ts lets /api/cron/ through without a session)
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await checkUsage());
}
