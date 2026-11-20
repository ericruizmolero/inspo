import { NextRequest } from "next/server";
import { requireCtx, isResponse, canManage } from "@/lib/workspace";
import { buildWorkspaceExport, exportFileName, exportZip } from "@/lib/workspace-export";
import { getErrors } from "@/lib/i18n";
import { recordFailure } from "@/lib/log";

// Streamed, so the limit is how long the whole download may take, not how long it waits to start
export const maxDuration = 300;

// GET ?id= → the workspace's export as a zip download (lib/workspace-export.ts). Its owners and admins, any of their
// spaces (the open one by default). The rows are read before the first byte goes out, so a refusal is still JSON;
// the files follow as they are read.
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const errors = await getErrors();
  const id = req.nextUrl.searchParams.get("id")?.trim() || ctx.workspace.id;
  const ws = ctx.workspaces.find((w) => w.id === id);
  if (!ws) return Response.json({ error: errors.notAMember }, { status: 404 });
  if (!canManage(ws.role)) return Response.json({ error: errors.workspaceAdminsCan }, { status: 403 });
  const data = await buildWorkspaceExport(ws.id);
  if (!data) return Response.json({ error: errors.notAMember }, { status: 404 });
  const parts = exportZip(data);
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await parts.next();
        if (done) controller.close(); else controller.enqueue(value);
      } catch (err) {
        void recordFailure("storage", "workspace export zip", err, { organizationId: ws.id });
        controller.error(err);
      }
    },
    async cancel() { await parts.return(undefined); },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${exportFileName(ws.slug, data.exportedAt)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
