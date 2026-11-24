// Payment with Stripe (#90). One subscription per billing account: whoever pays (billing_account.owner_user_id) starts
// it with Checkout from Settings, Plan and manages it in Stripe's Customer Portal (card, invoices, plan, cancelling).
// Stripe's webhook (app/api/stripe/webhook/route.ts) keeps the subscription table and the account's plan in step:
// every change goes through changePlan (lib/plan-change.ts), as a partner's does.
// Prices are found by lookup key, `<plan>_<period>` (duo_month, studio_year…), set up in Stripe with EUR and USD at the
// same figure and VAT on top (Stripe Tax). Our official invoices are TicketBAI ones the accountant issues for each charge:
// Stripe's invoice is the customer's receipt.
import "server-only";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { PLAN_PERIODS, type PlanPeriod } from "./db/schema";
import { isPaid, isPlanKey, planOf, type PlanKey } from "./plans";
import { changePlan } from "./plan-change";
import { HttpError } from "./workspace-core";
import { log } from "./log";

const B = schema.billingAccount, S = schema.subscription;

let client: Stripe | null = null;
/** The Stripe client. Throws when STRIPE_SECRET_KEY is not set, so a page that only reads the plan never needs it */
export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client = new Stripe(key);
  return client;
}

export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY?.trim();

/** A price's lookup key, and back */
export const priceKey = (plan: PlanKey, period: PlanPeriod) => `${plan}_${period}`;
export function parsePriceKey(key: string | null | undefined): { plan: PlanKey; period: PlanPeriod } | null {
  const [plan, period] = (key ?? "").split("_");
  if (!isPlanKey(plan) || !isPaid(planOf(plan)) || !(PLAN_PERIODS as readonly string[]).includes(period)) return null;
  return { plan, period: period as PlanPeriod };
}

async function priceId(plan: PlanKey, period: PlanPeriod): Promise<string> {
  const { data } = await stripe().prices.list({ lookup_keys: [priceKey(plan, period)], active: true, limit: 1 });
  if (!data[0]) throw new Error(`No Stripe price with lookup key ${priceKey(plan, period)}`);
  return data[0].id;
}

/** The account's Stripe customer, made the first time it pays. Its id stays on the account for its invoices */
async function customerOf(accountId: string, user: { email: string; name?: string | null }): Promise<string> {
  const [a] = await db.select({ customer: B.stripeCustomerId, name: B.name }).from(B).where(eq(B.id, accountId));
  if (!a) throw new Error("Billing account not found");
  if (a.customer) return a.customer;
  const c = await stripe().customers.create({ email: user.email, name: user.name ?? undefined, metadata: { billing_account_id: accountId } },
    { idempotencyKey: `customer:${accountId}` });
  await db.update(B).set({ stripeCustomerId: c.id }).where(eq(B.id, accountId));
  return c.id;
}

/** The account's subscription row, when Stripe still counts it as running */
export async function liveSubscription(accountId: string) {
  const [s] = await db.select().from(S).where(eq(S.billingAccountId, accountId));
  return s && !["canceled", "incomplete_expired"].includes(s.status) ? s : null;
}

/**
 * Where the payer goes to pay for `plan`: Stripe's Checkout. An account already paying changes plan in the portal
 * instead, so it never holds two subscriptions.
 */
export async function checkoutUrl(r: { accountId: string; user: { id: string; email: string; name?: string | null }; plan: PlanKey; period: PlanPeriod; appUrl: string; locale?: string }): Promise<string> {
  if (!isPaid(planOf(r.plan))) throw new HttpError(400, "Not a paid plan");
  if (await liveSubscription(r.accountId)) return portalUrl(r.accountId, r.appUrl);
  const customer = await customerOf(r.accountId, r.user);
  const back = `${r.appUrl}/settings/plan`;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: r.accountId,
    line_items: [{ price: await priceId(r.plan, r.period), quantity: 1 }],
    subscription_data: { metadata: { billing_account_id: r.accountId } },
    metadata: { billing_account_id: r.accountId },
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    billing_address_collection: "required",
    customer_update: { address: "auto", name: "auto" },
    allow_promotion_codes: true,
    locale: r.locale === "es" ? "es" : "auto",
    success_url: `${back}?paid=1`,
    cancel_url: back,
  });
  if (!session.url) throw new Error("Stripe returned a checkout session without a URL");
  return session.url;
}

/** Stripe's Customer Portal for the account: card, invoices, plan and cancelling */
export async function portalUrl(accountId: string, appUrl: string): Promise<string> {
  const [a] = await db.select({ customer: B.stripeCustomerId }).from(B).where(eq(B.id, accountId));
  if (!a?.customer) throw new HttpError(409, "This plan has no payment in Stripe");
  const s = await stripe().billingPortal.sessions.create({ customer: a.customer, return_url: `${appUrl}/settings/plan` });
  return s.url;
}

/** The plan a subscription in this state gives: its price's while it runs or a charge is being retried, else free */
function planFrom(sub: Stripe.Subscription): { plan: PlanKey; period: PlanPeriod; priceKey: string } | null {
  const price = sub.items.data[0]?.price;
  const parsed = parsePriceKey(price?.lookup_key);
  if (!parsed) return null;
  return { ...parsed, priceKey: price!.lookup_key! };
}

const RUNNING: Stripe.Subscription.Status[] = ["active", "trialing", "past_due"];

/**
 * Writes what Stripe says of a subscription and sets the account's plan to match: the subscription's plan while it
 * runs (a charge being retried, past_due, keeps it: Stripe's retries are the grace days), free once it ends.
 */
export async function syncSubscription(sub: Stripe.Subscription, appUrl: string): Promise<void> {
  const accountId = sub.metadata?.billing_account_id
    ?? (await db.select({ id: B.id }).from(B).where(eq(B.stripeCustomerId, typeof sub.customer === "string" ? sub.customer : sub.customer.id)))[0]?.id;
  if (!accountId) { log.warn("stripe.subscription_without_account", { subscription: sub.id }); return; }
  const p = planFrom(sub);
  if (!p) { log.error("stripe.unknown_price", { subscription: sub.id, price: sub.items.data[0]?.price.id }); return; }

  // A newer subscription of the account replaces the row; an old one ending later must not take the new one's plan away
  const [row] = await db.select({ id: S.id, status: S.status }).from(S).where(eq(S.billingAccountId, accountId));
  if (row && row.id !== sub.id && !RUNNING.includes(sub.status)) return;

  const item = sub.items.data[0];
  const at = (s?: number | null) => (s ? new Date(s * 1000) : null);
  const values = {
    id: sub.id, billingAccountId: accountId, priceKey: p.priceKey, plan: p.plan, period: p.period, status: sub.status,
    currentPeriodStart: at(item?.current_period_start), currentPeriodEnd: at(item?.current_period_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end, updatedAt: new Date(),
  };
  await db.insert(S).values(values).onConflictDoUpdate({ target: S.billingAccountId, set: values });

  const want: PlanKey = RUNNING.includes(sub.status) ? p.plan : "free";
  const [a] = await db.select({ plan: B.plan, until: B.planUntil }).from(B).where(eq(B.id, accountId));
  if (a && (a.plan !== want || a.until)) await changePlan({ accountId, plan: want, cause: "stripe", appUrl });
}
