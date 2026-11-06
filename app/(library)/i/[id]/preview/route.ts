// The picture of a pasted reference link (lib/share-card.ts), 1200×630. Open without a session: the preview apps
// ask for it with none. With no picture of its own it hands over the app's card.
import { NextResponse } from "next/server";
import { sharedItem, cardImage } from "@/lib/share-card";

export const maxDuration = 30;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await sharedItem(id);
  if (!item) return new Response("not found", { status: 404 });
  const jpeg = await cardImage(item);
  if (!jpeg) return NextResponse.redirect(new URL("/opengraph-image", req.url), { headers: { "Cache-Control": "public, max-age=3600" } });
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      // Each app keeps its own copy anyway; ours keeps it a day, so a thumbnail changed later shows on the next paste
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
