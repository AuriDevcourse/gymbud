"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Lightbulb, VideoOff } from "lucide-react";
import { Sheet } from "./sheet";
import { api } from "@/lib/format";
import { EXERCISES_BY_ID } from "@/lib/exercise-library";
import { cuesFor } from "@/lib/cues";

interface Meta {
  available: boolean;
  frames: number;
  name?: string;
  instructions?: string[];
  images?: string[];
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
  const ex = EXERCISES_BY_ID[exerciseId];
  const cues = ex ? cuesFor(ex) : null;

  useEffect(() => {
    let cancelled = false;
    api<Meta>(`/api/demo/${exerciseId}`)
      .then((m) => !cancelled && setMeta(m))
      .catch(() => !cancelled && setMeta({ available: false, frames: 0 }));
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  return (
    <div>
      {/* Our own coaching cues — always present, so guidance never depends on
          whether an external photo happened to match (or matched wrongly). */}
      {cues && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-accent/25 bg-accent/5 p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
            <Lightbulb size={14} aria-hidden="true" /> How to do it well
          </p>
          <ul className="flex flex-col gap-2">
            {cues.cues.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted-strong">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Visual demo — loads the public-domain photo when we have a confident match. */}
      {!meta ? (
        <div className="flex h-40 items-center justify-center rounded-[var(--radius-md)] bg-surface-2 text-muted">
          <Loader2 className="animate-spin" aria-label="Loading demo" />
        </div>
      ) : meta.available ? (
        <>
          <div className="relative h-60 overflow-hidden rounded-[var(--radius-md)] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- public-domain photo from CDN */}
            <img
              src={meta.images?.[0]}
              alt={`${name} start position`}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {meta.frames > 1 && meta.images?.[1] && (
              // eslint-disable-next-line @next/next/no-img-element -- public-domain photo from CDN
              <img
                src={meta.images[1]}
                alt={`${name} end position`}
                className="demo-crossfade absolute inset-0 h-full w-full object-cover"
              />
            )}
          </div>
          {meta.instructions && meta.instructions.length > 0 && (
            <ol className="mt-4 flex flex-col gap-3">
              {meta.instructions.slice(0, 6).map((step, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-strong">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[0.7rem] font-bold text-accent">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <a
          href={youtubeSearch(name)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-border bg-surface-2 px-4 py-4 text-sm font-medium text-accent press"
        >
          <VideoOff size={16} aria-hidden="true" />
          Watch a video demo on YouTube
          <ExternalLink size={14} aria-hidden="true" />
        </a>
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
