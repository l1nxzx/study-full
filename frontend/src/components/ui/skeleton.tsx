import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// See `.skeleton` in index.css: hidden for 150ms so fast loads never flash, then a slow pulse.
function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("skeleton h-4", className)} {...props} />;
}

/** A few lines of text-shaped skeleton, for paragraphs that are still loading or being written. */
function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-full", "w-3/5"];
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-3/5" : widths[i % widths.length])} />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonLines };
