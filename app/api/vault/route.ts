import { NextResponse } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { isAdmin } from "@/lib/activity";
import { listVault, picksOf } from "@/lib/vault";
import { planOf } from "@/lib/plans";
import { getLocale } from "@/lib/i18n";

// The Vault's cards, for anyone signed in, in the language they read the app in. Partners also get the drafts, and are told they may read the code
export async function GET() {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const partner = await isAdmin(ctx.user.email);
  const [entries, picks] = await Promise.all([listVault({ drafts: partner, locale: await getLocale() }), picksOf(ctx.workspace.id)]);
  // picks: the projects of the active workspace each entry was chosen for, by entry id. vault: how much of the Vault's
  // code the active workspace's plan opens, which with each card's access says which are locked (canReadVault)
  return NextResponse.json({ entries, partner, picks, vault: planOf(ctx.workspace.plan).vault }, { headers: { "Cache-Control": "private, no-store" } });
}
