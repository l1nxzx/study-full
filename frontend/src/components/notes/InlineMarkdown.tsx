import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { cn } from "@/lib/utils";

// A compact Markdown+KaTeX renderer for short AI-generated text embedded inside quiz
// options, flashcards, and practice questions - full formatting support (bold, lists,
// tables, inline/display math) without the document-style spacing of MarkdownRenderer.
// Size and colour come from the caller; the serif reading face comes from .study-prose.
export function InlineMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("study-prose study-prose-inline", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
