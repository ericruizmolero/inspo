"use server";
// /admin/vault: a partner sends "New in the Vault" by hand. The logic is lib/vault-release.ts.
import { sendRelease } from "@/lib/vault-release";
import { asAdmin } from "@/lib/admin-action";

/** Mails every pending piece to whoever reads the whole Vault; null when nothing was pending */
export async function sendVaultRelease() {
  return asAdmin((s) => sendRelease(s.user.id));
}
