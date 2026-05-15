import { list } from "@vercel/blob";

export const runtime = "nodejs";

export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const result: Record<string, unknown> = {
    hasToken: !!token,
    tokenPrefix: token ? token.slice(0, 20) + "..." : null,
  };

  if (token) {
    try {
      const { blobs } = await list({ prefix: "inspo/" });
      result.listOk = true;
      result.blobCount = blobs.length;
    } catch (err) {
      result.listError = err instanceof Error ? err.message : String(err);
    }
  }

  return Response.json(result);
}
