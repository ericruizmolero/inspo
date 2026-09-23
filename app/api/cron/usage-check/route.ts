import { NextRequest } from "next/server";
import { checkUsage } from "@/lib/usage-check";

// Lo lanza el cron de Vercel una vez al día (vercel.json), con CRON_SECRET en la cabecera
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await checkUsage());
}
