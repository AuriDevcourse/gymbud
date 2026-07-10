"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { setReadiness, READINESS_LABELS, type Readiness } from "@/lib/readiness";

// App-wide re-entry greeting. When you come back after being away for ≥1 hour,
// it welcomes you and asks how strong you feel — the answer gently nudges today's
// suggested weights. Throttled by a last-active timestamp so it never pops when
// you just flick to another app for a moment.
const LAST_ACTIVE = "gymbud:lastActive";
const AWAY_MS = 60 * 60 * 1000; // 1 hour
const READINESS: Readiness[] = ["drained", "okay", "strong"];

export function WelcomeBack() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Never over the onboarding/lock screens.
    if (pathname === "/welcome" || pathname === "/login") return;

    let last = 0;
    let onboarded = false;
    try {
      last = Number(localStorage.getItem(LAST_ACTIVE)) || 0;
      // "gymbud:program" is written during onboarding — a good "has used the app" gate.
      onboarded = Boolean(localStorage.getItem("gymbud:program"));
      localStorage.setItem(LAST_ACTIVE, String(Date.now()));
    } catch {
      return;
    }

    const away = Date.now() - last;
    // One-time mount decision based on localStorage (unavailable during SSR, so
    // it can't be a render-time value without a hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (onboarded && last > 0 && away > AWAY_MS) setOpen(true);

    // Keep the timestamp fresh so a long session doesn't later count as "away".
    const bump = () => {
      try {
        localStorage.setItem(LAST_ACTIVE, String(Date.now()));
      } catch {
        /* ignore */
      }
    };
    const onHide = () => {
      if (document.hidden) bump();
    };
    document.addEventListener("visibilitychange", onHide);
    const t = setInterval(bump, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      clearInterval(t);
    };
  }, [pathname]);

  if (!open) return null;

  const choose = (r: Readiness) => {
    setReadiness(r);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 px-4 pb-8 pt-16 backdrop-blur-sm sm:items-center">
      <div className="animate-slide-up w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-2xl shadow-black/60">
        <p className="text-sm text-muted">Welcome back 👋</p>
        <h2 className="display mt-0.5 text-2xl font-bold">How strong do you feel today?</h2>
        <p className="mt-1 text-sm text-muted">
          I&apos;ll nudge today&apos;s suggested weights to match.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {READINESS.map((r) => (
            <button
              key={r}
              onClick={() => choose(r)}
              className="flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface-2 py-4 font-semibold transition active:scale-95 active:bg-surface-3"
            >
              <span className="text-3xl" aria-hidden="true">
                {READINESS_LABELS[r].emoji}
              </span>
              <span className="text-sm">{READINESS_LABELS[r].label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="mt-3 w-full py-2 text-center text-xs text-muted active:text-foreground"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
