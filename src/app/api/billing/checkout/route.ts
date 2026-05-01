import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth";
import { getPlanLimits, getStripePriceId } from "@/lib/billing/plans";
import { getDb } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";
import { getStripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  plan: z.enum(["CREATOR", "PRO"])
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose Creator or Pro." }, { status: 400 });
  }

  const stripe = getStripe();
  const priceId = getStripePriceId(parsed.data.plan);
  if (!stripe || !priceId) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY and the plan price ID." },
      { status: 503 }
    );
  }

  const user = await getDb().user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: { subscription: true }
  });
  const limits = getPlanLimits(parsed.data.plan);

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: user.subscription?.stripeCustomerId ?? undefined,
    customer_email: user.subscription?.stripeCustomerId ? undefined : user.email ?? undefined,
    client_reference_id: user.id,
    metadata: {
      userId: user.id,
      plan: parsed.data.plan
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        plan: parsed.data.plan
      }
    },
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: absoluteUrl("/settings?billing=success"),
    cancel_url: absoluteUrl("/pricing?billing=cancelled")
  });

  return NextResponse.json({
    url: checkout.url,
    plan: limits.label
  });
}
