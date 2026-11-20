"use server";
// The signed-in person's own account. The logic is lib/account-delete.ts.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { withCtx } from "@/lib/workspace";
import { deleteAccount } from "@/lib/account-delete";

/**
 * Deletes the caller's account, signs this browser out and sends it to /login. The session rows went with the user;
 * signing out clears the cookies, the cached one included. The redirect is what keeps Next from rendering
 * Settings, Account again in the same response, for a user who no longer exists. Refused, with the reason, while a
 * team of theirs has other people.
 */
export async function deleteMyAccount() {
  const r = await withCtx(async (ctx) => {
    await deleteAccount(ctx.user.id);
    await auth.api.signOut({ headers: await headers() });
  });
  if (r.ok) redirect("/login");
  return r;
}
