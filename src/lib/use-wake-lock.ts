"use client";

import { useEffect } from "react";

// Keep the screen on while lifting — the phone sits in hand or on the bench
// between sets and would otherwise lock mid-workout. Progressive enhancement:
// works where the Screen Wake Lock API exists (Chrome, iOS 16.4+ Safari),
// silent no-op elsewhere — same defensive style as haptics.ts.
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = () => {
      navigator.wakeLock
        .request("screen")
        .then((l) => {
          if (cancelled) l.release().catch(() => {});
          else lock = l;
        })
        .catch(() => {
          /* denied (battery saver, hidden tab) — screen just locks as usual */
        });
    };

    acquire();
    // the lock auto-releases whenever the page is hidden — re-acquire on return
    const onVis = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
