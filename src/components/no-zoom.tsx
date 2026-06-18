"use client";

import { useEffect } from "react";

/**
 * Blocks iOS Safari pinch-zoom, which ignores `maximum-scale` / `touch-action`.
 * Double-tap zoom is already handled by `touch-action: pan-x pan-y` in CSS, so
 * we deliberately don't touch `touchend` here (it would eat rapid stepper taps).
 * Single-user gym app — accidental zoom mid-set is just noise.
 */
export function NoZoom() {
  useEffect(() => {
    const stopGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stopGesture);
    document.addEventListener("gesturechange", stopGesture);
    document.addEventListener("gestureend", stopGesture);
    return () => {
      document.removeEventListener("gesturestart", stopGesture);
      document.removeEventListener("gesturechange", stopGesture);
      document.removeEventListener("gestureend", stopGesture);
    };
  }, []);

  return null;
}
