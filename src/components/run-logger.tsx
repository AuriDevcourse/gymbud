"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Footprints, Loader2 } from "lucide-react";
import { Button, Card } from "./ui";
import { Sheet } from "./sheet";
import { api } from "@/lib/format";
import { RUN_KIND_LABELS, type Run, type RunKind } from "@/lib/types";

const KINDS = Object.keys(RUN_KIND_LABELS) as RunKind[];

export function RunLogger() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [km, setKm] = useState("");
  const [min, setMin] = useState("");
  const [kind, setKind] = useState<RunKind>("long");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const distance = parseFloat(km);
    const minutes = parseFloat(min);
    if (!distance || distance <= 0 || !minutes || minutes <= 0) {
      setError("Add a distance and a time.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api<Run>("/api/runs", {
        method: "POST",
        body: JSON.stringify({ distance, duration: Math.round(minutes * 60), kind }),
      });
      setOpen(false);
      setKm("");
      setMin("");
      setKind("long");
      router.refresh(); // refresh streak + stats on the home screen
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const pace =
    parseFloat(km) > 0 && parseFloat(min) > 0
      ? `${(parseFloat(min) / parseFloat(km)).toFixed(1)} min/km`
      : null;

  return (
    <>
      <button onClick={() => setOpen(true)} className="block w-full text-left">
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Footprints size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold">Log a run</p>
            <p className="text-sm text-muted">Distance and time, counts to your streak</p>
          </div>
        </Card>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Log a run">
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`flex-1 rounded-full border px-2 py-2 text-xs font-medium transition ${
                  kind === k
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface-2 text-muted"
                }`}
              >
                {RUN_KIND_LABELS[k]}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <label className="flex-1">
              <span className="mb-1 block text-xs text-muted">Distance (km)</span>
              <input
                type="number"
                inputMode="decimal"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder="5.0"
                aria-label="Distance in kilometres"
                className="stat-num h-12 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 text-xl font-bold outline-none focus:border-accent"
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-xs text-muted">Time (min)</span>
              <input
                type="number"
                inputMode="numeric"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder="30"
                aria-label="Time in minutes"
                className="stat-num h-12 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 text-xl font-bold outline-none focus:border-accent"
              />
            </label>
          </div>
          {pace && <p className="text-sm text-muted">Pace {pace}</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button variant="accent" size="lg" className="w-full" onClick={save} disabled={busy}>
            {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
            Save run
          </Button>
        </div>
      </Sheet>
    </>
  );
}
