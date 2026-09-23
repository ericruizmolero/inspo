// Is this site already saved in the key's workspace?
import { NextRequest } from "next/server";
import { requireExtCtx } from "@/lib/ext-keys";
import { findByWeb, rowToItem } from "@/lib/items";
import { normalizeWebUrl } from "@/lib/url";
import { getErrors } from "@/lib/i18n";


// GET ?url= → { exists, item? }
export async function GET(req: NextRequest) {
  const ctx = await requireExtCtx(req);
  if (ctx instanceof Response) return ctx;
  const web = normalizeWebUrl(req.nextUrl.searchParams.get("url") ?? "");
  if (!web) return Response.json({ error: (await getErrors()).badUrl }, { status: 400 });
  const row = await findByWeb(ctx.workspace.id, web);
  return Response.json(row ? { exists: true, item: rowToItem(row) } : { exists: false });
}
