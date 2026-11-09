// Where an agent sends a picture with the link upload_link gave it (lib/mcp/upload.ts): one POST per file, the
// bytes as the body (or a multipart "file"), its name and note in the query. It is saved as add_reference would
// save it, as the person who asked for the link.
import { originOf, CORS } from "@/lib/mcp/auth";
import { addPiece } from "@/lib/mcp/pieces";
import { UPLOAD_FILES, UPLOAD_MAX_BYTES, UPLOAD_MINUTES, ctxOfGrant, readUploadToken } from "@/lib/mcp/upload";
import { HttpError } from "@/lib/workspace-core";
import { allow } from "@/lib/rate-limit";
import { log, recordFailure } from "@/lib/log";

export const maxDuration = 120; // the picture is stored, then tagged once answered

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS } });

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

async function bytesOf(req: Request): Promise<Buffer> {
  if ((req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    const file = (await req.formData()).get("file");
    if (!file || typeof file === "string") throw new HttpError(400, 'Send the picture as the body, or as a multipart field called "file".');
    return Buffer.from(await file.arrayBuffer());
  }
  return Buffer.from(await req.arrayBuffer());
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const grant = readUploadToken((await params).token);
    if (Number(req.headers.get("content-length") ?? 0) > UPLOAD_MAX_BYTES) throw new HttpError(413, `The picture is over ${UPLOAD_MAX_BYTES / 1024 / 1024} MB: scale it down and send it again.`);
    if (!(await allow(`mcp:upload:${grant.id}`, UPLOAD_FILES, UPLOAD_MINUTES * 60_000))) throw new HttpError(429, `This link took its ${UPLOAD_FILES} pictures. Ask for a new one with upload_link.`);
    const body = await bytesOf(req);
    if (!body.length) throw new HttpError(400, "The body is empty: send the picture's bytes (curl --data-binary @file).");
    if (body.length > UPLOAD_MAX_BYTES) throw new HttpError(413, `The picture is over ${UPLOAD_MAX_BYTES / 1024 / 1024} MB: scale it down and send it again.`);
    const q = new URL(req.url).searchParams;
    const ctx = await ctxOfGrant(grant);
    const out = await addPiece(ctx, originOf(req), {
      project: grant.p, image: body.toString("base64"),
      title: q.get("title") ?? undefined, note: q.get("note") ?? undefined,
      areas: (q.get("areas") ?? "").split(",").map((a) => a.trim()).filter(Boolean),
      suggested: !!grant.s, role: grant.r ?? null,
    });
    return json(out);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    log.error("mcp.upload_failed", { err: e });
    void recordFailure("mcp", "upload", e);
    return json({ error: "Something failed in criterio. Try again in a moment." }, 500);
  }
}
