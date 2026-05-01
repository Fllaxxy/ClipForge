import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";

export async function POST() {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const user = await getDb().user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true }
  });
  const customerId = user?.subscription?.stripeCustomerId;

  if (!customerId) {
    return NextResponse.json({ error: "No Stripe customer exists for this user." }, { status: 400 });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: absoluteUrl("/settings")
  });

  return NextResponse.json({ url: portal.url });
}
