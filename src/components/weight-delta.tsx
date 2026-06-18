import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { fmtWeight } from "@/lib/format";
import { changeTone } from "@/lib/bodyweight";
import type { Goal, Unit } from "@/lib/types";

/**
 * Inline up/down change pill. Direction always shown; colour reflects whether
 * the change is good for the goal (green), off-goal (amber), or neutral.
 */
export function WeightDelta({
  delta,
  unit,
  goal,
  label,
}: {
  delta: number | null;
  unit: Unit;
  goal?: Goal;
  label?: string;
}) {
  if (delta === null) return null;

  const flat = Math.abs(delta) < 0.05;
  const tone = flat || !goal ? "neutral" : changeTone(delta, goal);
  const color =
    tone === "good" ? "text-good" : tone === "bad" ? "text-back-off" : "text-muted";
  const Icon = flat ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const sign = delta > 0 ? "+" : "−";

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${color}`}>
      <Icon size={14} aria-hidden="true" />
      {flat ? "No change" : `${sign}${fmtWeight(Math.abs(delta), unit)}`}
      {label && <span className="ml-0.5 text-xs font-normal text-muted">{label}</span>}
    </span>
  );
}
