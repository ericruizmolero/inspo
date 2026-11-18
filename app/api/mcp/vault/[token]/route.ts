// Where a partner's agent sends the picture of a Vault entry, or its loop, with the link add_to_vault gave it
// (lib/mcp/vault.ts): one POST per file, the bytes as the body (or a multipart "file"). The bytes say which it is.
import { CORS } from "@/lib/mcp/auth";
import { readVaultUpload } from "@/lib/mcp/vault";
import { VAULT_IMAGE_MAX, setVaultMedia } from "@/lib/vault";
import { HttpError } from "@/lib/workspace-core";
import { allow } from "@/lib/rate-limit";
import { log, recordFailure } from "@/lib/log";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS } });
const TOO_BIG = `The file is over ${VAULT_IMAGE_MAX / 1024 / 1024} MB, the most this link takes: scale a picture down, and pass a bigger video by its public address (video_url).`;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const grant = await readVaultUpload((await params).token);
    if (Number(req.headers.get("content-length") ?? 0) > VAULT_IMAGE_MAX) throw new HttpError(413, TOO_BIG);
    if (!(await allow(`mcp:vault-upload:${grant.userId}`, 60, 60 * 60_000))) throw new HttpError(429, "Too many files in an hour. Wait a moment and go on.");
    let body: Buffer;
    if ((req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
      const file = (await req.formData()).get("file");
      if (!file || typeof file === "string") throw new HttpError(400, 'Send the file as the body, or as a multipart field called "file".');
      body = Buffer.from(await file.arrayBuffer());
    } else body = Buffer.from(await req.arrayBuffer());
    if (!body.length) throw new HttpError(400, "The body is empty: send the file's bytes (curl --data-binary @file).");
    return json({ ...(await setVaultMedia(grant.entryId, body)), saved: true });
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    log.error("mcp.vault_upload_failed", { err: e });
    void recordFailure("mcp", "vault_upload", e);
    return json({ error: "Something failed in criterio. Try again in a moment." }, 500);
  }
}
