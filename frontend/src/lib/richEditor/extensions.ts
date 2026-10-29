import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { CalloutNode } from "@/lib/richEditor/schema/calloutNode";
import { HighlightMark } from "@/lib/richEditor/schema/highlightMark";
import { MathBlock, MathInline } from "@/lib/richEditor/schema/mathNode";

// Matches this app's Markdown dialect: never a single "#" heading (see notesPrompt.ts /
// openai.service.ts's formatting instructions), plus the app's custom callout/highlight/
// math node types alongside standard StarterKit block/mark support.
export function buildRichEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
    }),
    TableKit.configure({
      table: { resizable: false },
    }),
    HighlightMark,
    CalloutNode,
    MathInline,
    MathBlock,
  ];
}
