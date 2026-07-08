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

// ── Audio cue ────────────────────────────────────────────────────────────────
// iOS Safari ignores navigator.vibrate entirely, so the rest-timer buzz never
// lands on an iPhone. A short WebAudio beep is the one alert that DOES work
// there — but only if the AudioContext was unlocked inside a user gesture. We
// prime it when a set is logged (a tap) so the beep can fire later when rest ends.
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) {
    try {
      audioCtx = new AC();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** Unlock audio from a user gesture (logging a set) so the rest-end beep works on iOS. */
export function primeAudio(): void {
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}

/** Rest is over: a rising double-beep (the cue that actually lands on iPhone) plus a buzz. */
export function restDoneCue(): void {
  buzz([0, 120, 80, 120]);
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const beep = (offset: number, freq: number) => {
    const t = ctx.currentTime + offset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.24);
  };
  beep(0, 880);
  beep(0.24, 1175);
}
