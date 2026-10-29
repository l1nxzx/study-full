import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { cn } from "@/lib/utils";

// A compact Markdown+KaTeX renderer for short AI-generated text embedded inside quiz
// options, flashcards, and practice questions - full formatting support (bold, lists,
// tables, inline/display math) without the document-style spacing of MarkdownRenderer.
export function InlineMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-sm prose-neutral max-w-none dark:prose-invert",
        "prose-p:my-0 prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
        "[&_.katex-display]:my-1.5",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
