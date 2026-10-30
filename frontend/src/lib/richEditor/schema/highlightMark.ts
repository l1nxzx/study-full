import { Mark, mergeAttributes } from "@tiptap/core";
import type { HighlightColor } from "@/lib/aiMarkup";
import { HIGHLIGHT_COLOR_CLASSES, HIGHLIGHT_MARK_CLASSES, resolveHighlightColor } from "@/lib/highlightColors";

export interface HighlightMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    highlightMark: {
      setHighlight: (color: HighlightColor) => ReturnType;
      unsetHighlight: () => ReturnType;
    };
  }
}

// Mirrors the app's `==text==` (always blue - the default/general emphasis color;
// yellow is reserved for caution/warning) and `<highlight color="...">` markdown syntax
// as a Tiptap mark - see frontend/src/lib/richEditor/tiptapToMarkdown.ts for how it
// serializes back to one or the other depending on color.
export const HighlightMark = Mark.create<HighlightMarkOptions>({
  name: "highlight",

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      color: {
        default: "blue" as HighlightColor,
        parseHTML: (element) => resolveHighlightColor(element.getAttribute("data-color")),
        renderHTML: (attributes) => ({ "data-color": attributes.color }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "mark" }];
  },

  renderHTML({ mark, HTMLAttributes }) {
    const color = resolveHighlightColor(mark.attrs.color);
    return [
      "mark",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `${HIGHLIGHT_MARK_CLASSES} ${HIGHLIGHT_COLOR_CLASSES[color]}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setHighlight:
        (color) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      unsetHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
