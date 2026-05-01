"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CheckoutButton({ plan, children }: { plan: "CREATOR" | "PRO"; children: React.ReactNode }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const response = await fetch("/api/billing/checkout", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ plan })
          });
          const json = (await response.json()) as { url?: string; error?: string };
          if (!response.ok || !json.url) {
            toast.error(json.error ?? "Unable to start checkout.");
            return;
          }
          window.location.href = json.url;
        })
      }
    >
      {pending ? "Opening checkout..." : children}
    </Button>
  );
}

export function PortalButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const response = await fetch("/api/billing/portal", { method: "POST" });
          const json = (await response.json()) as { url?: string; error?: string };
          if (!response.ok || !json.url) {
            toast.error(json.error ?? "Unable to open billing portal.");
            return;
          }
          window.location.href = json.url;
        })
      }
    >
      {pending ? "Opening..." : "Manage billing"}
    </Button>
  );
}
