"use server";
// The signed-in person's own account. The logic is lib/account-delete.ts.
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { withCtx } from "@/lib/workspace";
import { deleteAccount } from "@/lib/account-delete";

/**
 * Deletes the caller's account, then signs this browser out: the session rows went with the user, and this clears the
 * cookies, the cached one included. The client goes to /login. Refused while a team of theirs has other people.
 */
export async function deleteMyAccount() {
  return withCtx(async (ctx) => {
    await deleteAccount(ctx.user.id);
    await auth.api.signOut({ headers: await headers() });
  });
}
