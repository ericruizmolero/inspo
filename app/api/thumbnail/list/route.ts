import { list } from "@vercel/blob";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "inspo/thumbs/" });
    // Deduplicate by filename stem, keep latest upload per original filename
    const seen = new Map<string, { url: string; uploadedAt: string }>();
    for (const b of blobs) {
      const stem = b.pathname.split("/").pop()?.replace(/^\d+-/, "") ?? b.url;
      const existing = seen.get(stem);
      if (!existing || new Date(b.uploadedAt) > new Date(existing.uploadedAt)) {
        seen.set(stem, { url: b.url, uploadedAt: b.uploadedAt.toString() });
      }
    }
    const urls = [...seen.values()]
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .map((v) => v.url);
    return Response.json({ urls });
  } catch (e) {
    return Response.json({ urls: [], error: String(e) }, { status: 500 });
  }
}
