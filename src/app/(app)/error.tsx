"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription className="mt-2">
        The page could not load. Try again; if it persists, check the worker and database logs.
      </AlertDescription>
      <Button className="mt-4" variant="secondary" onClick={reset}>
        Try again
      </Button>
    </Alert>
  );
}
