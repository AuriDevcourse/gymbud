import { PageSkeleton } from "@/components/skeleton";

// Instant Suspense fallback during navigation — a tab tap paints this skeleton
// immediately while the server renders, so the app never feels frozen.
export default function Loading() {
  return <PageSkeleton />;
}
