import { requireCtx, isResponse } from "@/lib/workspace";
import { quotaStatus } from "@/lib/quota";

export const runtime = "nodejs";

// GET → plan del workspace activo y uso del mes frente a las cuotas
export async function GET() {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  return Response.json(await quotaStatus(ctx.workspace));
}
