import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireCtx, isResponse } from "@/lib/workspace";
import { getErrors } from "@/lib/i18n";
import { db, schema } from "@/lib/db";
import { GUIDE_MAX, storeGuide } from "@/lib/brand-guides";
import { writeBrandSections } from "@/lib/brand-store";
import { getSystem } from "@/lib/system";

// POST { projectId, text, label? } → the system, with the guide kept among the brand's sources. The next passes (the
// system's and the brand's) read it as the brand's own word; the client runs them right after.
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const errors = await getErrors();
  const body = (await req.json().catch(() => ({}))) as { projectId?: string; text?: string; label?: string };
  const projectId = String(body.projectId ?? "").trim();
  const text = String(body.text ?? "").replace(/\r/g, "").trim();
  if (!projectId) return Response.json({ error: errors.badBody }, { status: 400 });
  if (text.length < 20) return Response.json({ error: errors.brandTextEmpty }, { status: 400 });
  const [own] = await db.select({ id: schema.project.id }).from(schema.project).where(and(eq(schema.project.organizationId, ctx.workspace.id), eq(schema.project.id, projectId))).limit(1);
  if (!own) return Response.json({ error: errors.projectNotFound }, { status: 404 });
  const key = await storeGuide(ctx.workspace.id, projectId, text.slice(0, GUIDE_MAX));
  const label = (String(body.label ?? "").trim() || text.split("\n").find((l) => l.trim())!.replace(/^#+\s*/, "")).slice(0, 80);
  await writeBrandSections(ctx.workspace.id, projectId, {}, "import", { source: { kind: "text", label, key, at: new Date().toISOString(), by: ctx.user.name } });
  return Response.json(await getSystem(ctx.workspace.id, projectId));
}
