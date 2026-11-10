import Code from "@tiptap/extension-code";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { AiAddMark } from "@/lib/richEditor/schema/aiAddMark";
import { CalloutNode } from "@/lib/richEditor/schema/calloutNode";
import { HighlightMark } from "@/lib/richEditor/schema/highlightMark";
import { MathBlock, MathInline } from "@/lib/richEditor/schema/mathNode";
import { NoTestBlockAttribute, NoTestMark } from "@/lib/richEditor/schema/noTestMark";

// Inline code normally refuses every other mark. It still does, except the "not in tests"
// mark: a marked sentence that contains code has to stay marked as a whole.
const InlineCode = Code.extend({ excludes: "bold italic strike underline link highlight aiAdd" });

// Matches this app's Markdown dialect: never a single "#" heading (see notesPrompt.ts /
// openai.service.ts's formatting instructions), plus the app's custom callout/highlight/
// math node types alongside standard StarterKit block/mark support.
export function buildRichEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false,
    }),
    TableKit.configure({
      table: { resizable: false },
    }),
    InlineCode,
    HighlightMark,
    AiAddMark,
    NoTestMark,
    NoTestBlockAttribute,
    CalloutNode,
    MathInline,
    MathBlock,
  ];
}
