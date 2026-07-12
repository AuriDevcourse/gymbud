"use client";

import { useEffect, useRef } from "react";

// Numbers that roll up instead of snapping — the "premium" beat Robinhood and
// Apple Fitness use on totals. requestAnimationFrame lerp writing straight to
// the DOM node (no per-frame re-render). Re-rolls when the value changes, and
// honours reduced-motion. The effect always writes the final value on cleanup so
// a cancelled run (e.g. React StrictMode's mount→cleanup→remount in dev) can
// never leave the number frozen at its initial 0.
export function CountUp({
  value,
  duration = 650,
  className,
  format,
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmtRef = useRef(format);

  // keep the latest formatter, updated in an effect (never during render)
  useEffect(() => {
    fmtRef.current = format;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = fmtRef.current ?? ((n: number) => String(Math.round(n)));
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || value === 0) {
      el.textContent = fmt(value);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      el.textContent = fmt(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else el.textContent = fmt(value);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // guarantee the final value is shown even if the run was cut short
      el.textContent = fmt(value);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {(format ?? ((n: number) => String(Math.round(n))))(0)}
    </span>
  );
}
