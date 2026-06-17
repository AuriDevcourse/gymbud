"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, VideoOff } from "lucide-react";
import { Sheet } from "./sheet";
import { api } from "@/lib/format";

interface Meta {
  available: boolean;
  frames: number;
  name?: string;
  instructions?: string[];
}

function youtubeSearch(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    "how to " + name + " proper form",
  )}`;
}

/** Inline demo: crossfades start/end photos to imply motion, lists the steps. */
export function DemoImage({
  exerciseId,
  name,
}: {
  exerciseId: string;
  name: string;
}) {
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<Meta>(`/api/demo/${exerciseId}`)
      .then((m) => !cancelled && setMeta(m))
      .catch(() => !cancelled && setMeta({ available: false, frames: 0 }));
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  if (!meta) {
    return (
      <div className="flex h-56 items-center justify-center rounded-[var(--radius-md)] bg-surface-2 text-muted">
        <Loader2 className="animate-spin" aria-label="Loading demo" />
      </div>
    );
  }

  if (!meta.available) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-border bg-surface-2 px-4 py-6 text-center">
        <VideoOff size={26} className="text-muted" aria-hidden="true" />
        <p className="text-sm text-muted">No built-in demo for this one.</p>
        <a
          href={youtubeSearch(name)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent press"
        >
          Watch on YouTube
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-60 overflow-hidden rounded-[var(--radius-md)] bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- cached photo from our own API */}
        <img
          src={`/api/demo/${exerciseId}/0`}
          alt={`${name} start position`}
          className="absolute inset-0 mx-auto h-full w-full object-contain"
        />
        {meta.frames > 1 && (
          // eslint-disable-next-line @next/next/no-img-element -- cached photo from our own API
          <img
            src={`/api/demo/${exerciseId}/1`}
            alt={`${name} end position`}
            className="demo-crossfade absolute inset-0 mx-auto h-full w-full object-contain"
          />
        )}
      </div>
      {meta.instructions && meta.instructions.length > 0 && (
        <ol className="mt-3 flex flex-col gap-1.5">
          {meta.instructions.slice(0, 6).map((step, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted-strong">
              <span className="stat-num shrink-0 text-accent">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function DemoSheet({
  open,
  onClose,
  exerciseId,
  name,
}: {
  open: boolean;
  onClose: () => void;
  exerciseId: string | null;
  name: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={name || "How to"}>
      {exerciseId && <DemoImage exerciseId={exerciseId} name={name} />}
    </Sheet>
  );
}
