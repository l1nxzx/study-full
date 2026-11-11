import Code from "@tiptap/extension-code";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { AiAddMark } from "@/lib/richEditor/schema/aiAddMark";
import { CalloutNode } from "@/lib/richEditor/schema/calloutNode";
import { HighlightMark } from "@/lib/richEditor/schema/highlightMark";
import { MathBlock, MathInline } from "@/lib/richEditor/schema/mathNode";
import { NoTestBlockAttribute, NoTestMark } from "@/lib/richEditor/schema/noTestMark";

// Inline code normally refuses every other mark. Bold, italic, strike, highlight, links and
// "not in tests" are fine on it (`**`code`**` and ==`code`== are ordinary Markdown); only the
// AI-added tag, which can't hold code, stays out.
const InlineCode = Code.extend({ excludes: "aiAdd" });

// Matches this app's Markdown dialect: never a single "#" heading (see notesPrompt.ts /
// openai.service.ts's formatting instructions), plus the app's custom callout/highlight/
// math node types alongside standard StarterKit block/mark support.
export function buildRichEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false,
      // Neither has Markdown syntax in this app's dialect, so they would be lost on save. Links
      // are kept as [text](address) when a note has them, but there is no way to type one.
      underline: false,
      link: { openOnClick: false, autolink: false, linkOnPaste: false },
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
