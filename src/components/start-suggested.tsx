"use client";

import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "./ui";
import { tapHaptic } from "@/lib/haptics";

// Shared hand-off key: StartSuggested writes the intent, WorkoutClient fulfills it.
export const PENDING_WORKOUT_KEY = "gymbud:pending-workout";

export function StartSuggested({
  exerciseIds,
  label = "Start this workout",
}: {
  exerciseIds: string[];
  label?: string;
}) {
  const router = useRouter();

  // Optimistic: navigate instantly, create the session on the workout page.
  const start = () => {
    tapHaptic();
    try {
      sessionStorage.setItem(PENDING_WORKOUT_KEY, JSON.stringify({ exerciseIds }));
    } catch {
      /* sessionStorage unavailable — the workout page falls back to manual start */
    }
    router.push("/workout");
  };

  return (
    <Button variant="accent" size="lg" className="w-full" onClick={start}>
      <Play size={18} aria-hidden="true" />
      {label}
    </Button>
  );
}
