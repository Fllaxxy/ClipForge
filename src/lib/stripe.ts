import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true
    });
  }

  return stripeClient;
}
