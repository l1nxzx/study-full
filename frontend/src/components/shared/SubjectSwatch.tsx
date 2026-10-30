import { subjectColor } from "@/lib/scheduleColors";
import { cn } from "@/lib/utils";

export const FALLBACK_SUBJECT_COLOR = "#7c8a86";

// A subject's colour is shown only as this small square: enough to recognise it across the
// timetable, lists and navigation, without tinting whole rows or cards. On the light theme's
// near-white page a pastel would wash out, so it's shown a little deeper there.
export const SWATCH_TONE = "[filter:brightness(0.9)_saturate(1.25)] dark:[filter:none]";

export function SubjectSwatch({ color, className }: { color?: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-xs", SWATCH_TONE, className)}
      style={{ backgroundColor: subjectColor(color) || FALLBACK_SUBJECT_COLOR }}
    />
  );
}

export function SubjectLabel({ name, color, className }: { name: string; color?: string | null; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <SubjectSwatch color={color} />
      <span className="truncate">{name}</span>
    </span>
  );
}
