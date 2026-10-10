import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { uploadUrl, putFile } from "@/lib/storage";
import { getErrors } from "@/lib/i18n";
import { MAX_BRAND_BYTES, brandTypeFor, isPurpose, newBrandKey } from "@/lib/brand-files";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { HttpError } from "@/lib/workspace-core";
import { recordFailure } from "@/lib/log";

// Uploads a file of a project's brand: a logo, a font, a picture, a file to hand out. Two ways in, as /api/media:
// - JSON { projectId, purpose, name, size } → { key, type, put }: the browser PUTs the file to `put`, straight to R2.
//   `put` is null when files are on disk (development): then it posts the file here instead.
// - multipart { projectId, purpose, file } → { key, type }.
// The brand points at it afterwards, through attachBrandFile, which checks the bytes.
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const errors = await getErrors();
  const json = req.headers.get("content-type")?.startsWith("application/json");
  const form = json ? null : await req.formData().catch(() => null);
  const body = json ? ((await req.json().catch(() => ({}))) as { projectId?: string; purpose?: string; name?: string; size?: number }) : null;
  const file = form?.get("file");
  const projectId = String(body?.projectId ?? form?.get("projectId") ?? "");
  const purpose = body?.purpose ?? form?.get("purpose");
  const name = String(body?.name ?? (file instanceof File ? file.name : ""));
  const size = Number(body?.size ?? (file instanceof File ? file.size : 0));
  if (!projectId || !isPurpose(purpose)) return Response.json({ error: errors.badBody }, { status: 400 });
  const [own] = await db.select({ id: schema.project.id }).from(schema.project).where(and(eq(schema.project.organizationId, ctx.workspace.id), eq(schema.project.id, projectId))).limit(1);
  if (!own) return Response.json({ error: errors.projectNotFound }, { status: 404 });
  const type = brandTypeFor(purpose, name);
  if (!type) return Response.json({ error: errors.brandFileType }, { status: 415 });
  if (!Number.isFinite(size) || size <= 0) return Response.json({ error: errors.missingFile }, { status: 400 });
  if (size > MAX_BRAND_BYTES) return Response.json({ error: errors.brandFileTooBig }, { status: 413 });
  const key = newBrandKey(ctx.workspace.id, projectId, purpose, name);
  try {
    if (body) return Response.json({ key, type, put: await uploadUrl(key, type, size) }, { status: 201 });
    if (!(file instanceof File)) return Response.json({ error: errors.missingFile }, { status: 400 });
    await putFile(key, Buffer.from(await file.arrayBuffer()), type);
    return Response.json({ key, type }, { status: 201 });
  } catch (e) {
    if (!(e instanceof HttpError)) void recordFailure("storage", "brand upload", e);
    return Response.json({ error: e instanceof HttpError ? e.message : (await getErrors()).unexpected }, { status: e instanceof HttpError ? e.status : 500 });
  }
}
