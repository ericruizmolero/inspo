// Deleting a person's account, from Settings, Account (app/actions/account.ts). Refused while they own a team that
// has other people in it: they delete it or hand it over first. Otherwise, in order:
//   1. their personal space and every team only they are in, through deleteWorkspace (lib/workspace-delete.ts),
//      which also drops the billing account each leaves empty;
//   2. any other billing account they own that is left with no workspace;
//   3. the "Your account is deleted" email, once (lib/mail-once.ts), while the user row still gives its language;
//   4. the user row. Its foreign keys cascade to sessions, sign-in accounts, memberships (so they leave every other
//      team), invitations they sent, Polish votes, activity, feedback notes, extension keys and MCP grants, and set
//      null on everything they wrote in shared teams (references, comments, versions, AI spend) and on the billing
//      accounts they owned that still pay for someone's workspace. No foreign key to user.id restricts.
// Each step converges: cut halfway, running it again finds what is left and finishes. Once the row is gone there
// is nothing to do.
import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { deleteWorkspace } from "./workspace-delete";
import { dropEmptyAccount, HttpError } from "./workspace-core";
import { accountDeletedMail } from "./mail";
import { mailOnce } from "./mail-once";
import { getT } from "./i18n";
import { toLocale } from "./i18n/locale";
import { log } from "./log";

const M = schema.member, O = schema.organization, U = schema.user, B = schema.billingAccount;

/** What happens to each space when its person goes */
export type SpaceFate = "delete" | "leave" | "blocks";

export interface SpaceOnDelete { id: string; name: string; fate: SpaceFate }

const isOwner = (role: string) => role.split(",").includes("owner");

/** Every space the person is in, with what deleting the account does to it */
export async function spacesOnDelete(userId: string): Promise<SpaceOnDelete[]> {
  const others = sql<number>`(select count(*)::int from ${M} m2 where m2.organization_id = ${O.id} and m2.user_id <> ${userId})`;
  const rows = await db.select({ id: O.id, name: O.name, kind: O.kind, role: M.role, others }).from(M)
    .innerJoin(O, eq(O.id, M.organizationId)).where(eq(M.userId, userId));
  return rows.map((r) => ({
    id: r.id, name: r.name,
    fate: r.kind === "personal" ? "delete" : !isOwner(r.role) ? "leave" : r.others > 0 ? "blocks" : "delete",
  }));
}

/** The teams that stop the account from being deleted: theirs, with other people in them */
export async function teamsInTheWay(userId: string): Promise<string[]> {
  return (await spacesOnDelete(userId)).filter((s) => s.fate === "blocks").map((s) => s.name);
}

export interface AccountDeleted {
  /** Files found under the deleted spaces and deleted */
  files: number;
  /** False when a space's files could not all be deleted: each is recorded as a failure with its prefix */
  storageClean: boolean;
}

/** Deletes the account `userId` (see the top of this file). Refused with HttpError 409 while a team of theirs has others */
export async function deleteAccount(userId: string): Promise<AccountDeleted> {
  const [person] = await db.select({ email: U.email, language: U.language }).from(U).where(eq(U.id, userId));
  if (!person) return { files: 0, storageClean: true };

  const spaces = await spacesOnDelete(userId);
  const blocking = spaces.filter((s) => s.fate === "blocks").map((s) => s.name);
  if (blocking.length) {
    const { locale, t } = await getT();
    throw new HttpError(409, t.deleteAccount.blocked(new Intl.ListFormat(locale, { type: "conjunction" }).format(blocking)));
  }

  let files = 0, storageClean = true;
  for (const s of spaces.filter((x) => x.fate === "delete")) {
    const r = await deleteWorkspace(s.id, { withItsPerson: true });
    files += r.files;
    storageClean &&= r.storageClean;
  }
  for (const a of await db.select({ id: B.id }).from(B).where(eq(B.ownerUserId, userId))) await dropEmptyAccount(a.id);

  // A send that fails gives its key back and the deletion goes on: the person asked for it
  await mailOnce(`account-deleted:${userId}`, [person.email], accountDeletedMail(person.email, toLocale(person.language)));
  await db.delete(U).where(eq(U.id, userId));
  log.info("account.deleted", { userId, files, storageClean });
  return { files, storageClean };
}
