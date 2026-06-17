import { TrendingUp, Minus, TrendingDown, Sparkles } from "lucide-react";
import type { CoachAction } from "@/lib/types";

const MAP: Record<
  CoachAction,
  { label: string; icon: typeof TrendingUp; cls: string }
> = {
  increase: {
    label: "Push harder",
    icon: TrendingUp,
    cls: "text-push border-push/40 bg-push/10",
  },
  maintain: {
    label: "Hold steady",
    icon: Minus,
    cls: "text-good border-good/40 bg-good/10",
  },
  back_off: {
    label: "Back off",
    icon: TrendingDown,
    cls: "text-back-off border-back-off/40 bg-back-off/10",
  },
  start: {
    label: "New lift",
    icon: Sparkles,
    cls: "text-muted border-border bg-surface-2",
  },
};

export function CoachBadge({ action }: { action: CoachAction }) {
  const { label, icon: Icon, cls } = MAP[action];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  );
}
