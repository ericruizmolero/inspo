import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/workspace";
import { isAdmin } from "@/lib/activity";

// Screenshots of the catalogue (docs/design-system/capturas/). Not in public/: they show the app
// with real data, so only the people who can open /library get them.
export async function GET(_req: Request, ctx: RouteContext<"/library/capturas/[name]">) {
  const { name } = await ctx.params;
  if (!/^[a-z0-9-]+$/.test(name)) return new Response(null, { status: 404 });
  const s = await getSession();
  if (!s || !(await isAdmin(s.user.email))) return new Response(null, { status: 404 });
  try {
    const file = await readFile(path.join(process.cwd(), "docs", "design-system", "capturas", `${name}.png`));
    return new Response(file, { headers: { "content-type": "image/png", "cache-control": "private, max-age=3600" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
