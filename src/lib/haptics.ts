// Tiny haptic helper — a physical "tick" on meaningful actions makes logging
// feel native instead of flat. Progressive enhancement: works on Android
// Chrome, a silent no-op on iOS Safari (which lacks the Vibration API) and
// desktop. Only fire on user-initiated wins, never on scroll/hover.

function buzz(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  // Respect reduced-motion as a proxy for "keep it calm".
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    /* some browsers throw if the gesture isn't trusted — ignore */
  }
}

/** A light tick — set logged, primary tap. */
export const tapHaptic = () => buzz(8);

/** A confident double-pulse — PR, workout finished. */
export const successHaptic = () => buzz([0, 22, 45, 30]);
