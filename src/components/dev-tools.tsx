"use client";

import dynamic from "next/dynamic";

// Dev-only visual-feedback toolbar (agentation). It's a devDependency under a
// source-available license (PolyForm-Shield), so it must never ship in a prod
// build: the import lives in a dead branch in production and loads lazily in
// dev only, keeping it out of the production bundle entirely.
const Agentation =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("agentation").then((m) => m.Agentation), { ssr: false })
    : () => null;

export function DevTools() {
  if (process.env.NODE_ENV !== "development") return null;
  return <Agentation />;
}
