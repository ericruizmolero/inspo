import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { stripe, syncSubscription } from "@/lib/stripe";
import { log } from "@/lib/log";
import { appBase } from "@/lib/admin-action";

// Stripe's webhook (lib/stripe.ts). Open in proxy.ts: Stripe has no session, the signature is the check. Each event
// is written to stripe_event first, so one Stripe sends twice is handled once; if handling fails the row goes, and
// Stripe's retry runs it again.
const E = schema.stripeEvent;

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return Response.json({ error: "unconfigured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch (err) {
    log.warn("stripe.bad_signature", { err });
    return Response.json({ error: "bad signature" }, { status: 400 });
  }

  const fresh = await db.insert(E).values({ id: event.id, type: event.type }).onConflictDoNothing().returning({ id: E.id });
  if (!fresh.length) return Response.json({ received: true, duplicate: true });

  try {
    await handle(event, await appBase());
  } catch (err) {
    await db.delete(E).where(eq(E.id, event.id));
    log.error("stripe.webhook_failed", { err, event: event.id, type: event.type });
    return Response.json({ error: "failed" }, { status: 500 });
  }
  return Response.json({ received: true });
}

async function handle(event: Stripe.Event, appUrl: string) {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (s.mode === "subscription" && s.subscription) {
        const id = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
        await syncSubscription(await stripe().subscriptions.retrieve(id), appUrl);
      }
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // The event's copy can be older than another already handled: read the subscription as it is now
      await syncSubscription(await stripe().subscriptions.retrieve(event.data.object.id), appUrl);
      return;
    case "invoice.payment_failed": {
      // Stripe retries the charge and emails the customer; the plan holds while it does (past_due) and goes to free
      // when Stripe gives up and ends the subscription
      log.warn("stripe.payment_failed", { invoice: event.data.object.id, customer: event.data.object.customer });
      return;
    }
  }
}
