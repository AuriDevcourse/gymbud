"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

// Route-level error boundary — a friendly retry instead of Next's raw
// "Application error" page when a server component / data fetch throws.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle size={26} aria-hidden="true" />
      </div>
      <h1 className="display text-2xl font-bold">Something went wrong</h1>
      <p className="max-w-[30ch] text-sm text-muted">
        That page hit a snag loading. Give it another go.
      </p>
      <Button variant="accent" size="lg" className="mt-2" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
