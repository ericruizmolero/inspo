import { NextRequest } from "next/server";
import { requireCtx, isResponse, accountOf, HttpError, httpErrorResponse, type Ctx } from "@/lib/workspace";
import { importWorkspace, importPrefix, newImportKey, storedZip, type ImportInto } from "@/lib/workspace-import";
import { bufferSource } from "@/lib/zip";
import { deleteFiles, listFiles, uploadUrl } from "@/lib/storage";
import { getErrors, getT } from "@/lib/i18n";
import { recordFailure } from "@/lib/log";

// Copying every file of a large workspace into the new one
export const maxDuration = 300;

/** The most R2 takes in one PUT */
const MAX_ZIP_BYTES = 5 * 1024 ** 3;

/** The plan the import joins: the open workspace's, which the person must pay for (as Settings, Plan's new workspace) */
async function into(ctx: Ctx): Promise<ImportInto> {
  const account = await accountOf(ctx.workspace.id);
  if (!account || account.ownerUserId !== ctx.user.id) throw new HttpError(403, (await getT()).t.quota.notAccountOwner);
  return { accountId: account.id, plan: account.plan, user: ctx.user };
}

// An export's zip (lib/workspace-export.ts) becomes a new workspace on the open workspace's plan (lib/workspace-import.ts).
// Three ways in, as /api/media takes an upload (lib/workspace-import-client.ts drives them):
// - JSON { size } → { key, put }: the browser PUTs the zip to `put`, straight to R2, under the person's own imports/
//   folder; a function takes at most 4.5 MB on Vercel. `put` is null when files are on disk (development).
// - JSON { key } → { id, name }: imports that upload, read from R2 by ranges, and deletes it.
// - the zip as the body (application/zip) → { id, name }: on disk, or a zip small enough for a function.
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const errors = await getErrors();
  let upload: string | null = null;
  try {
    const target = await into(ctx);
    if (req.headers.get("content-type")?.startsWith("application/json")) {
      const body = (await req.json().catch(() => ({}))) as { size?: unknown; key?: unknown };
      if (typeof body.key === "string") {
        // Only the person's own upload: an import never reads another folder of the bucket
        if (!body.key.startsWith(importPrefix(ctx.user.id)) || body.key.includes("..")) return Response.json({ error: errors.badBody }, { status: 403 });
        upload = body.key;
        const src = await storedZip(upload);
        if (!src) return Response.json({ error: errors.missingFile }, { status: 404 });
        return Response.json(await importWorkspace(src, target), { status: 201 });
      }
      const size = Number(body.size);
      if (!Number.isInteger(size) || size <= 0) return Response.json({ error: errors.missingFile }, { status: 400 });
      if (size > MAX_ZIP_BYTES) return Response.json({ error: (await getT()).t.workspaceData.tooLarge }, { status: 413 });
      // An upload that was never imported goes when the person starts another
      await deleteFiles((await listFiles(importPrefix(ctx.user.id))).map((f) => f.key));
      const key = newImportKey(ctx.user.id);
      return Response.json({ key, put: await uploadUrl(key, "application/zip", size) }, { status: 201 });
    }
    const zip = Buffer.from(await req.arrayBuffer());
    if (!zip.length) return Response.json({ error: errors.missingFile }, { status: 400 });
    return Response.json(await importWorkspace(bufferSource(zip), target), { status: 201 });
  } catch (e) {
    if (e instanceof HttpError) return httpErrorResponse(e);
    void recordFailure("storage", "workspace import", e);
    return Response.json({ error: errors.unexpected }, { status: 500 });
  } finally {
    if (upload) await deleteFiles([upload]);
  }
}
