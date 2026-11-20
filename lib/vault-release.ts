// "New in the Vault": the pieces published since the last release, mailed to whoever reads the whole Vault. The
// cadence is not fixed yet, so a partner sends each release by hand from /admin/vault. A release is a vault_release
// row with the entries it announced; the next one starts where it left off.
import "server-only";
import { and, desc, eq, gt, isNotNull, lte, sql } from "drizzle-orm";
import { db, schema, type Db } from "./db";
import { newId } from "./workspace-core";
import { cardOf } from "./vault";
import { vaultUrl } from "./mcp/vault";
import { listAdmins } from "./activity";
import { planOf } from "./plans";
import { baseUrl, unsubscribeUrl } from "./notify";
import { sendMail, vaultReleaseMail } from "./mail";
import { toLocale, type Locale } from "./i18n/locale";
import en from "./i18n/en";
import es from "./i18n/es";
import { vaultOf, type VaultCard } from "@/types/vault";

const V = schema.vaultItem;
const R = schema.vaultRelease;
const U = schema.user;
const DICTS = { en, es } as const;

/** Resend takes about 2 requests a second (lib/waves.ts paces its invites the same) */
const SEND_GAP_MS = 600;

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Row = typeof V.$inferSelect;

/** The published entries the last release did not reach, newest first: every published one before the first release.
 *  `until` caps them at the moment a release is cut, so a piece published while it goes out waits for the next */
async function pendingRows(exec: Db | Tx, until?: Date): Promise<Row[]> {
  const [last] = await exec.select({ at: R.sentAt }).from(R).orderBy(desc(R.sentAt)).limit(1);
  return exec.select().from(V)
    .where(and(isNotNull(V.publishedAt), last ? gt(V.publishedAt, last.at) : undefined, until ? lte(V.publishedAt, until) : undefined))
    .orderBy(desc(V.publishedAt));
}

/** What the next release would announce, as cards in `locale` */
export async function pendingRelease(locale?: Locale): Promise<VaultCard[]> {
  return (await pendingRows(db)).map((r) => cardOf(r, locale));
}

export interface VaultReader { id: string; email: string; language: Locale }

/** Whether a person gets the releases (and the switch for them in Account): their Vault is whole, by vaultOf over
 *  the plans of all their workspaces as the connector reads it, or they are a partner, who reads all of it */
export const getsReleases = (plans: readonly string[], partner: boolean): boolean =>
  partner || vaultOf(plans.map(planOf)).vault === "full";

/** Who gets a release (getsReleases), never someone who turned these emails off */
export async function vaultReaders(): Promise<VaultReader[]> {
  const M = schema.member, O = schema.organization, B = schema.billingAccount;
  const [rows, admins] = await Promise.all([
    db.select({ id: U.id, email: U.email, language: U.language, plan: B.plan }).from(U)
      .leftJoin(M, eq(M.userId, U.id)).leftJoin(O, eq(O.id, M.organizationId)).leftJoin(B, eq(B.id, O.billingAccountId))
      .where(eq(U.vaultEmails, true)),
    listAdmins(),
  ]);
  const partners = new Set(admins.map((a) => a.email));
  const people = new Map<string, VaultReader & { plans: string[] }>();
  for (const r of rows) {
    const p = people.get(r.id) ?? people.set(r.id, { id: r.id, email: r.email, language: toLocale(r.language), plans: [] }).get(r.id)!;
    if (r.plan) p.plans.push(r.plan);
  }
  return [...people.values()]
    .filter((p) => getsReleases(p.plans, partners.has(p.email.toLowerCase())))
    .map(({ plans: _plans, ...reader }) => reader);
}

export interface PastRelease { id: string; sentAt: string; by: string | null; pieces: number }

/** The releases sent, newest first */
export async function pastReleases(limit = 50): Promise<PastRelease[]> {
  const rows = await db.select({ id: R.id, sentAt: R.sentAt, by: U.name, pieces: sql<number>`cardinality(${R.entryIds})` })
    .from(R).leftJoin(U, eq(U.id, R.sentBy)).orderBy(desc(R.sentAt)).limit(limit);
  return rows.map((r) => ({ ...r, sentAt: r.sentAt.toISOString(), pieces: Number(r.pieces) }));
}

export interface SentRelease { id: string; pieces: number; readers: number; sent: number }

/** A piece in the reader's language, with its category's name and its address in the app */
const pieceOf = (r: Row, locale: Locale) => {
  const card = cardOf(r, locale), t = DICTS[locale];
  const category = (t.taxonomy.section as Record<string, string>)[card.category] ?? (t.vault.details as Record<string, string>)[card.category] ?? card.category;
  return { title: card.title, category, summary: card.summary, url: vaultUrl(baseUrl(), card.slug) };
};

/**
 * Sends "New in the Vault" with every pending piece to each reader, in their language, and records the release.
 * Nothing pending sends nothing and returns null.
 *
 * Two sends at once never mail twice: the release is cut under a transaction-scoped advisory lock (released at
 * commit, so the pooler cannot leave it held) and recorded before any email leaves. Whoever waits on the lock then
 * finds those pieces already released. Recording first makes a send at most once per person: a crash halfway
 * leaves some readers without this release rather than mailing the rest twice. A failed address is logged by sendMail.
 */
export async function sendRelease(partnerId: string, o: { gapMs?: number } = {}): Promise<SentRelease | null> {
  const cut = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('vault-release'))`);
    const sentAt = new Date();
    const entries = await pendingRows(tx, sentAt);
    if (!entries.length) return null;
    const id = newId();
    await tx.insert(R).values({ id, entryIds: entries.map((e) => e.id), sentBy: partnerId, sentAt });
    return { id, entries };
  });
  if (!cut) return null;
  const readers = await vaultReaders();
  const gap = o.gapMs ?? SEND_GAP_MS;
  let sent = 0;
  for (const [i, reader] of readers.entries()) {
    if (i > 0 && gap > 0) await new Promise((r) => setTimeout(r, gap));
    const stopUrl = unsubscribeUrl(reader.id, "vault");
    const mail = vaultReleaseMail(cut.entries.map((e) => pieceOf(e, reader.language)), stopUrl, reader.language);
    sent += await sendMail(reader.email, mail).then(() => 1, () => 0);
  }
  return { id: cut.id, pieces: cut.entries.length, readers: readers.length, sent };
}

export interface VaultReleaseState { pending: VaultCard[]; readers: number; past: PastRelease[] }

/** /admin/vault: what the next release holds, how many people it reaches, and the ones sent */
export async function vaultReleaseState(locale: Locale): Promise<VaultReleaseState> {
  const [pending, readers, past] = await Promise.all([pendingRelease(locale), vaultReaders(), pastReleases()]);
  return { pending, readers: readers.length, past };
}
