import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { buildWorkspaceExport, exportFileName } from "@/lib/workspace-export";
import { getErrors } from "@/lib/i18n";

export const maxDuration = 60;

// GET ?id= → the workspace's export as a JSON download. Its owner only, any of their spaces (the open one by default)
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const errors = await getErrors();
  const id = req.nextUrl.searchParams.get("id")?.trim() || ctx.workspace.id;
  const ws = ctx.workspaces.find((w) => w.id === id);
  if (!ws) return Response.json({ error: errors.notAMember }, { status: 404 });
  if (ws.role !== "owner") return Response.json({ error: errors.ownerOnly }, { status: 403 });
  const data = await buildWorkspaceExport(ws.id);
  if (!data) return Response.json({ error: errors.notAMember }, { status: 404 });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName(ws.slug, data.exportedAt)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
