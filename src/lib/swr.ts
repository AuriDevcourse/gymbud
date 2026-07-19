"use client";

import { useEffect, useState } from "react";
import { api } from "./format";

// Tiny stale-while-revalidate cache. In-memory (survives client-side
// navigation within the session), so revisiting a tab/exercise is instant
// while we silently refetch in the background. No hydration mismatch: the
// cache is empty on the server and on the first client render.
const mem = new Map<string, unknown>();

export function peek<T>(key: string): T | undefined {
  return mem.get(key) as T | undefined;
}
export function poke<T>(key: string, val: T): void {
  mem.set(key, val);
}
/** Invalidate cached entries by key prefix (an exact key is its own prefix). */
export function drop(prefix: string): void {
  for (const k of [...mem.keys()]) if (k.startsWith(prefix)) mem.delete(k);
}

export interface SWRResult<T> {
  data: T | undefined;
  loading: boolean; // true only when there's nothing cached yet
  error: string | null;
  mutate: (val: T) => void;
  refresh: () => void;
}

export function useApi<T>(url: string | null): SWRResult<T> {
  const [data, setData] = useState<T | undefined>(() =>
    url ? (mem.get(url) as T | undefined) : undefined,
  );
  const [loading, setLoading] = useState(data === undefined);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    api<T>(url)
      .then((v) => {
        if (cancelled) return;
        mem.set(url, v);
        setData(v);
        setLoading(false);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, tick]);

  return {
    data,
    loading,
    error,
    mutate: (v: T) => {
      if (url) mem.set(url, v);
      setData(v);
    },
    refresh: () => setTick((t) => t + 1),
  };
}
