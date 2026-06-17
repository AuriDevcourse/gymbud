"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui";
import { api } from "@/lib/format";

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ passcode }),
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Lock size={26} aria-hidden="true" />
        </span>
        <h1 className="display text-2xl font-bold">Coach is locked</h1>
        <p className="text-sm text-muted">Enter your passcode to continue.</p>
      </div>

      <form onSubmit={submit} className="flex w-full flex-col gap-3">
        <label className="sr-only" htmlFor="passcode">
          Passcode
        </label>
        <input
          id="passcode"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          className="h-12 w-full rounded-[var(--radius-md)] border border-border bg-surface px-4 text-center text-lg outline-none focus:border-accent"
        />
        {error && (
          <p className="text-center text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="accent" size="lg" disabled={busy || !passcode}>
          {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
          Unlock
        </Button>
      </form>
    </div>
  );
}
