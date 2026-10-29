import type { HighlightColor } from "@/lib/aiMarkup";

// The one place Study's highlight colors are defined - shared by the read-side renderer
// (CustomHighlight.tsx) and the rich note editor's highlight mark, so both always agree.
export const HIGHLIGHT_COLOR_CLASSES: Record<HighlightColor, string> = {
  yellow: "bg-highlight-yellow text-highlight-yellow-foreground",
  blue: "bg-highlight-blue text-highlight-blue-foreground",
  green: "bg-highlight-green text-highlight-green-foreground",
  red: "bg-highlight-red text-highlight-red-foreground",
  purple: "bg-highlight-purple text-highlight-purple-foreground",
  orange: "bg-highlight-orange text-highlight-orange-foreground",
};

export const HIGHLIGHT_COLORS: HighlightColor[] = ["yellow", "blue", "green", "red", "purple", "orange"];

// Blue is the default/fallback color (used by plain ==text== and any missing/invalid
// color attribute) - yellow is reserved for caution/warning emphasis, not general use.
export function resolveHighlightColor(color?: string | null): HighlightColor {
  return color && color in HIGHLIGHT_COLOR_CLASSES ? (color as HighlightColor) : "blue";
}
