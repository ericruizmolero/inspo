// Comprobar la llave: quién soy y en qué workspace guarda esta extensión.
import { requireExtCtx, revokeExtKey } from "@/lib/ext-keys";

export const runtime = "nodejs";
const API_VERSION = 1;

export async function GET(req: Request) {
  const ctx = await requireExtCtx(req);
  if (ctx instanceof Response) return ctx;
  return Response.json({
    version: API_VERSION,
    user: { name: ctx.user.name, email: ctx.user.email },
    workspace: { id: ctx.workspace.id, name: ctx.workspace.name, kind: ctx.workspace.kind },
  });
}

// DELETE → la extensión revoca su propia llave al desconectarse
export async function DELETE(req: Request) {
  const ctx = await requireExtCtx(req);
  if (ctx instanceof Response) return ctx;
  await revokeExtKey(ctx.keyId, () => true);
  return Response.json({ ok: true });
}
