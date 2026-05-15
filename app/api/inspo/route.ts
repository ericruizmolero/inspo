import { fetchInspoItems } from "@/lib/sheets";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await fetchInspoItems();
    return Response.json(items);
  } catch {
    return Response.json([], { status: 500 });
  }
}
