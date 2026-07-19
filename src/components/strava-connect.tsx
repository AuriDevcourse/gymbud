"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Loader2, RefreshCw, Unplug } from "lucide-react";
import { Button, SectionTitle } from "./ui";
import { api } from "@/lib/format";

interface Status {
  configured: boolean;
  connected: boolean;
  athlete: string;
}

// Settings section: connect Strava and pull watch/phone runs into the log.
// (Apple Health exposes no web API — a phone that syncs to Strava is the
// practical bridge for a web app like this.)
const FLAG_MSG: Record<string, string> = {
  connected: "Strava connected. Sync to pull in your runs.",
  denied: "Strava connection was cancelled.",
  error: "Strava connection failed — try again.",
};

export function StravaConnect() {
  const router = useRouter();
  const params = useSearchParams();
  const flag = params.get("strava");
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  // seed the message from the OAuth redirect flag (?strava=connected|denied|error)
  const [msg, setMsg] = useState<string | null>(() => (flag ? (FLAG_MSG[flag] ?? null) : null));

  useEffect(() => {
    api<Status>("/api/strava")
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  // the flag has been read into state — clean it out of the URL
  useEffect(() => {
    if (flag) router.replace("/settings", { scroll: false });
  }, [flag, router]);

  const sync = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ imported: number; scanned: number }>("/api/strava/sync", {
        method: "POST",
      });
      setMsg(
        r.imported > 0
          ? `Imported ${r.imported} new run${r.imported === 1 ? "" : "s"} from Strava.`
          : `Up to date — no new runs (checked ${r.scanned}).`,
      );
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await api("/api/strava", { method: "DELETE" });
      setStatus((s) => (s ? { ...s, connected: false, athlete: "" } : s));
      setMsg("Strava disconnected.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;

  return (
    <section>
      <SectionTitle>Connected apps</SectionTitle>
      {!status.configured ? (
        <p className="text-sm text-muted">
          Strava sync is ready in the code but needs API keys: create a free app at
          strava.com/settings/api, then set <code>STRAVA_CLIENT_ID</code> and{" "}
          <code>STRAVA_CLIENT_SECRET</code>.
        </p>
      ) : status.connected ? (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm">
            <Activity size={16} className="text-accent" aria-hidden="true" />
            <span>
              Strava connected{status.athlete ? ` as ${status.athlete}` : ""} — runs recorded on
              your watch or phone import here.
            </span>
          </p>
          <div className="flex gap-2">
            <Button variant="accent" size="md" className="flex-1" onClick={sync} disabled={busy}>
              {busy ? (
                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw size={15} aria-hidden="true" />
              )}
              Sync now
            </Button>
            <Button variant="outline" size="md" onClick={disconnect} disabled={busy}>
              <Unplug size={15} aria-hidden="true" />
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            Pull runs from your watch or phone automatically — connect Strava and every synced run
            lands in your log (and streak).
          </p>
          <Button
            variant="accent"
            size="md"
            className="w-full"
            onClick={() => {
              window.location.href = "/api/strava/connect";
            }}
          >
            <Activity size={15} aria-hidden="true" />
            Connect Strava
          </Button>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-muted-strong">{msg}</p>}
    </section>
  );
}
