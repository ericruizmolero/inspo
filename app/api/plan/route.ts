import { requireCtx, isResponse } from "@/lib/workspace";
import { quotaStatus } from "@/lib/quota";


// GET → active workspace plan and this month's usage against the quotas
export async function GET() {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  return Response.json(await quotaStatus(ctx.workspace));
}
