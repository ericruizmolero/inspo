// Check the key: who I am and which workspace this extension saves to.
import { requireExtCtx, revokeExtKey } from "@/lib/ext-keys";

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

// DELETE → the extension revokes its own key on disconnect
export async function DELETE(req: Request) {
  const ctx = await requireExtCtx(req);
  if (ctx instanceof Response) return ctx;
  await revokeExtKey(ctx.keyId, () => true);
  return Response.json({ ok: true });
}
