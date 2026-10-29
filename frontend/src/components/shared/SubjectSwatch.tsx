import { cn } from "@/lib/utils";

export const FALLBACK_SUBJECT_COLOR = "#7c8a86";

// A subject's colour is shown only as this small square: enough to recognise it across the
// timetable, lists and navigation, without tinting whole rows or cards. Stored colours are
// often vivid presets, so they're rendered a little desaturated to sit with the palette.
export const SWATCH_FILTER = "[filter:saturate(0.78)]";

export function SubjectSwatch({ color, className }: { color?: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-xs", SWATCH_FILTER, className)}
      style={{ backgroundColor: color || FALLBACK_SUBJECT_COLOR }}
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
