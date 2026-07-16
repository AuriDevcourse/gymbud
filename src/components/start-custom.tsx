"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Card } from "./ui";
import { tapHaptic } from "@/lib/haptics";
import { PENDING_WORKOUT_KEY } from "./start-suggested";

// "Build your own": start a blank session and drop straight into the exercise
// picker. Reuses the same pending-workout hand-off StartSuggested writes, with
// openPicker so WorkoutClient skips the warm-up and opens the picker for you.
// Renders as a prominent home card ("card") or a low-key inline button ("link").
export function StartCustom({ as = "card" }: { as?: "card" | "link" }) {
  const router = useRouter();

  const start = () => {
    tapHaptic();
    try {
      sessionStorage.setItem(
        PENDING_WORKOUT_KEY,
        JSON.stringify({ exerciseIds: [], openPicker: true }),
      );
    } catch {
      /* sessionStorage unavailable — WorkoutClient falls back to manual start */
    }
    router.push("/workout");
  };

  if (as === "link") {
    return (
      <Button variant="ghost" className="mt-2 w-full" onClick={start}>
        Or start an empty workout
      </Button>
    );
  }

  return (
    <button onClick={start} className="block w-full text-left">
      <Card className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Plus size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold">Build your own</p>
          <p className="text-sm text-muted">Start a blank workout, add any exercises</p>
        </div>
      </Card>
    </button>
  );
}
