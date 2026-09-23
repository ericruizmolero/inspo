import { NextRequest } from "next/server";
import { checkUsage } from "@/lib/usage-check";

// Run by the Vercel cron once a day (vercel.json), with CRON_SECRET in the header
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await checkUsage());
}
