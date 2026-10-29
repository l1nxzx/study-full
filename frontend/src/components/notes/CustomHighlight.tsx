import type { ReactNode } from "react";
import { HIGHLIGHT_COLOR_CLASSES, resolveHighlightColor } from "@/lib/highlightColors";
import { cn } from "@/lib/utils";

interface CustomHighlightProps {
  color?: string;
  children?: ReactNode;
}

// Renders a real inline background highlight (never just colored text) behind the
// marked text - box-decoration-clone is what makes that background follow each wrapped
// line correctly instead of drawing one bounding rectangle around a multi-line phrase.
export function CustomHighlight({ color, children }: CustomHighlightProps) {
  const resolved = resolveHighlightColor(color);

  return (
    <mark className={cn("rounded px-1 py-0.5 [box-decoration-break:clone]", HIGHLIGHT_COLOR_CLASSES[resolved])}>
      {children}
    </mark>
  );
}
