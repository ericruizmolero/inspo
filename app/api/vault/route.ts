import { NextResponse } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { isAdmin } from "@/lib/activity";
import { listVault, picksOf } from "@/lib/vault";
import { planOf } from "@/lib/plans";
import { getLocale } from "@/lib/i18n";
import { listWorkspaces } from "@/lib/workspace-core";
import { vaultOf } from "@/types/vault";

// The Vault's cards, for anyone signed in, in the language they read the app in. Partners also get the drafts, and are told they may read the code
export async function GET() {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const partner = await isAdmin(ctx.user.email);
  const [entries, picks, workspaces] = await Promise.all([listVault({ drafts: partner, locale: await getLocale() }), picksOf(ctx.workspace.id), listWorkspaces(ctx.user.id)]);
  // picks: the projects of the active workspace each entry was chosen for, by entry id. vault: how much of the Vault's
  // code this person reads, the same as their agent through the connector (vaultOf), which with each card's access says which are locked
  return NextResponse.json({ entries, partner, picks, vault: vaultOf(workspaces.map((w) => planOf(w.plan))).vault }, { headers: { "Cache-Control": "private, no-store" } });
}
