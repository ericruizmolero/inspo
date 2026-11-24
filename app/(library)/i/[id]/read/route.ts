// A reference's link read by an AI (lib/share-reader.ts): proxy.ts sends the AI fetchers of /i/<code> here, with no
// session. The code (or the item's own id) is the secret, as with the preview card.
import { sharedItem } from "@/lib/share-card";
import { resolveShort } from "@/lib/short-link";
import { readerPage } from "@/lib/share-reader";

export const maxDuration = 30;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = (await resolveShort(id))?.itemId ?? id;
  const html = (await sharedItem(itemId)) ? await readerPage(itemId, new URL(req.url).origin) : null;
  if (!html) return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
