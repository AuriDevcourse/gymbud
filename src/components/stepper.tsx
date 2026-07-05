"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const set = (v: number) => onChange(clamp(Math.round(v * 100) / 100));

  // While the field is focused we show the raw text the user is typing (draft),
  // so an existing "0" can be typed straight over instead of becoming "012".
  // `.select()` alone is unreliable on mobile keyboards, so we clear on focus.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (Number.isFinite(value) ? String(value) : "0");

  return (
    <div className="flex-1">
      <span className="mb-1 block text-center text-[0.7rem] font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => set(value - step)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface-2 text-foreground active:bg-surface-3"
        >
          <Minus size={20} aria-hidden="true" />
        </button>
        <div className="relative flex-1">
          <input
            type="number"
            inputMode="decimal"
            aria-label={label}
            value={shown}
            onFocus={(e) => {
              // start a blank draft so the first keystroke replaces the value
              setDraft("");
              e.currentTarget.select();
            }}
            onChange={(e) => {
              setDraft(e.target.value);
              set(parseFloat(e.target.value) || 0);
            }}
            onBlur={() => setDraft(null)}
            className={`stat-num h-12 w-full rounded-[var(--radius-md)] border border-border bg-background text-center text-2xl font-bold text-foreground outline-none focus:border-accent ${
              suffix ? "pr-7" : ""
            }`}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.7rem] font-medium text-muted">
              {suffix}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => set(value + step)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-accent text-accent-foreground active:brightness-95"
        >
          <Plus size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
