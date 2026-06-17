"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Dumbbell, Loader2 } from "lucide-react";
import { Button } from "./ui";
import { api } from "@/lib/format";
import { todayISO } from "@/lib/date";
import type { Equipment } from "@/lib/exercise-library";
import {
  EQUIPMENT_LABELS,
  GOAL_LABELS,
  type Goal,
  type Profile,
  type Unit,
} from "@/lib/types";

const GOALS = Object.keys(GOAL_LABELS) as Goal[];
const EQUIPMENT = Object.keys(EQUIPMENT_LABELS) as Equipment[];
const STEPS = ["Goal", "Body weight", "Frequency", "Equipment"] as const;

export function WelcomeWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>("muscle_gain");
  const [unit, setUnit] = useState<Unit>("kg");
  const [weight, setWeight] = useState("");
  const [days, setDays] = useState(3);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const last = step === STEPS.length - 1;

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      await api<Profile>("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          goal,
          daysPerWeek: days,
          equipment,
          unit,
          onboarded: true,
        }),
      });
      const w = parseFloat(weight);
      if (w > 0) {
        await api("/api/bodyweight", {
          method: "POST",
          body: JSON.stringify({ weight: w, loggedAt: todayISO() }),
        });
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] flex-col">
      {/* header */}
      <div className="mb-6 mt-2 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Dumbbell size={22} aria-hidden="true" />
        </span>
        <div>
          <h1 className="display text-2xl font-bold leading-tight">Welcome to GymBud</h1>
          <p className="text-sm text-muted">Set yourself up. Takes 20 seconds.</p>
        </div>
      </div>

      {/* progress */}
      <div className="mb-6 flex gap-1.5" aria-hidden="true">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i <= step ? "bg-accent" : "bg-surface-2"
            }`}
          />
        ))}
      </div>

      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>

      {/* step body */}
      <div className="flex-1">
        {step === 0 && (
          <>
            <h2 className="display mb-4 text-xl font-bold">What&apos;s your goal?</h2>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  aria-pressed={goal === g}
                  className={`rounded-[var(--radius-md)] border px-3 py-4 text-sm font-medium transition ${
                    goal === g
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface text-muted-strong"
                  }`}
                >
                  {GOAL_LABELS[g]}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="display mb-1 text-xl font-bold">Your current weight</h2>
            <p className="mb-4 text-sm text-muted">We&apos;ll track the trend. You can skip this.</p>
            <div className="mb-4 flex gap-2">
              {(["kg", "lb"] as Unit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  aria-pressed={unit === u}
                  className={`flex-1 rounded-[var(--radius-md)] border py-2.5 font-semibold uppercase transition ${
                    unit === u
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-surface text-muted-strong"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={`Weight in ${unit}`}
              aria-label="Current body weight"
              className="stat-num h-14 w-full rounded-[var(--radius-md)] border border-border bg-surface px-4 text-center text-2xl font-bold outline-none focus:border-accent"
            />
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="display mb-4 text-xl font-bold">Days per week?</h2>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  aria-pressed={days === d}
                  className={`stat-num rounded-[var(--radius-md)] border py-4 text-xl font-bold transition ${
                    days === d
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-surface text-muted-strong"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">
              Drives how your suggested sessions are split.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="display mb-1 text-xl font-bold">What can you train with?</h2>
            <p className="mb-4 text-sm text-muted">
              Pick what you have. Leave empty to assume everything.
            </p>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT.map((e) => {
                const on = equipment.includes(e);
                return (
                  <button
                    key={e}
                    onClick={() =>
                      setEquipment((cur) =>
                        on ? cur.filter((x) => x !== e) : [...cur, e],
                      )
                    }
                    aria-pressed={on}
                    className={`rounded-full border px-3.5 py-2.5 text-sm font-medium transition ${
                      on
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-surface text-muted-strong"
                    }`}
                  >
                    {EQUIPMENT_LABELS[e]}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {error && <p className="mb-3 text-center text-sm text-danger">{error}</p>}

      {/* nav */}
      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <Button variant="surface" size="lg" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft size={18} aria-hidden="true" />
            Back
          </Button>
        )}
        {!last ? (
          <Button
            variant="accent"
            size="lg"
            className="flex-1"
            onClick={() => setStep((s) => s + 1)}
          >
            Next
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        ) : (
          <Button
            variant="accent"
            size="lg"
            className="flex-1"
            onClick={finish}
            disabled={busy}
          >
            {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
            Start training
          </Button>
        )}
      </div>
    </div>
  );
}
