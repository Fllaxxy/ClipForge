import Link from "next/link";
import { Check, Clapperboard } from "lucide-react";
import { CheckoutButton } from "@/components/billing-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    key: "FREE",
    name: "Free",
    price: "$0",
    description: "Test the complete pipeline",
    features: ["30 minutes/month", "3 clips/project", "ClipForge watermark", "Mock provider ready for dev"]
  },
  {
    key: "CREATOR",
    name: "Creator",
    price: "$29",
    description: "For weekly publishing",
    features: ["300 minutes/month", "20 clips/project", "No watermark", "Hosted provider support"]
  },
  {
    key: "PRO",
    name: "Pro",
    price: "$99",
    description: "For agencies and teams",
    features: ["1500 minutes/month", "Priority queue", "Batch processing", "No watermark"]
  }
] as const;

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Clapperboard className="h-5 w-5 text-primary" />
            ClipForge
          </Link>
          <Button asChild variant="secondary">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-2xl">
          <Badge className="mb-4">Simple creator pricing</Badge>
          <h1 className="text-5xl font-semibold leading-tight">Scale your clip output with minutes that match your workflow</h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Free exports include a watermark. Creator and Pro remove it and unlock higher monthly processing limits.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.key} className={plan.key === "CREATOR" ? "border-primary shadow-glow" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {plan.key === "CREATOR" ? <Badge>Popular</Badge> : null}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-semibold">{plan.price}</div>
                <p className="mt-1 text-sm text-muted-foreground">per month</p>
                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {plan.key === "FREE" ? (
                    <Button asChild className="w-full" variant="secondary">
                      <Link href="/login">Start free</Link>
                    </Button>
                  ) : (
                    <CheckoutButton plan={plan.key}>Subscribe to {plan.name}</CheckoutButton>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
