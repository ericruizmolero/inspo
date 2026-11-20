// Workspaces inside a billing account: opening a team in one (Settings › Plan's new workspace, an import) and letting a
// client's workspace go onto a free account of its own (Settings › Plan). Who may do either is the caller's check
// (app/actions/billing.ts, app/api/workspace/import): these only keep the accounts right, locked while they change.
import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema, type Exec } from "./db";
import { createBillingAccount, HttpError, isOwnerRow, newId, slugify } from "./workspace-core";
import { assertWorkspaceRoom } from "./quota";
import { isOutputLanguage, toOutputLanguage } from "./output-language";
import { planOf, DEFAULT_PLAN } from "./plans";
import { getT } from "./i18n";
import { letGoMail, localeForEmail, sendMail } from "./mail";
import { log } from "./log";

const O = schema.organization, B = schema.billingAccount, M = schema.member;

/** Locks the accounts' rows until the transaction ends, always in the same order, so two moves cannot deadlock */
export const lockAccounts = (exec: Exec, ids: string[]) =>
  exec.select({ id: B.id }).from(B).where(inArray(B.id, ids)).orderBy(asc(B.id)).for("update");

/** A new team workspace in the account, with `owner` as its owner, if the plan has room for another. Returns its id:
 *  `opts.id` when the caller chose it beforehand (an import names its files after it) */
export async function openTeamInAccount(accountId: string, name: string, owner: { id: string; language?: string | null }, opts: { id?: string; outputLanguage?: string } = {}): Promise<string> {
  const id = opts.id ?? newId();
  const outputLanguage = isOutputLanguage(opts.outputLanguage) ? opts.outputLanguage : toOutputLanguage(owner.language);
  const now = new Date();
  await db.transaction(async (tx) => {
    await lockAccounts(tx, [accountId]);
    await assertWorkspaceRoom(accountId, tx);
    await tx.insert(O).values({
      id, name, slug: `${slugify(name)}-${newId().slice(0, 4)}`, createdAt: now, kind: "team",
      billingAccountId: accountId, outputLanguage,
    });
    await tx.insert(M).values({ id: newId(), organizationId: id, userId: owner.id, role: "owner", createdAt: now });
  });
  return id;
}

/** Who a workspace let go belongs to now, and what it left */
export interface LetGo { workspace: string; ownerId: string; account: string; from: string }

/**
 * Moves a client's workspace out of the account that pays for it onto a new account on the free plan, owned by the
 * workspace's owner: from then on it is theirs to pay for. Only a team of this account whose owner is not `payerId`
 * (their own team is not a client's); refused with 403 otherwise. Rows and files stay where they are: nothing of the
 * workspace reaches the payer.
 */
export async function letWorkspaceGo(accountId: string, payerId: string, workspaceId: string): Promise<LetGo> {
  return db.transaction(async (tx) => {
    const [account] = await lockAccounts(tx, [accountId]);
    const [ws] = await tx.select({ id: O.id, name: O.name }).from(O)
      .where(and(eq(O.id, workspaceId), eq(O.billingAccountId, accountId), eq(O.kind, "team"))).for("update");
    const [owner] = ws ? await tx.select({ userId: M.userId }).from(M)
      .where(and(eq(M.organizationId, ws.id), isOwnerRow())).orderBy(asc(M.createdAt)).limit(1) : [];
    if (!account || !ws || !owner || owner.userId === payerId) throw new HttpError(403, (await getT()).t.workspaceData.cannotLetGo);
    const [from] = await tx.select({ name: B.name, plan: B.plan }).from(B).where(eq(B.id, accountId));
    const next = await createBillingAccount({ name: ws.name, ownerUserId: owner.userId }, tx);
    await tx.update(O).set({ billingAccountId: next }).where(eq(O.id, ws.id));
    return { workspace: ws.name, ownerId: owner.userId, account: from.name, from: from.plan };
  });
}

/** The workspace's owner hears it is theirs to pay for now, in their language. A send that fails is logged, never undone */
export async function tellLetGo(g: LetGo, url: string): Promise<void> {
  try {
    const [to] = await db.select({ email: schema.user.email }).from(schema.user).where(eq(schema.user.id, g.ownerId));
    if (!to) return;
    const vaultLocks = planOf(g.from).vault !== planOf(DEFAULT_PLAN).vault;
    await sendMail(to.email, letGoMail({ workspace: g.workspace, account: g.account, vaultLocks, url }, await localeForEmail(to.email)));
  } catch (err) {
    log.warn("let_go.mail_not_sent", { userId: g.ownerId, err });
  }
}
