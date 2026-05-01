import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function planFromPrice(priceId?: string | null) {
  if (!priceId) return undefined;
  if (priceId === process.env.STRIPE_CREATOR_PRICE_ID) return "CREATOR" as const;
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "PRO" as const;
  return undefined;
}

async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const firstItem = subscription.items.data[0];
  const plan = planFromPrice(firstItem?.price.id) ?? (subscription.metadata.plan as "CREATOR" | "PRO" | undefined);
  const userId = subscription.metadata.userId;

  if (!userId || !plan) {
    return;
  }

  await getDb().subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      plan,
      status: subscription.status,
      currentPeriodEnd: new Date(((subscription as unknown as { current_period_end: number }).current_period_end ?? 0) * 1000)
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      plan,
      status: subscription.status,
      currentPeriodEnd: new Date(((subscription as unknown as { current_period_end: number }).current_period_end ?? 0) * 1000)
    }
  });
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkout = event.data.object as Stripe.Checkout.Session;
    const userId = checkout.metadata?.userId ?? checkout.client_reference_id ?? undefined;
    const plan = checkout.metadata?.plan as "CREATOR" | "PRO" | undefined;
    if (userId && plan) {
      await getDb().subscription.upsert({
        where: { userId },
        create: {
          userId,
          stripeCustomerId: typeof checkout.customer === "string" ? checkout.customer : undefined,
          stripeSubscriptionId:
            typeof checkout.subscription === "string" ? checkout.subscription : undefined,
          plan,
          status: "active"
        },
        update: {
          stripeCustomerId: typeof checkout.customer === "string" ? checkout.customer : undefined,
          stripeSubscriptionId:
            typeof checkout.subscription === "string" ? checkout.subscription : undefined,
          plan,
          status: "active"
        }
      });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    await upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription);
  }

  return NextResponse.json({ received: true });
}
