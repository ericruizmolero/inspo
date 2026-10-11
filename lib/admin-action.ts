// The guard every /admin action runs behind, and the app's address for the links those actions mail. Not in a
// "use server" file: asAdmin takes a function, so it must never be callable from the browser.
import "server-only";
import { headers } from "next/headers";
import { getSession, type ActionResult } from "@/lib/workspace";
import { APP_URL } from "@/lib/auth";
import { isAdmin } from "@/lib/activity";
import { getErrors } from "@/lib/i18n";
import { HttpError } from "@/lib/workspace-core";
import { log } from "@/lib/log";

export type Admin = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export async function asAdmin<T>(fn: (s: Admin) => Promise<T>): Promise<ActionResult<T>> {
  const s = await getSession();
  if (!s) return { ok: false, error: (await getErrors()).notSignedIn };
  if (!(await isAdmin(s.user.email))) return { ok: false, error: (await getErrors()).noPanelAccess };
  try {
    return { ok: true, data: await fn(s) };
  } catch (e) {
    if (!(e instanceof HttpError)) log.error("admin.action_failed", { err: e });
    return { ok: false, error: e instanceof HttpError ? e.message : (await getErrors()).unexpected };
  }
}

export async function appBase(): Promise<string> {
  if (APP_URL) return APP_URL;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}
