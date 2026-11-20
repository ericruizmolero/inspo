// The owner of a billing account hears by email as a plan limit fills (FILLING in lib/plans.ts): once when it nears
// (80%) and once when the plan refuses for it, each at most once per account, limit and month. Only where a plan
// above lifts the limit: the email's point is the way up. lib/quota.ts calls tellLimit where it counts (assertQuota,
// assertRoom) and lib/add-many.ts where a batch runs out of room. The counting is done by then, so the request pays
// for a comparison; the email goes after the response. Service emails: no stop link.
import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { limitMail } from "./mail";
import { lastSent, mailOnce } from "./mail-once";
import { baseUrl, inBackground } from "./notify";
import { accountOf } from "./workspace-core";
import { fillStage, planThatLifts, quotaMonth, type Fill, type FillingLimit } from "./plans";
import { toLocale } from "./i18n/locale";

export type LimitStage = "near" | "reached";

export const limitKey = (stage: LimitStage, accountId: string, limit: FillingLimit, at = new Date()) => `limit-${stage}:${accountId}:${limit}:${quotaMonth(at)}`;

/** Tells the owner of the workspace's billing account, after the response, that `fill` is near or reached */
export function tellLimit(workspaceId: string, fill: Fill): void {
  const stage = fillStage(fill);
  const upgrade = planThatLifts(fill.limit, fill.plan);
  if (!stage || !upgrade) return;
  inBackground(async () => {
    const account = await accountOf(workspaceId);
    if (!account?.ownerUserId) return;
    // A limit already reached this month is past the warning
    if (stage === "near" && (await lastSent(limitKey("reached", account.id, fill.limit)))) return;
    const [owner] = await db.select({ email: schema.user.email, language: schema.user.language }).from(schema.user)
      .where(eq(schema.user.id, account.ownerUserId)).limit(1);
    if (!owner) return;
    await mailOnce(limitKey(stage, account.id, fill.limit), [owner.email],
      limitMail(stage, { ...fill, upgrade, url: `${baseUrl()}/settings/plan` }, toLocale(owner.language)));
  });
}
