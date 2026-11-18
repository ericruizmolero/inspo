import { NextResponse } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { isAdmin } from "@/lib/activity";
import { VAULT_IMAGE_MAX, setVaultVideo, videoFromLink } from "@/lib/vault";
import { HttpError } from "@/lib/workspace-core";
import { log } from "@/lib/log";

// The loop a Vault entry's card plays in place of the piece, set from its sheet by criterio's own team: a link
// (JSON { url }: the file, or a Screen Studio share) or the file's bytes as the body, up to what a request may
// carry. DELETE takes it away and the card plays the piece again.
export const maxDuration = 120;

async function partner(): Promise<Response | null> {
  const session = await requireCtx();
  if (isResponse(session)) return session;
  return (await isAdmin(session.user.email)) ? null : new NextResponse("not found", { status: 404 });
}
const fail = (e: unknown) => {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  log.error("vault.video_failed", { err: e });
  return NextResponse.json({ error: "Something failed. Try again in a moment." }, { status: 500 });
};

export async function POST(req: Request, ctx: RouteContext<"/api/vault/[entry]/video">) {
  const no = await partner();
  if (no) return no;
  try {
    const entry = (await ctx.params).entry;
    let body: Buffer | null;
    if ((req.headers.get("content-type") ?? "").startsWith("application/json")) {
      const { url } = (await req.json()) as { url?: string };
      body = await videoFromLink(String(url ?? ""));
      if (!body) throw new HttpError(422, "No video could be read from that link. It has to be a video file, or a share page that hands its video out (Screen Studio does).");
    } else {
      if (Number(req.headers.get("content-length") ?? 0) > VAULT_IMAGE_MAX) throw new HttpError(413, "The file is too large to send from here: pass a link to it instead.");
      body = Buffer.from(await req.arrayBuffer());
    }
    return NextResponse.json({ video: await setVaultVideo(entry, body) });
  } catch (e) { return fail(e); }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/vault/[entry]/video">) {
  const no = await partner();
  if (no) return no;
  try {
    await setVaultVideo((await ctx.params).entry, null);
    return NextResponse.json({ video: null });
  } catch (e) { return fail(e); }
}
