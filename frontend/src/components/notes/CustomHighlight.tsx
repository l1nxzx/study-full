import type { ReactNode } from "react";
import { HIGHLIGHT_COLOR_CLASSES, HIGHLIGHT_MARK_CLASSES, resolveHighlightColor } from "@/lib/highlightColors";
import { cn } from "@/lib/utils";

interface CustomHighlightProps {
  color?: string;
  /** Which edges of the highlight this piece has, when one highlight is built from several pieces. */
  edge?: "both" | "start" | "end" | "middle";
  children?: ReactNode;
}

const EDGE_CLASSES = {
  both: "rounded-xs px-[0.18em]",
  start: "rounded-l-xs pl-[0.18em]",
  end: "rounded-r-xs pr-[0.18em]",
  middle: "",
};

// Renders a real inline background highlight (never just colored text) behind the
// marked text - box-decoration-clone is what makes that background follow each wrapped
// line correctly instead of drawing one bounding rectangle around a multi-line phrase.
export function CustomHighlight({ color, edge = "both", children }: CustomHighlightProps) {
  const resolved = resolveHighlightColor(color);

  return <mark className={cn(HIGHLIGHT_MARK_CLASSES, EDGE_CLASSES[edge] ?? EDGE_CLASSES.both, HIGHLIGHT_COLOR_CLASSES[resolved])}>{children}</mark>;
}
